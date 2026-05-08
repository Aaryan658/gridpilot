from __future__ import annotations

import json

import numpy as np

try:
    from scipy.optimize import linprog

    SCIPY_AVAILABLE = True
except Exception:
    linprog = None
    SCIPY_AVAILABLE = False


class NationalLoadOptimizer:
    REGIONS = ["NR", "SR", "ER", "WR", "NER"]
    TRANSMISSION_LIMITS_MW = {
        ("NR", "WR"): 3500,
        ("NR", "ER"): 2000,
        ("WR", "SR"): 2500,
        ("ER", "SR"): 1500,
        ("ER", "NER"): 800,
        ("NR", "SR"): 1000,
    }
    LINE_LOSS_PCT = {
        ("NR", "WR"): 2.2,
        ("NR", "ER"): 3.1,
        ("WR", "SR"): 2.8,
        ("ER", "SR"): 3.5,
        ("ER", "NER"): 4.1,
        ("NR", "SR"): 4.8,
    }

    def optimize(self, forecast_dict: dict, generation_capacity: dict, carbon_signals: dict) -> dict:
        corridors = list(self.TRANSMISSION_LIMITS_MW)
        surplus = {
            region: float(generation_capacity.get(region, 0.0) - forecast_dict.get(region, 0.0))
            for region in self.REGIONS
        }

        if SCIPY_AVAILABLE:
            transfers_array = self._solve_linprog(corridors, surplus, carbon_signals)
        else:
            transfers_array = self._greedy_dispatch(corridors, surplus, carbon_signals)

        transfers = {
            f"{source}->{target}": round(float(mw), 2)
            for (source, target), mw in zip(corridors, transfers_array, strict=True)
        }

        total_transfer = float(np.sum(transfers_array))
        total_demand = max(float(sum(forecast_dict.values())), 1.0)
        weighted_loss_mw = sum(
            float(mw) * self.LINE_LOSS_PCT[corridor] / 100.0
            for corridor, mw in zip(corridors, transfers_array, strict=True)
        )
        baseline_loss_mw = sum(
            self.TRANSMISSION_LIMITS_MW[corridor] * 0.50 * self.LINE_LOSS_PCT[corridor] / 100.0
            for corridor in corridors
        )
        at_c_loss_reduction_pct = max(0.0, (baseline_loss_mw - weighted_loss_mw) / baseline_loss_mw * 100.0)

        clean_reference = min(carbon_signals.values())
        avg_displaced_carbon = np.mean([max(0.0, carbon_signals[r] - clean_reference) for r in carbon_signals])
        carbon_savings_tonnes = total_transfer * avg_displaced_carbon * 24.0 / 1000.0

        balance_ratio = min(sum(generation_capacity.values()) / total_demand, 1.08)
        loss_penalty = min(weighted_loss_mw / total_demand * 100.0, 15.0)
        stability_score = np.clip(82.0 + (balance_ratio - 1.0) * 120.0 - loss_penalty, 0.0, 100.0)

        savings_crore_per_day = max(0.01, (at_c_loss_reduction_pct / 100.0) * total_demand * 3500.0 / 10_000_000.0)
        surplus_region = max(surplus, key=surplus.get)
        recommendation = (
            f"Shift {total_transfer:,.0f} MW across national corridors, led by surplus {surplus_region}. "
            f"Prioritise NCR depot charging during Haryana clean-carbon window."
        )

        return {
            "transfers": transfers,
            "stability_score": round(float(stability_score), 2),
            "carbon_savings_tonnes": round(float(carbon_savings_tonnes), 2),
            "at_c_loss_reduction_pct": round(float(at_c_loss_reduction_pct), 2),
            "savings_crore_per_day": round(float(savings_crore_per_day), 3),
            "recommendation": recommendation,
        }

    def simulate_renewable_scenario(self, solar_pct: float, wind_pct: float) -> dict:
        renewable_pct = solar_pct + wind_pct
        curtailment_mw = max(0.0, (solar_pct - 35.0) * 180.0 + (wind_pct - 22.0) * 120.0)
        carbon_reduction_pct = np.clip(solar_pct * 0.42 + wind_pct * 0.34, 0.0, 65.0)
        stability_score = np.clip(92.0 - curtailment_mw / 900.0 + min(renewable_pct, 45.0) * 0.08, 35.0, 100.0)
        return {
            "stability_score": round(float(stability_score), 2),
            "curtailment_mw": round(float(curtailment_mw), 2),
            "carbon_reduction_pct": round(float(carbon_reduction_pct), 2),
        }

    def _solve_linprog(self, corridors: list[tuple[str, str]], surplus: dict, carbon_signals: dict) -> np.ndarray:
        c = []
        for source, target in corridors:
            loss_cost = self.LINE_LOSS_PCT[(source, target)] * 12.0
            carbon_benefit = max(0.0, carbon_signals[target] - carbon_signals[source]) * 900.0
            imbalance_benefit = max(0.0, -surplus[target]) * 0.02
            c.append(loss_cost - carbon_benefit - imbalance_benefit)

        bounds = [(0.0, float(self.TRANSMISSION_LIMITS_MW[corridor])) for corridor in corridors]
        a_ub = []
        b_ub = []
        for region in self.REGIONS:
            row = []
            for source, target in corridors:
                if source == region:
                    row.append(1.0)
                elif target == region:
                    row.append(-1.0)
                else:
                    row.append(0.0)
            a_ub.append(row)
            b_ub.append(max(0.0, surplus[region]))

        result = linprog(c, A_ub=np.array(a_ub), b_ub=np.array(b_ub), bounds=bounds, method="highs")
        if result.success:
            return result.x
        return self._greedy_dispatch(corridors, surplus, carbon_signals)

    def _greedy_dispatch(self, corridors: list[tuple[str, str]], surplus: dict, carbon_signals: dict) -> np.ndarray:
        remaining = surplus.copy()
        transfers = np.zeros(len(corridors))
        order = sorted(
            enumerate(corridors),
            key=lambda item: carbon_signals[item[1][1]] - carbon_signals[item[1][0]],
            reverse=True,
        )
        for idx, (source, target) in order:
            if remaining[source] <= 0:
                continue
            need = max(0.0, -remaining[target])
            mw = min(remaining[source], need or self.TRANSMISSION_LIMITS_MW[(source, target)] * 0.25, self.TRANSMISSION_LIMITS_MW[(source, target)])
            transfers[idx] = mw
            remaining[source] -= mw
            remaining[target] += mw
        return transfers


if __name__ == "__main__":
    optimizer = NationalLoadOptimizer()
    forecast = {"NR": 68000, "SR": 54000, "ER": 26000, "WR": 66000, "NER": 4300}
    capacity = {"NR": 73000, "SR": 55500, "ER": 28000, "WR": 72000, "NER": 4600}
    carbon = {"NR": 0.820, "SR": 0.536, "ER": 0.862, "WR": 0.724, "NER": 0.621}

    result = optimizer.optimize(forecast, capacity, carbon)
    print(json.dumps(result, indent=2))
    required = {
        "transfers",
        "stability_score",
        "carbon_savings_tonnes",
        "at_c_loss_reduction_pct",
        "savings_crore_per_day",
        "recommendation",
    }
    assert required.issubset(result.keys())
    assert result["savings_crore_per_day"] > 0

    scenario = optimizer.simulate_renewable_scenario(solar_pct=30, wind_pct=18)
    print(json.dumps(scenario, indent=2))
    assert {"stability_score", "curtailment_mw", "carbon_reduction_pct"}.issubset(scenario.keys())
