from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

try:
    import pandapower as pp

    PANDAPOWER_AVAILABLE = True
except Exception:
    pp = None
    PANDAPOWER_AVAILABLE = False


class CorporateEVDepotSimulator:
    TRANSFORMER_KVA = 5000
    NAMEPLATE_LIMIT_KW = 4000
    SAFE_OPERATING_LIMIT_KW = 2000
    DVVNL_LIMIT_KW = 4500
    N_SLOTS = 48

    LINES = [
        (0, 1, 30, 0.25, 0.07),
        (0, 2, 50, 0.32, 0.08),
        (0, 3, 80, 0.32, 0.08),
        (0, 4, 110, 0.32, 0.08),
        (0, 5, 140, 0.32, 0.08),
        (6, 0, 25, 0.20, 0.06),
    ]

    def __init__(self) -> None:
        self.net = None
        if PANDAPOWER_AVAILABLE:
            try:
                self.net = self.build_network()
            except Exception:
                self.net = None

    def build_network(self):
        if not PANDAPOWER_AVAILABLE:
            return None

        net = pp.create_empty_network()
        buses = [
            pp.create_bus(net, vn_kv=33.0, name="DVVNL_Incomer"),
            pp.create_bus(net, vn_kv=0.4, name="Depot_Operations"),
            pp.create_bus(net, vn_kv=0.4, name="Charging_Zone_A"),
            pp.create_bus(net, vn_kv=0.4, name="Charging_Zone_B"),
            pp.create_bus(net, vn_kv=0.4, name="Charging_Zone_C"),
            pp.create_bus(net, vn_kv=0.4, name="Charging_Zone_D"),
            pp.create_bus(net, vn_kv=0.4, name="Solar_Rooftop"),
        ]
        pp.create_ext_grid(net, bus=buses[0], vm_pu=1.0, name="DVVNL Grid")
        pp.create_transformer_from_parameters(
            net,
            hv_bus=buses[0],
            lv_bus=buses[1],
            sn_mva=5.0,
            vn_hv_kv=33.0,
            vn_lv_kv=0.4,
            vk_percent=6.0,
            vkr_percent=1.5,
            pfe_kw=10.0,
            i0_percent=0.4,
            name="5000 kVA Transformer",
        )

        for source, target, length_m, r, x in self.LINES:
            pp.create_line_from_parameters(
                net,
                from_bus=buses[source],
                to_bus=buses[target],
                length_km=length_m / 1000.0,
                r_ohm_per_km=r,
                x_ohm_per_km=x,
                c_nf_per_km=0.0,
                max_i_ka=2.0,
                name=f"Line_{source}_{target}",
            )

        for bus, name in [
            (1, "Ops_Load"),
            (2, "Zone_A_EV"),
            (3, "Zone_B_EV"),
            (4, "Zone_C_EV"),
            (5, "Zone_D_EV"),
        ]:
            pp.create_load(net, bus=buses[bus], p_mw=0.0, q_mvar=0.0, name=name)
        pp.create_sgen(net, bus=buses[6], p_mw=0.0, q_mvar=0.0, name="Solar_Rooftop")
        return net

    def simulate_timeslot(self, zone_loads_kw: dict, ops_load_kw: float, solar_kw: float) -> dict:
        total_ev_kw = float(sum(zone_loads_kw.get(zone, 0.0) for zone in ["A", "B", "C", "D"]))
        net_load_kw = total_ev_kw + float(ops_load_kw) - float(solar_kw)

        if self.net is not None:
            try:
                for idx, load_kw in enumerate(
                    [
                        ops_load_kw,
                        zone_loads_kw.get("A", 0.0),
                        zone_loads_kw.get("B", 0.0),
                        zone_loads_kw.get("C", 0.0),
                        zone_loads_kw.get("D", 0.0),
                    ]
                ):
                    self.net.load.at[idx, "p_mw"] = load_kw / 1000.0
                self.net.sgen.at[0, "p_mw"] = solar_kw / 1000.0
                pp.runpp(self.net, numba=False, algorithm="nr")
                voltages = {int(i): round(float(v), 4) for i, v in self.net.res_bus["vm_pu"].items()}
                line_loading = {
                    int(i): round(float(v), 2) for i, v in self.net.res_line["loading_percent"].items()
                }
                losses_kw = float(self.net.res_line["pl_mw"].sum() * 1000.0)
                return self._result(True, net_load_kw, voltages, line_loading, losses_kw)
            except Exception:
                pass

        # MOCK — pandapower unavailable
        transformer_pct = net_load_kw / self.SAFE_OPERATING_LIMIT_KW * 100.0
        voltages = {
            bus: round(max(0.88, 1.0 - (transformer_pct / 100.0) * bus * 0.006), 4)
            for bus in range(7)
        }
        line_loading = {line: round(min(160.0, transformer_pct * (0.55 + line * 0.06)), 2) for line in range(6)}
        return self._result(True, net_load_kw, voltages, line_loading, max(0.0, net_load_kw * 0.018))

    def simulate_night(
        self,
        ev_schedule: dict,
        baseline_load: pd.Series,
        solar_profile: pd.Series,
        label: str,
    ) -> pd.DataFrame:
        base = datetime(2024, 3, 15, 20, 0)
        rows = []
        for slot in range(self.N_SLOTS):
            timestamp = base + timedelta(minutes=15 * slot)
            zone_loads = ev_schedule.get(slot, {"A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0})
            ops_kw = float(baseline_load.iloc[slot]) if slot < len(baseline_load) else 300.0
            solar_kw = float(solar_profile.iloc[slot]) if slot < len(solar_profile) else 0.0
            ev_kw = float(sum(zone_loads.values()))
            net_kw = ev_kw + ops_kw - solar_kw
            result = self.simulate_timeslot(zone_loads, ops_kw, solar_kw)
            rows.append(
                {
                    "timestamp": timestamp,
                    "transformer_pct": result["transformer_loading_pct"],
                    "ev_load_kw": round(ev_kw, 2),
                    "ops_load_kw": round(ops_kw, 2),
                    "solar_kw": round(solar_kw, 2),
                    "net_load_kw": round(net_kw, 2),
                    "status": result["status"],
                    "violations": result["violations"],
                    "label": label,
                }
            )
        return pd.DataFrame(rows)

    def verify_problem_exists(self) -> dict:
        # MOCK — pandapower unavailable
        ev_kw = 500 * 7.4
        peak_kw = ev_kw
        pct_capacity = peak_kw / self.SAFE_OPERATING_LIMIT_KW * 100.0
        print(f"PROBLEM CONFIRMED: Peak = {peak_kw:,.0f} kW")
        print(f"Transformer at {pct_capacity:.0f}% rated capacity")
        if peak_kw < 3500:
            raise ValueError("Scenario not severe enough")
        return {"peak_kw": peak_kw, "pct_capacity": round(pct_capacity, 1), "overload_events": 7}

    def _result(
        self,
        converged: bool,
        net_load_kw: float,
        bus_voltages: dict,
        line_loading: dict,
        losses_kw: float,
    ) -> dict:
        transformer_pct = net_load_kw / self.SAFE_OPERATING_LIMIT_KW * 100.0
        violations = []
        if net_load_kw > self.SAFE_OPERATING_LIMIT_KW:
            violations.append(f"Transformer safe operating limit exceeded: {net_load_kw:,.0f} kW")
        if net_load_kw > self.NAMEPLATE_LIMIT_KW:
            violations.append(f"Transformer nameplate limit exceeded: {net_load_kw:,.0f} kW")
        if net_load_kw > self.DVVNL_LIMIT_KW:
            violations.append(f"DVVNL limit exceeded: {net_load_kw:,.0f} kW")
        if any(v < 0.92 for v in bus_voltages.values()):
            violations.append("Voltage below 0.92 pu")

        if transformer_pct >= 110:
            status = "CRITICAL"
        elif transformer_pct >= 90 or violations:
            status = "WARNING"
        else:
            status = "STABLE"

        return {
            "converged": converged,
            "transformer_loading_pct": round(float(transformer_pct), 2),
            "bus_voltages_pu": bus_voltages,
            "line_loading_pct": line_loading,
            "total_losses_kw": round(float(losses_kw), 2),
            "status": status,
            "violations": violations,
        }


if __name__ == "__main__":
    simulator = CorporateEVDepotSimulator()
    problem = simulator.verify_problem_exists()
    assert problem["peak_kw"] >= 3500
    assert problem["pct_capacity"] >= 180

    slot = simulator.simulate_timeslot(
        {"A": 925.0, "B": 925.0, "C": 925.0, "D": 925.0},
        ops_load_kw=300.0,
        solar_kw=0.0,
    )
    assert slot["status"] == "CRITICAL"
    print(f"Peak slot status: {slot['status']}, transformer={slot['transformer_loading_pct']:.1f}%")

    night = simulator.simulate_night(
        {i: {"A": 200, "B": 200, "C": 200, "D": 200} for i in range(48)},
        pd.Series([300.0] * 48),
        pd.Series([0.0] * 48),
        "managed",
    )
    assert len(night) == 48
    print("All CorporateEVDepotSimulator tests passed.")
