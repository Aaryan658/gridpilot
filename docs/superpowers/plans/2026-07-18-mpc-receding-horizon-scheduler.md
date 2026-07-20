# MPC Receding-Horizon Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn GridPilot's single-shot, night-ahead CVXPY optimizer into a receding-horizon (MPC) controller that re-solves periodically using actual delivered-energy state, and expose it as a live, watchable run on the dashboard — without touching the validated single-shot path used by `/depot/schedule` today.

**Architecture:** A new `MPCController` class wraps the existing `GridPilotScheduler` unchanged in its optimization logic — each tick it re-solves the *same* full-horizon QP (`schedule()`), but with (a) already-delivered energy subtracted from `energy_needed`, (b) already-elapsed vehicles' `arrival_time` clamped to "now", and (c) a fixed `base_time` passed explicitly so slot indexing stays consistent across ticks. Only the newly-solved slot's dispatch is committed; the rest of that solve is discarded and redone next tick. This is the standard "full re-plan, commit one step" receding-horizon pattern — it requires zero changes to the QP objective/constraints, only two additive, backward-compatible parameters on `GridPilotScheduler`. A background thread in `api/main.py` drives the tick loop (matching the existing background-cache-warming-thread pattern already in that file) and a new pair of endpoints expose live status; the dashboard polls it and renders a running load chart.

**Scope decision:** This plan now also folds in two physical-realism corrections to the QP itself, both grounded in cited real-world data rather than the arbitrary constants currently in `scheduler.py`: (1) the transformer's rated capacity, power factor, and loss model are replaced with real IS 1180 / CEA figures, and `peak_reduction_pct` is revised to be computed on grid-side (load + transformer loss) demand instead of raw depot load; (2) charging power is capped by an SOC-dependent taper (CC-CV approximation) instead of a flat charger rating. It still does **not** wire real OCPP/relay telemetry into the MPC loop (that's a separate follow-up: swapping the simulated `delivered_kwh` update for a real measured value from the hardware demo). Flagging this now so it isn't assumed to be included.

**Tech Stack:** Python (existing `cvxpy`/`numpy`/`pandas` stack, no new dependency), FastAPI background thread (existing pattern), Next.js/React polling panel (existing `recharts` already used on the report page).

---

## Test Convention Note

This repo has no pytest suite for `gridpilot/`/`api/` — `gridpilot/scheduler.py` and `gridpilot/ev_manager.py` each carry their own `if __name__ == "__main__":` block with hard `assert` statements as a smoke test, run via `python -m gridpilot.<module>`. Every code task below follows that existing convention (write the assertions first, run the module and watch them fail with the real error, implement, run again and watch them pass) rather than introducing a new test framework unrequested.

---

## File Structure

- **Modify:** `gridpilot/scheduler.py` — four changes, in order: (1) add an optional `base_time_override` param threaded through `schedule()` → `_prepare_inputs()` → `_compute_availability_matrix()` / `_carbon_array()` (default `None` preserves current behavior exactly); (2) replace `TRANSFORMER_LIMIT`/`POWER_FACTOR` with real IS 1180/CEA-sourced values and add a quadratic transformer-loss model used for `peak_kw`/`overload_events`/`peak_reduction_pct`; (3) add an SOC-dependent tapered charging-power constraint to `_solve_cvxpy`.
- **Create:** `gridpilot/mpc_controller.py` — the `MPCController` class (tick loop, state tracking, dispatch history).
- **Modify:** `api/main.py` — two new endpoints (`POST /depot/mpc/start`, `GET /depot/mpc/status`) plus a background-thread runner function, following the existing `state`-dict + background-thread pattern already used for cache warming and OCPP.
- **Create:** `frontend/src/components/MpcLivePanel.tsx` — a small polling component showing tick-by-tick dispatch on a line chart.
- **Modify:** `frontend/src/app/dashboard/page.tsx` — mount `MpcLivePanel` below the existing "Run Simulation" flow.

---

### Task 1: Fix the hidden `base_time` inconsistency and add `base_time_override`

**Why this has to happen first:** `_compute_availability_matrix()` currently recomputes its own `base_time` internally from whatever `arrivals` it's given ([scheduler.py:55](gridpilot/scheduler.py:55)), while `_prepare_inputs()` separately computes `base_time` for the carbon array and the returned `timeseries`. Today those two computations always agree because both derive from the *same, unmodified* arrivals. MPC breaks that assumption — it needs to clamp already-elapsed vehicles' arrival times forward to "now" each tick, which would silently shift `_compute_availability_matrix()`'s internal `base_time` (and therefore every slot index) out of sync with the rest of the solve. This must be fixed before `MPCController` exists, or every MPC tick after the first would silently misalign slot 0 with the wrong wall-clock time.

**Files:**
- Modify: `gridpilot/scheduler.py:50-63` (`_compute_availability_matrix`)
- Modify: `gridpilot/scheduler.py:230-247` (`_prepare_inputs`)
- Modify: `gridpilot/scheduler.py:65-88` (`schedule`)
- Modify: `gridpilot/scheduler.py:370-399` (existing smoke-test block — add one more assertion)

- [ ] **Step 1: Add the new assertion to the existing smoke test (write it failing first)**

