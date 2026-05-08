from __future__ import annotations

import os
import pickle
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import f1_score, precision_score, recall_score

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from firstflight.forecaster import DemandForecaster
from pipeline.cea_loader import CEALoader
from pipeline.iex_loader import IEXLoader

warnings.filterwarnings("ignore")


class AnomalyDetector:
    REGIONS = ["NR", "SR", "ER", "WR", "NER"]
    MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved")
    FEATURES = [
        "residual",
        "demand_mw",
        "temp_c",
        "hour_of_day",
        "rolling_std_24h",
        "lag_1h",
        "carbon_intensity",
    ]
    STATE_BY_REGION = {
        "NR": "Haryana",
        "SR": "Tamil Nadu",
        "ER": "West Bengal",
        "WR": "Maharashtra",
        "NER": "Assam",
    }

    def __init__(self) -> None:
        os.makedirs(self.MODEL_DIR, exist_ok=True)
        self.iex = IEXLoader()
        self.cea = CEALoader()
        self.forecaster = DemandForecaster()

    def train(self, region: str) -> dict:
        region = region.upper()
        df = self._training_data(region)
        feature_df = self._feature_frame(region, df)
        split = int(len(feature_df) * 0.80)
        train_x = feature_df[self.FEATURES].iloc[:split]
        val_features = feature_df.iloc[split:].copy()

        model = IsolationForest(contamination=0.02, random_state=42)
        model.fit(train_x)

        injected, labels = self._inject_validation_anomalies(val_features, region)
        scores = model.decision_function(injected[self.FEATURES])
        predicted = np.zeros(len(injected), dtype=int)
        predicted[np.argsort(scores)[: labels.sum()]] = 1

        precision = precision_score(labels, predicted, zero_division=0)
        recall = recall_score(labels, predicted, zero_division=0)
        f1 = f1_score(labels, predicted, zero_division=0)

        save_path = os.path.join(self.MODEL_DIR, f"anomaly_{region}.pkl")
        with open(save_path, "wb") as handle:
            pickle.dump(
                {
                    "region": region,
                    "model": model,
                    "precision": float(precision),
                    "recall": float(recall),
                    "f1": float(f1),
                    "score_threshold": float(np.quantile(scores, 0.02)),
                },
                handle,
            )

        print(f"{region} anomaly precision={precision:.2f} recall={recall:.2f} F1={f1:.2f}")
        return {"precision": float(precision), "recall": float(recall), "f1": float(f1)}

    def train_all(self) -> pd.DataFrame:
        rows = []
        for region in self.REGIONS:
            rows.append({"region": region, **self.train(region)})
        summary = pd.DataFrame(rows)[["region", "precision", "recall", "f1"]]
        print("\nF1 summary:")
        print(summary.to_string(index=False, formatters={"f1": "{:.2f}".format}))
        return summary

    def detect(self, region: str, hours: int = 168) -> pd.DataFrame:
        region = region.upper()
        bundle = self._load(region)
        end = pd.Timestamp.now().normalize()
        start = end - pd.Timedelta(hours=hours - 1)
        df = self.iex.generate_region_demand(region, start.date().isoformat(), end.date().isoformat())
        df = df.tail(hours).reset_index(drop=True)
        features = self._feature_frame(region, df)

        model = bundle["model"]
        scores = model.decision_function(features[self.FEATURES])
        is_anomaly = scores <= bundle["score_threshold"]

        rows = []
        for idx, row in features.iterrows():
            severity = self._severity(row["residual"], row["demand_mw"]) if is_anomaly[idx] else "LOW"
            anomaly_type = self._anomaly_type(row["residual"], row["temp_c"], row["hour_of_day"]) if is_anomaly[idx] else "UNUSUAL_PATTERN"
            alert = (
                self._alert(region, severity, row["demand_mw"], row["residual"], row["timestamp"], row["carbon_intensity"])
                if is_anomaly[idx]
                else ""
            )
            rows.append(
                {
                    "timestamp": row["timestamp"],
                    "region": region,
                    "demand_mw": round(float(row["demand_mw"]), 2),
                    "predicted_mw": round(float(row["predicted_mw"]), 2),
                    "residual_mw": round(float(row["residual"]), 2),
                    "anomaly_score": round(float(scores[idx]), 5),
                    "is_anomaly": bool(is_anomaly[idx]),
                    "severity": severity,
                    "anomaly_type": anomaly_type,
                    "alert_message": alert,
                }
            )
        return pd.DataFrame(rows)

    def _training_data(self, region: str) -> pd.DataFrame:
        return self.iex.generate_region_demand(region, "2022-01-01", "2023-12-31")

    def _feature_frame(self, region: str, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        out["timestamp"] = pd.to_datetime(out["timestamp"])
        predicted = self._predict_history(region, out)
        out["predicted_mw"] = predicted
        out["residual"] = out["demand_mw"] - out["predicted_mw"]
        out["temp_c"] = self._synthetic_temp(out["timestamp"])
        out["hour_of_day"] = out["timestamp"].dt.hour
        out["rolling_std_24h"] = out["demand_mw"].rolling(24, min_periods=2).std().bfill().fillna(0.0)
        out["lag_1h"] = out["demand_mw"].shift(1).bfill()
        out["carbon_intensity"] = self.cea.get_state_emission_factor(self.STATE_BY_REGION[region])
        return out

    def _predict_history(self, region: str, df: pd.DataFrame) -> np.ndarray:
        bundle = self.forecaster._load(region)
        model = bundle["model"]
        future = pd.DataFrame({"ds": pd.to_datetime(df["timestamp"])})
        return self.forecaster._predict_with_bundle(model, future)["predicted_mw"].to_numpy()

    def _inject_validation_anomalies(self, features: pd.DataFrame, region: str) -> tuple[pd.DataFrame, np.ndarray]:
        injected = features.copy().reset_index(drop=True)
        labels = np.zeros(len(injected), dtype=int)
        count = max(1, int(len(injected) * 0.02))
        rng = np.random.default_rng(42)
        anomaly_idx = rng.choice(len(injected), size=count, replace=False)
        peak = IEXLoader.REAL_PEAK_DEMAND_MW[region]
        for idx in anomaly_idx:
            direction = 1 if idx % 2 == 0 else -1
            injected.loc[idx, "residual"] += direction * peak * rng.uniform(0.22, 0.32)
            injected.loc[idx, "demand_mw"] += direction * peak * rng.uniform(0.18, 0.25)
            injected.loc[idx, "temp_c"] += 12 if direction > 0 else -8
            injected.loc[idx, "rolling_std_24h"] *= 3.5
            labels[idx] = 1
        return injected, labels

    @staticmethod
    def _synthetic_temp(timestamps: pd.Series) -> np.ndarray:
        month = timestamps.dt.month
        hour = timestamps.dt.hour
        solar = np.maximum(0.0, np.sin(np.pi * (hour - 6) / 12.0))
        temp = np.where(month.isin([4, 5, 6]), 34 + 9 * solar, 22 + 8 * solar)
        temp = np.where(month.isin([12, 1]), 8 + 8 * solar, temp)
        temp = np.where(month.isin([7, 8, 9]), 29 + 4 * solar, temp)
        return temp.astype(float)

    @staticmethod
    def _severity(residual: float, demand: float) -> str:
        pct = abs(residual) / max(demand, 1.0)
        if pct >= 0.22:
            return "CRITICAL"
        if pct >= 0.14:
            return "HIGH"
        if pct >= 0.08:
            return "MEDIUM"
        return "LOW"

    @staticmethod
    def _anomaly_type(residual: float, temp_c: float, hour: int) -> str:
        if temp_c >= 42 or (temp_c <= 5 and 5 <= hour <= 10):
            return "WEATHER_EVENT"
        if residual > 0:
            return "DEMAND_SPIKE"
        if residual < 0:
            return "DEMAND_DROP"
        return "UNUSUAL_PATTERN"

    @staticmethod
    def _alert(region: str, severity: str, demand: float, residual: float, timestamp: pd.Timestamp, carbon: float) -> str:
        direction = "above" if residual >= 0 else "below"
        action = "pause" if residual >= 0 else "resume"
        return (
            f"{severity}: {region} demand {abs(residual):,.0f} MW {direction} forecast "
            f"at {timestamp.strftime('%H:%M')} IST. NCR carbon rising to "
            f"{carbon:.2f} kg CO2/kWh. GridPilot: {action} non-critical EV charging 2h."
        )

    def _load(self, region: str) -> dict:
        path = os.path.join(self.MODEL_DIR, f"anomaly_{region}.pkl")
        if not os.path.exists(path):
            self.train(region)
        with open(path, "rb") as handle:
            return pickle.load(handle)


if __name__ == "__main__":
    detector = AnomalyDetector()
    summary = detector.train_all()
    print("\nF1 table:")
    print(summary[["region", "f1"]].to_string(index=False))
    assert (summary["f1"] > 0.70).all(), "All regional F1 scores must exceed 0.70"

    detected = detector.detect("NR", hours=168)
    anomalies = detected[detected["is_anomaly"]]
    print(f"NR anomalies found: {len(anomalies)}")
    if not anomalies.empty:
        print(anomalies.head(3).to_string(index=False))
    assert list(detected.columns) == [
        "timestamp",
        "region",
        "demand_mw",
        "predicted_mw",
        "residual_mw",
        "anomaly_score",
        "is_anomaly",
        "severity",
        "anomaly_type",
        "alert_message",
    ]