In `gridpilot/scheduler.py`, in the `if __name__ == "__main__":` block, add this immediately after the existing `assert managed["overload_events"] == 0` line (currently line 397):

```python
    # base_time_override must produce an identical result to the default
    # path when it's set to exactly what the default path would compute —
    # this is the regression guard for Task 1's refactor.
    from gridpilot.scheduler import GridPilotScheduler as _GPS
    default_base_time = _GPS._base_time(pd.to_datetime(requests["arrival_time"]))
    overridden = scheduler.schedule(requests, building, carbon_signal={}, base_time_override=default_base_time)
    assert overridden["comparison"]["scheduled_peak_kw"] == managed["comparison"]["scheduled_peak_kw"], (
        "base_time_override with the natural base_time must reproduce the default-path result exactly"
    )
```

- [ ] **Step 2: Run it and confirm it fails with `TypeError` (param doesn't exist yet)**

Run: `python -m gridpilot.scheduler`
Expected: `TypeError: GridPilotScheduler.schedule() got an unexpected keyword argument 'base_time_override'`

- [ ] **Step 3: Thread `base_time` through `_compute_availability_matrix`**

Replace `_compute_availability_matrix` (lines 50-63) with:

```python
    def _compute_availability_matrix(self, arrivals, departures, n_vehicles, n_slots, base_time: pd.Timestamp) -> np.ndarray:
        arrivals = pd.to_datetime(pd.Series(arrivals)).reset_index(drop=True)
        departures = pd.to_datetime(pd.Series(departures)).reset_index(drop=True)
        mask = departures < arrivals
        departures[mask] += pd.Timedelta(days=1)
        availability = np.zeros((n_vehicles, n_slots), dtype=float)
        for vehicle in range(n_vehicles):
            start = int(np.floor((arrivals.iloc[vehicle] - base_time).total_seconds() / 900.0))
            end = int(np.ceil((departures.iloc[vehicle] - base_time).total_seconds() / 900.0))
            start = max(0, min(n_slots, start))
            end = max(start, min(n_slots, end))
            availability[vehicle, start:end] = 1.0
        return availability
```

- [ ] **Step 4: Resolve `base_time` once in `_prepare_inputs` and pass it down**

Replace `_prepare_inputs` (lines 230-247) with:

```python
    def _prepare_inputs(self, ev_requests: pd.DataFrame, building_load: pd.Series, carbon_signal: dict, base_time_override: pd.Timestamp | None = None) -> dict:
        evs = ev_requests.reset_index(drop=True).copy()
        arrivals = pd.to_datetime(evs["arrival_time"])
        departures = pd.to_datetime(evs["departure_deadline"])
        n_vehicles = len(evs)
        base_time = base_time_override if base_time_override is not None else self._base_time(arrivals)
        building = np.resize(np.asarray(building_load, dtype=float), self.N_SLOTS)
        availability = self._compute_availability_matrix(arrivals, departures, n_vehicles, self.N_SLOTS, base_time)
        carbon = self._carbon_array(carbon_signal, base_time)
        return {
            "ev_requests": evs,
            "n_vehicles": n_vehicles,
            "n_slots": self.N_SLOTS,
            "availability": availability,
            "building_load": building,
            "carbon_intensity": carbon,
            "energy_needed": evs["energy_needed_kwh"].to_numpy(dtype=float),
            "base_time": base_time,
        }
```

- [ ] **Step 5: Accept and forward `base_time_override` in `schedule()`**

In `schedule()` (lines 65-88), change the signature and the `_prepare_inputs` call:

```python
    def schedule(
        self,
        ev_requests: pd.DataFrame,
        building_load: pd.Series,
        carbon_signal: dict,
        enable_v2g: bool = False,
        unmanaged_reference: dict | None = None,
        base_time_override: pd.Timestamp | None = None,
    ) -> dict:
        start_time = time.perf_counter()
        prepared = self._prepare_inputs(ev_requests, building_load, carbon_signal, base_time_override=base_time_override)
```

(The rest of `schedule()` — the `unmanaged_reference` fallback, the CVXPY/EDF dispatch — is unchanged.)

- [ ] **Step 6: Run the smoke test again and confirm everything passes**

Run: `python -m gridpilot.scheduler`
Expected: all existing assertions plus the new Step 1 assertion pass; output ends with `Status: optimal in <N> ms` (or `edf_fallback`) and no `AssertionError`.

- [ ] **Step 7: Commit**

```bash
git add gridpilot/scheduler.py
git commit -m "feat: thread base_time_override through GridPilotScheduler for MPC re-solves"
```

---

### Task 2: Real transformer rating, CEA power factor, and quadratic loss model

**Why:** `TRANSFORMER_LIMIT = 270` (kVA) and `POWER_FACTOR = 0.8` are both arbitrary. Neither survives contact with real standards:
- IS 1180 (Part 1):2014 (amended March 2021) defines standard three-phase distribution transformer ratings as 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500 kVA — **270 kVA is not a manufactured size**. ([IS-1180 Part 1 amendment PDF, mjp.maharashtra.gov.in](https://mjp.maharashtra.gov.in/wp-content/uploads/2022/12/IS-1180__Part_1_-2014__Latest_BIS_Ammendment_4_March_2021_.pdf))
- CEA's Revised Consolidated Guidelines for Charging Infrastructure for EVs require charging stations to maintain power factor close to unity, specifically **>0.95** — not 0.8. ([CEA EV charging compliance guide, bolt.earth](https://bolt.earth/blog/cea-regulations-for-public-ev-charging-stations-what-you-should-know))
- The IS 1180 Part 1 maximum-total-loss table (11kV class) gives, for a 250 kVA transformer at Energy Efficiency Level 3 ("3-star" BEE, a common commercial-grade spec): **864 W total loss at 50% load, 2488 W at 100% load**. ([Synergy Transformers BIS-1180 loss table](https://www.synergytransformers.com/products/distribution-transformers/bis-1180/); cross-checked against a real 252 kVA transformer's guaranteed technical particulars showing 330 W core loss + 2360 W full-load copper loss = 2700 W total at Level 2, consistent with that table's Level 2 row — [Scribd GTP-250-kVA document](https://www.scribd.com/document/429112055/GTP-250-kVA))

Those two IS 1180 data points (loss at 50% and 100% load) pin down the standard two-parameter transformer loss model — constant iron (no-load) loss plus copper (load) loss scaling with the **square** of the loading fraction — algebraically:

```
total_loss(x) = iron_loss + copper_loss_rated * x^2       where x = load_fraction
864  = iron_loss + copper_loss_rated * 0.5^2
2488 = iron_loss + copper_loss_rated * 1.0^2
=> copper_loss_rated = (2488 - 864) / 0.75 = 2165.33 W = 2.165 kW
=> iron_loss = 864 - 0.25 * 2165.33 = 322.67 W = 0.323 kW
```

This is genuinely quadratic in load — a one-line addition to the existing QP objective/reporting (the file already uses `cp.square()` for the peak penalty, so this is a familiar shape, not a new pattern).

**On this session's real numbers (informational, not asserted in code):** with `POWER_FACTOR` corrected to 0.95, `TRANSFORMER_LIMIT_REAL_KW` becomes 250 × 0.95 = 237.5 kW (up from 216 kW). The unmanaged baseline (294 kW depot load) still clearly overloads this — 294 > 237.5 — so the demo's core story is unaffected by the correction, it's just now backed by real standards instead of a round number. Including transformer losses, unmanaged's grid-side peak is ≈297.6 kW (294 + ~3.6 kW loss at that overload level) and managed's is ≈136.0 kW (135 + ~1.0 kW loss) — `peak_reduction_pct` moves from the current naive 54.08% to ≈54.3%, a small but honest correction (losses scale quadratically with load, so shaving the peak disproportionately cuts losses too).

**Files:**
- Modify: `gridpilot/scheduler.py:27-45` (class constants)
- Modify: `gridpilot/scheduler.py:266-330` (`_result` — `peak_kw`/`overload_events`/comparison computation)
- Modify: `gridpilot/scheduler.py:370-399` (smoke-test block — new assertions)

- [ ] **Step 1: Add the new assertions first (they will fail against the current constants)**

In the `if __name__ == "__main__":` block, add after the Task 1 assertions:

```python
    # Task 2: transformer rating must be a real IS 1180 standard size, and the
    # quadratic loss model must match the hand-derived IS 1180 numbers exactly.
    assert scheduler.TRANSFORMER_LIMIT in {250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500}, (
        "TRANSFORMER_LIMIT must be a real IS 1180 (Part 1):2014 standard rating"
    )
    assert abs(scheduler.POWER_FACTOR - 0.95) < 1e-9, "CEA mandates >0.95 PF for EV charging infrastructure"
    loss_at_50pct = scheduler.transformer_loss_kw(scheduler.TRANSFORMER_LIMIT_REAL_KW * 0.5)
    loss_at_100pct = scheduler.transformer_loss_kw(scheduler.TRANSFORMER_LIMIT_REAL_KW * 1.0)
    assert abs(loss_at_50pct - 0.864) < 0.01, f"expected ~0.864 kW loss at 50% load, got {loss_at_50pct:.3f}"
    assert abs(loss_at_100pct - 2.488) < 0.01, f"expected ~2.488 kW loss at 100% load, got {loss_at_100pct:.3f}"
    # peak_kw must now be grid-side (load + transformer loss), so it's strictly
    # greater than the raw depot-side load whenever load > 0.
    depot_side_unmanaged_peak = float(unmanaged["timeseries"]["total_load_kw"].max())
    assert unmanaged["peak_kw"] > depot_side_unmanaged_peak, (
        "peak_kw must include transformer losses and therefore exceed the raw depot-side load"
    )
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `python -m gridpilot.scheduler`
Expected: `AttributeError: 'GridPilotScheduler' object has no attribute 'transformer_loss_kw'` (or an `AssertionError` on the `TRANSFORMER_LIMIT`/`POWER_FACTOR` checks if you reorder steps — either failure is fine, it confirms the assertions are load-bearing).

- [ ] **Step 3: Replace the class constants**

In `gridpilot/scheduler.py`, replace the constants block (currently lines 27-36) with:

```python
    # Fleet scaled 600 -> 40 vehicles (1:15). Transformer/DVVNL/target limits
    # scaled proportionally so the peak-shaving story stays representative
    # instead of vanishing under a transformer sized for the old fleet.
    TRANSFORMER_LIMIT = 250  # kVA — real IS 1180 (Part 1):2014 standard rating (270 kVA is not a manufactured size)
    DVVNL_LIMIT = 300        # kVA, DVVNL sanctioned load
    # DVVNL bills load in kVA, and a transformer's thermal rating is a kVA
    # figure too. CEA's Revised Consolidated Guidelines for EV Charging
    # Infrastructure require charging stations to maintain power factor
    # close to unity, specifically >0.95 — not an assumed worst case.
    POWER_FACTOR = 0.95
    TRANSFORMER_LIMIT_REAL_KW = TRANSFORMER_LIMIT * POWER_FACTOR  # 237.5 kW
    DVVNL_LIMIT_REAL_KW = DVVNL_LIMIT * POWER_FACTOR              # 285.0 kW
    # Two-parameter transformer loss model (IS 1180 Part 1:2014, Level-3
    # "3-star" 250 kVA transformer), solved from the standard's own 50%-load
    # and 100%-load total-loss test points (864 W / 2488 W): constant iron
    # (no-load) loss plus copper (load) loss scaling with load-fraction^2.
    TRANSFORMER_IRON_LOSS_KW = 0.323
    TRANSFORMER_COPPER_LOSS_RATED_KW = 2.165
    DVVNL_PENALTY_RATE = 500
```

- [ ] **Step 4: Add the `transformer_loss_kw` helper**

Add this method to `GridPilotScheduler` (near `_carbon_array`, e.g. directly after it):

```python
    def transformer_loss_kw(self, load_kw):
        """Quadratic transformer loss model: constant iron (no-load) loss plus
        copper (load) loss scaling with the square of the loading fraction,
        per IS 1180 Part 1:2014's own 50%/100%-load loss test points."""
        load_fraction = np.asarray(load_kw, dtype=float) / self.TRANSFORMER_LIMIT_REAL_KW
        return self.TRANSFORMER_IRON_LOSS_KW + self.TRANSFORMER_COPPER_LOSS_RATED_KW * load_fraction ** 2
```

- [ ] **Step 5: Use grid-side (load + loss) demand for `peak_kw` and `overload_events`**

In `_result()`, the depot-side `total_load` (EV + building, unchanged — this stays exactly as-is since it's what the frontend's "Depot Load Profile" chart plots) is currently used directly for `peak_kw` and `overload_events`. Change those two lines (currently `peak_kw = float(total_load.max())` and `overload_events = int(np.sum(total_load > self.TRANSFORMER_LIMIT_REAL_KW + 1e-6))`) to:

```python
        grid_side_load = total_load + self.transformer_loss_kw(total_load)
        peak_kw = float(grid_side_load.max())
        overload_events = int(np.sum(grid_side_load > self.TRANSFORMER_LIMIT_REAL_KW + 1e-6))
```

`peak_kw` (and therefore `peak_reduction_pct`, `dvvnl_monthly_saving_inr`, and `overload_events` in the `comparison` dict and `fleet_summary`) now reflects real grid-side demand instead of raw depot load — this is the actual number a DISCOM meter and a transformer's thermal limit respond to. The `timeseries["total_load_kw"]` column keeps its current depot-side meaning unchanged, so no frontend chart needs updating for this task.

- [ ] **Step 6: Run the smoke test again and confirm everything passes**

Run: `python -m gridpilot.scheduler`
Expected: all assertions (Task 1's and Task 2's) pass. Read the printed `DVVNL penalty/mo` and `Peak load (kW)` lines and confirm they've shifted slightly versus the pre-Task-2 numbers (unmanaged peak now ~297-298 kW instead of ~294-296 kW, reflecting the added transformer loss).

- [ ] **Step 7: Commit**

```bash
git add gridpilot/scheduler.py
git commit -m "fix: use real IS 1180 transformer rating, CEA power factor, and quadratic loss model for grid-side peak"
```

---

### Task 3: SOC-dependent tapered charging power (CC-CV approximation)

**Why:** `power[v,t]` is currently bounded only by a flat `charger_kw * availability` cap — nothing in the QP knows or cares that a Li-ion cell can't keep pulling full rated current once it's most of the way to full charge. The cited literature is specific and directly actionable here: a **piecewise-linear, SOC-dependent maximum-charging-power cap that tapers above ~80% SOC** captures the real CC→CV transition at <1% cost/error versus full electrochemical models, and stays QP-solvable ([Butt & Li 2025, arXiv](https://arxiv.org/abs/2507.18853); [Schaden, Jatschka, Limmer, Raidl 2021](https://doi.org/10.3390/en14227755); see `docs/research/2026-07-18-industry-grade-simulation.md` §2.1 and Recommendation 1). This task adds exactly that. It deliberately does **not** add a $/kWh degradation-cost term (the other half of Recommendation 1) — that number needs a real per-kWh degradation figure from procurement/finance, and inventing one would just be a differently-shaped guess than the flat-cap problem it replaces.

**Scope note:** this only touches `_solve_cvxpy` (the QP path) — the plan's own file structure notes this is specifically "for the quadratic problem," and `_edf_fallback` (the non-QP degraded-mode heuristic, only reachable above 601 vehicles or on a solver failure) is out of scope here.

**The DCP-compliance trap to avoid:** CVXPY requires, for a constraint of the form `power <= cap(soc)`, that `cap` be **concave** in the decision variables (`power <= convex_thing` is not a valid convex constraint and CVXPY will raise `DCPError`). A taper that clips with `cp.maximum(floor, declining_line)` is convex, not concave, and would break. The fix used below is a `cp.minimum(...)` of affine pieces (concave) for the taper's upper clip, plus a separate, ordinary **linear** constraint (`soc_frac <= 1.02`) to prevent SOC from running away past ~100% instead of trying to floor the cap function itself — that second constraint is also a genuine, previously-missing physical constraint (nothing currently stops the model from planning to charge a vehicle past 100% SOC).

**Files:**
- Modify: `gridpilot/scheduler.py:27-49` (class constants — add taper parameters)
- Modify: `gridpilot/scheduler.py` `_solve_cvxpy` (add SOC tracking + tapered cap constraint)
- Modify: `gridpilot/scheduler.py:370-399` (smoke-test block — new assertion)

- [ ] **Step 1: Add the taper constants**

Add to the class constants block (alongside the Task 2 constants):

```python
    # SOC-dependent tapered charging cap (CC-CV approximation): flat at
    # charger rating until SOC_TAPER_START_FRAC, then a concave linear
    # decline toward SOC_TAPER_FLOOR_FRAC of rated power by 100% SOC.
    SOC_TAPER_START_FRAC = 0.80
    SOC_TAPER_FLOOR_FRAC = 0.20
```

- [ ] **Step 2: Write the failing assertion first**

Add to the `if __name__ == "__main__":` block, after the Task 2 assertions:

```python
    # Task 3: no vehicle's modeled SOC may exceed ~100% under the tapered constraint.
    battery_kwh = requests["battery_kwh"].to_numpy(dtype=float)
    initial_soc_frac = requests["current_soc_pct"].to_numpy(dtype=float) / 100.0
    cumulative_kwh = np.cumsum(managed["power_schedule"], axis=1) * GridPilotScheduler.DELTA_T
    soc_trajectory = initial_soc_frac.reshape(-1, 1) + cumulative_kwh / battery_kwh.reshape(-1, 1)
    assert soc_trajectory.max() <= 1.03, f"SOC must not run away past ~100%, got {soc_trajectory.max():.3f}"
```

- [ ] **Step 3: Run it and confirm it fails (or passes vacuously — verify by temporarily lowering the threshold)**

Run: `python -m gridpilot.scheduler`

This assertion may or may not fail before the constraint exists, since the objective alone might not push any vehicle past 100% today — that's not a reliable failure signal. Confirm the assertion is load-bearing by temporarily changing `<= 1.03` to `<= 0.5` and re-running; expect an `AssertionError` (proving the check does fire), then change it back to `<= 1.03` before continuing.

- [ ] **Step 4: Add SOC tracking and the tapered constraint to `_solve_cvxpy`**

In `_solve_cvxpy`, after the existing `charger_power_matrix` setup and before `power = cp.Variable(...)`, add:

```python
        battery_kwh = prepared["ev_requests"]["battery_kwh"].to_numpy(dtype=float)
        initial_soc_frac = prepared["ev_requests"]["current_soc_pct"].to_numpy(dtype=float) / 100.0
```

After `power = cp.Variable((n_vehicles, n_slots), nonneg=True)`, add the SOC trajectory and tapered cap:

```python
        cumulative_energy = cp.cumsum(power, axis=1) * self.DELTA_T
        soc_frac = initial_soc_frac.reshape(-1, 1) + cumulative_energy / battery_kwh.reshape(-1, 1)

        taper_slope = 1.0 / (1.0 - self.SOC_TAPER_START_FRAC)
        tapered_cap_fraction = cp.minimum(
            1.0,
            1.0 - (1.0 - self.SOC_TAPER_FLOOR_FRAC) * taper_slope * (soc_frac - self.SOC_TAPER_START_FRAC),
        )
        tapered_cap = cp.multiply(charger_power_matrix, tapered_cap_fraction)
```

Then add both new constraints to the existing `constraints = [...]` list (alongside `power >= 0`, the existing charger/availability cap, the delivery constraint, and `total_load <= 280`):

```python
            power <= tapered_cap,
            soc_frac <= 1.02,
```

- [ ] **Step 5: Run the smoke test again and confirm everything passes**

Run: `python -m gridpilot.scheduler`
Expected: all assertions (Tasks 1-3) pass, `all_ready_on_time` is still `True`, and `Status: optimal in <N> ms` prints (if the added constraints make the problem infeasible under the existing `MIN_DELIVERY_FRACTION = 1.0`, the solver will fall back to `edf_fallback` and print `CVXPY optimization failed` — if that happens, this is a real finding to report back, not something to silently paper over: it would mean the fleet's charger ratings and overnight window are too tight to deliver 100% of every vehicle's energy need once a realistic CC-CV taper is enforced near end-of-charge, which is itself a useful, honest result).

- [ ] **Step 6: Commit**

```bash
git add gridpilot/scheduler.py
git commit -m "feat: add SOC-dependent tapered charging power constraint (CC-CV approximation)"
```

---

### Task 4: `MPCController` — the receding-horizon tick loop

**Files:**
- Create: `gridpilot/mpc_controller.py`

- [ ] **Step 1: Write the module with its own smoke-test block (assertions first)**

Create `gridpilot/mpc_controller.py`:

```python
from __future__ import annotations

import os
import sys

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from gridpilot.scheduler import GridPilotScheduler


class MPCController:
    """Receding-horizon controller: re-solves the full-night QP every tick,
    but only commits the power dispatched in the slot at `current_slot`.

    Assumes every vehicle shares the same departure deadline (true for the
    current fleet generator, which always sets 07:00) — a vehicle-specific
    departure would need slot bookkeeping this class doesn't do yet.
    """

    def __init__(
        self,
        scheduler: GridPilotScheduler,
        ev_requests: pd.DataFrame,
        building_load: pd.Series,
        carbon_signal: dict,
    ) -> None:
        self.scheduler = scheduler
        self.original_requests = ev_requests.reset_index(drop=True).copy()
        self.building_load = building_load
        self.carbon_signal = carbon_signal

        arrivals = pd.to_datetime(self.original_requests["arrival_time"])
        departures = pd.to_datetime(self.original_requests["departure_deadline"])
        self.base_time = GridPilotScheduler._base_time(arrivals)

        self.n_vehicles = len(self.original_requests)
        self.delivered_kwh = np.zeros(self.n_vehicles)

        initial_availability = scheduler._compute_availability_matrix(
            arrivals, departures, self.n_vehicles, GridPilotScheduler.N_SLOTS, self.base_time
        )
        active_slots = np.where(initial_availability.any(axis=0))[0]
        if len(active_slots) == 0:
            raise ValueError("No vehicle is available in any slot — check ev_requests")
        self.start_slot = int(active_slots.min())
        self.end_slot = int(active_slots.max()) + 1
        self.current_slot = self.start_slot

        self.dispatch_history: list[dict] = []
        self.unmanaged_reference = scheduler.get_unmanaged_baseline(self.original_requests, building_load)

    @property
    def is_complete(self) -> bool:
        return self.current_slot >= self.end_slot

    def _requests_for_tick(self) -> pd.DataFrame:
        now = self.base_time + pd.Timedelta(minutes=15 * self.current_slot)
        adjusted = self.original_requests.copy()
        arrivals = pd.to_datetime(adjusted["arrival_time"])
        adjusted["arrival_time"] = arrivals.clip(lower=now)
        energy_needed = adjusted["energy_needed_kwh"].to_numpy(dtype=float)
        adjusted["energy_needed_kwh"] = np.maximum(0.0, energy_needed - self.delivered_kwh)
        return adjusted

    def step(self) -> dict:
        if self.is_complete:
            raise RuntimeError("MPC horizon already complete")

        requests = self._requests_for_tick()
        result = self.scheduler.schedule(
            requests,
            self.building_load,
            self.carbon_signal,
            unmanaged_reference=self.unmanaged_reference,
            base_time_override=self.base_time,
        )

        power = result["power_schedule"]
        dispatch_kw = power[:, self.current_slot].copy()
        self.delivered_kwh += dispatch_kw * GridPilotScheduler.DELTA_T

        building = np.resize(np.asarray(self.building_load, dtype=float), GridPilotScheduler.N_SLOTS)
        tick_record = {
            "slot": self.current_slot,
            "timestamp": (self.base_time + pd.Timedelta(minutes=15 * self.current_slot)).isoformat(),
            "dispatch_kw": dispatch_kw.tolist(),
            "total_load_kw": float(dispatch_kw.sum() + building[self.current_slot]),
            "solve_time_ms": result["solve_time_ms"],
            "solver_status": result["status"],
        }
        self.dispatch_history.append(tick_record)
        self.current_slot += 1
        return tick_record

    def run_to_completion(self) -> list[dict]:
        while not self.is_complete:
            self.step()
        return self.dispatch_history

    def get_status(self) -> dict:
        energy_needed = self.original_requests["energy_needed_kwh"].to_numpy(dtype=float)
        return {
            "current_slot": self.current_slot,
            "start_slot": self.start_slot,
            "end_slot": self.end_slot,
            "is_complete": self.is_complete,
            "delivered_kwh_total": float(self.delivered_kwh.sum()),
            "energy_needed_kwh_total": float(energy_needed.sum()),
            "all_ready_so_far": bool(np.all(self.delivered_kwh >= energy_needed - 1e-6)),
            "ticks_run": len(self.dispatch_history),
            "last_solve_time_ms": self.dispatch_history[-1]["solve_time_ms"] if self.dispatch_history else None,
            "recent_dispatch": self.dispatch_history[-20:],
        }


if __name__ == "__main__":
    from gridpilot.ev_manager import EVRequestManager

    manager = EVRequestManager()
    requests = manager.generate_session("2024-03-15", n=40)
    building = pd.Series([25.0] * GridPilotScheduler.N_SLOTS)
    scheduler = GridPilotScheduler()

    controller = MPCController(scheduler, requests, building, carbon_signal={})
    print(f"MPC horizon: slots {controller.start_slot}..{controller.end_slot} ({controller.end_slot - controller.start_slot} ticks)")

    history = controller.run_to_completion()

    status = controller.get_status()
    print(f"Ticks run: {status['ticks_run']}")
    print(f"Delivered: {status['delivered_kwh_total']:.1f} / {status['energy_needed_kwh_total']:.1f} kWh")
    print(f"All ready: {status['all_ready_so_far']}")
    print(f"Peak tick total_load_kw: {max(t['total_load_kw'] for t in history):.1f}")

    assert controller.is_complete is True
    assert status["ticks_run"] == controller.end_slot - controller.start_slot
    assert status["all_ready_so_far"] is True, "MPC must still deliver every vehicle's full energy need by the end of the horizon"
    assert status["delivered_kwh_total"] > 0
    assert all(t["solver_status"] in {"optimal", "edf_fallback"} for t in history)
    print("All MPCController tests passed.")
```

- [ ] **Step 2: Run it and confirm it fails first (sanity check the assertions are load-bearing)**

Run: `python -m gridpilot.mpc_controller`
Expected: this should actually PASS on the first run since the implementation is written together with its assertions (unlike Task 1, there's no pre-existing broken state to fail against) — but run it anyway and read the printed `Peak tick total_load_kw` and `Ticks run` values. If `all_ready_so_far` prints `False`, that's a real bug (the MPC loop failed to deliver full energy) — do not proceed to Task 3 until it prints `True`.

- [ ] **Step 3: Commit**

```bash
git add gridpilot/mpc_controller.py
git commit -m "feat: add MPCController receding-horizon scheduler wrapper"
```

---

### Task 5: Backend endpoints — `POST /depot/mpc/start`, `GET /depot/mpc/status`

**Files:**
- Modify: `api/main.py`

- [ ] **Step 1: Add the background-thread runner and endpoints**

In `api/main.py`, add near the other `@app.post("/depot/...")` / `@app.get("/depot/...")` endpoints (right after the existing `depot_schedule` function, i.e. after line 397):

```python
import threading as _threading


def _run_mpc_background(controller: MPCController) -> None:
    try:
        while not controller.is_complete:
            controller.step()
            time.sleep(0.3)  # demo pacing — real re-solve cadence would be 15 min, not 0.3s
    except Exception as e:
        print(f"MPC background run failed: {e}")


@app.post("/depot/mpc/start")
def start_mpc(request: ScheduleRequest, current_user: Optional[User] = Depends(optional_current_user)) -> dict:
    ensure_ready()
    sessions = state["ev_manager"].generate_session(request.date, request.n_vehicles)
    building_load = scheduler_building_load()
    signal = get_signal(refresh=False)
    _sched = get_cached("scheduler") or GridPilotScheduler()

    controller = MPCController(_sched, sessions, building_load, signal)
    state["mpc_controller"] = controller

    thread = _threading.Thread(target=_run_mpc_background, args=(controller,), daemon=True)
    thread.start()

    return {
        "status": "started",
        "start_slot": controller.start_slot,
        "end_slot": controller.end_slot,
        "n_vehicles": controller.n_vehicles,
    }


@app.get("/depot/mpc/status")
def mpc_status() -> dict:
    ensure_ready()
    controller: Optional[MPCController] = state.get("mpc_controller")
    if controller is None:
        raise HTTPException(status_code=404, detail="No MPC run started — call POST /depot/mpc/start first")
    return clean_json(controller.get_status())
```

Add the import near the other `gridpilot` imports (after line 39, `from gridpilot.scheduler import GridPilotScheduler`):

```python
from gridpilot.mpc_controller import MPCController
```

And confirm `HTTPException` is imported — it's used elsewhere in this file already (via `fastapi`), so check the top-of-file `from fastapi import ...` line and add `HTTPException` to it if it's missing.

- [ ] **Step 2: Manual verification (this file has no smoke-test block of its own — follow the repo's actual verification path for API changes)**

Run: `python -m uvicorn api.main:app --host 127.0.0.1 --port 8000` (or `python run_local.py`) and in another terminal:

```bash
curl -X POST http://127.0.0.1:8000/depot/mpc/start -H "Content-Type: application/json" -d "{\"date\": \"2024-03-15\", \"n_vehicles\": 40}"
```
Expected: JSON with `"status": "started"` and `start_slot`/`end_slot`.

```bash
curl http://127.0.0.1:8000/depot/mpc/status
```
Expected: JSON with `current_slot` increasing on repeated calls (poll it a few times a couple seconds apart), and eventually `"is_complete": true`, `"all_ready_so_far": true`.

- [ ] **Step 3: Commit**

```bash
git add api/main.py
git commit -m "feat: add live MPC start/status endpoints backed by MPCController"
```

---

### Task 6: Frontend — live MPC panel on the dashboard

**Files:**
- Create: `frontend/src/components/MpcLivePanel.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create the polling panel component**

Create `frontend/src/components/MpcLivePanel.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiFetch } from "@/lib/api";

type MpcTick = {
  slot: number;
  timestamp: string;
  total_load_kw: number;
  solve_time_ms: number;
  solver_status: string;
};

type MpcStatus = {
  current_slot: number;
  start_slot: number;
  end_slot: number;
  is_complete: boolean;
  delivered_kwh_total: number;
  energy_needed_kwh_total: number;
  all_ready_so_far: boolean;
  ticks_run: number;
  last_solve_time_ms: number | null;
  recent_dispatch: MpcTick[];
};

export default function MpcLivePanel() {
  const [status, setStatus] = useState<MpcStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startMpc = async () => {
    setError(null);
    setRunning(true);
    try {
      await apiFetch("/depot/mpc/start", {
        method: "POST",
        body: JSON.stringify({ date: "2024-03-15", n_vehicles: 40 }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start MPC run");
      setRunning(false);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const data: MpcStatus = await apiFetch("/depot/mpc/status");
        setStatus(data);
        if (data.is_complete) {
          stopPolling();
          setRunning(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to poll MPC status");
        stopPolling();
        setRunning(false);
      }
    }, 1000);
  };

  useEffect(() => stopPolling, []);

  return (
    <div style={{
      background: "#0D1B26", border: "1px solid rgba(74,92,106,0.4)",
      borderRadius: 12, padding: 16, marginTop: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ color: "#E2E8F0", fontSize: 16, fontWeight: 600 }}>Live MPC Re-Solve</h3>
        <button
          onClick={startMpc}
          disabled={running}
          style={{
            background: running ? "#4A5C6A" : "#00C851", color: "#fff",
            border: "none", borderRadius: 8, padding: "6px 14px",
            fontSize: 13, cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Running..." : "Start MPC Run"}
        </button>
      </div>

      {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      {status && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ color: "#4A5C6A", fontSize: 11 }}>Slot</div>
              <div style={{ color: "#E2E8F0", fontSize: 16 }}>{status.current_slot}/{status.end_slot}</div>
            </div>
            <div>
              <div style={{ color: "#4A5C6A", fontSize: 11 }}>Delivered</div>
              <div style={{ color: "#E2E8F0", fontSize: 16 }}>
                {status.delivered_kwh_total.toFixed(0)}/{status.energy_needed_kwh_total.toFixed(0)} kWh
              </div>
            </div>
            <div>
              <div style={{ color: "#4A5C6A", fontSize: 11 }}>Last solve</div>
              <div style={{ color: "#E2E8F0", fontSize: 16 }}>{status.last_solve_time_ms?.toFixed(0) ?? "-"} ms</div>
            </div>
            <div>
              <div style={{ color: "#4A5C6A", fontSize: 11 }}>Status</div>
              <div style={{ color: status.is_complete ? "#00C851" : "#F9CA24", fontSize: 16 }}>
                {status.is_complete ? "Complete" : "Re-solving..."}
              </div>
            </div>
          </div>

          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={status.recent_dispatch}>
                <CartesianGrid stroke="rgba(42,45,61,0.6)" vertical={false} />
                <XAxis dataKey="slot" tick={{ fill: "#4A5C6A", fontSize: 10 }} />
                <YAxis tick={{ fill: "#4A5C6A", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0D1B26", border: "1px solid rgba(74,92,106,0.4)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="total_load_kw" stroke="#7C5CBF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it on the dashboard**

In `frontend/src/app/dashboard/page.tsx`, add the import near the other component imports:

```tsx
import MpcLivePanel from "@/components/MpcLivePanel";
```

Then add `<MpcLivePanel />` directly after the closing tag of the existing "Depot Load Profile" chart section (the section containing the `chartData`/`ComposedChart` you can find by searching for `Depot Load Profile` in that file — insert the new component as a sibling immediately after that section's closing `</div>`).

- [ ] **Step 3: Manual verification in the browser**

Run: `cd frontend && npm run dev`, open `http://localhost:3000/dashboard`, click "Start MPC Run".
Expected: the KPI row updates roughly once a second, `Slot` counts up from `start_slot` toward `end_slot`, the line chart fills in tick by tick, and it ends with `Status: Complete` and `Delivered` equal to `Energy needed`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/MpcLivePanel.tsx frontend/src/app/dashboard/page.tsx
git commit -m "feat: add live MPC re-solve panel to dashboard"
```

---

## Explicitly Out of Scope (flag if requested later)

- Real OCPP/hardware telemetry feeding `delivered_kwh` (currently simulated by trusting the QP's own dispatch) — swapping this in is the natural next step once the relay demo can report measured current back to `MPCController.step()`.
- A $/kWh battery-degradation cost term in the objective (the other half of research Recommendation 1, alongside the SOC taper this plan does add) — needs a real per-kWh degradation figure from procurement/finance rather than an invented coefficient.
- Persisting MPC runs to the database (`ScheduleRun` table) — right now `state["mpc_controller"]` is in-memory only and lost on server restart, matching how `state["last_schedule_result"]` already behaves for the existing single-shot endpoint.
- Uncertainty-aware / stochastic re-planning — each tick still treats forecasts as ground truth, it just refreshes them more often.
- Reactive power / power-factor-correction modeling beyond the flat 0.95 CEA-compliance assumption — the research report found real-power-only dispatch is accepted practice at the depot-scheduling level; the gap only matters at distribution-network level.
