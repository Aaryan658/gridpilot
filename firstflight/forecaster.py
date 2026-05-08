from __future__ import annotations

import os
import pickle
import sys
import warnings

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from pipeline.iex_loader import IEXLoader

warnings.filterwarnings("ignore")

try:
    from prophet import Prophet

    PROPHET_AVAILABLE = True
except Exception:
    Prophet = None
    PROPHET_AVAILABLE = False


class DemandForecaster:
    REGIONS = ["NR", "SR", "ER", "WR", "NER"]
    MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved")

    def __init__(self) -> None:
        os.makedirs(self.MODEL_DIR, exist_ok=True)
        self.iex = IEXLoader()

    def train(self, region: str) -> dict:
        region = region.upper()
        data = self._training_frame(region)
        split = int(len(data) * 0.80)
        train_df = data.iloc[:split].copy()
        val_df = data.iloc[split:].copy()

        model_bundle = self._fit_prophet(train_df) if PROPHET_AVAILABLE else self._fit_seasonal_model(train_df)
        pred = self._predict_with_bundle(model_bundle, val_df[["ds"]].copy())
        metrics = self._metrics(val_df["y"].to_numpy(), pred["predicted_mw"].to_numpy())

        save_path = os.path.join(self.MODEL_DIR, f"forecaster_{region}.pkl")
        with open(save_path, "wb") as handle:
            pickle.dump({"region": region, "model": model_bundle, **metrics}, handle)

        print(f"{region} forecast MAPE: {metrics['mape']:.2f}%")
        return metrics

    def train_all(self) -> pd.DataFrame:
        rows = []
        for region in self.REGIONS:
            metrics = self.train(region)
            rows.append({"region": region, **metrics})
        summary = pd.DataFrame(rows)[["region", "mape", "rmse", "mae", "r2"]]
        print("\nMAPE summary:")
        print(summary.to_string(index=False, formatters={"mape": "{:.2f}".format}))
        return summary

    def forecast(self, region: str, hours: int = 24) -> pd.DataFrame:
        region = region.upper()
        bundle = self._load(region)
        timestamps = pd.date_range(pd.Timestamp.now().normalize(), periods=hours, freq="h")
        future = pd.DataFrame({"ds": timestamps})
        forecast = self._predict_with_bundle(bundle["model"], future)
        forecast["region"] = region
        return forecast[
            ["timestamp", "predicted_mw", "lower_mw", "upper_mw", "confidence_pct", "region"]
        ]

    def get_peak_forecast(self, region: str) -> dict:
        forecast = self.forecast(region, hours=24)
        row = forecast.loc[forecast["predicted_mw"].idxmax()]
        return {
            "timestamp": row["timestamp"],
            "predicted_mw": float(row["predicted_mw"]),
            "confidence_pct": float(row["confidence_pct"]),
        }

    def get_accuracy_metrics(self, region: str) -> dict:
        bundle = self._load(region.upper())
        return {
            "mape": float(bundle["mape"]),
            "rmse": float(bundle["rmse"]),
            "mae": float(bundle["mae"]),
            "r2": float(bundle["r2"]),
        }

    def _training_frame(self, region: str) -> pd.DataFrame:
        df = self.iex.generate_region_demand(region, "2022-01-01", "2023-12-31")
        df = df.rename(columns={"timestamp": "ds", "demand_mw": "y"})
        df["ds"] = pd.to_datetime(df["ds"])
        return self._add_india_regressors(df)

    def _add_india_regressors(self, df: pd.DataFrame) -> pd.DataFrame:
        out = df.copy()
        month = out["ds"].dt.month
        hour = out["ds"].dt.hour
        date_str = out["ds"].dt.date.astype(str)
        festival_days = {
            "2022-03-18",
            "2022-05-03",
            "2022-09-26",
            "2022-10-24",
            "2023-03-08",
            "2023-04-22",
            "2023-10-15",
            "2023-11-12",
        }
        out["festival_mode"] = date_str.isin(festival_days).astype(int)
        out["ipl_season"] = ((month.isin([4, 5])) & (hour.between(18, 22))).astype(int)
        out["monsoon_mode"] = month.isin([6, 7, 8, 9]).astype(int)
        out["winter_morning"] = ((month.isin([12, 1])) & (hour.between(6, 10))).astype(int)
        return out

    def _fit_prophet(self, train_df: pd.DataFrame) -> dict:
        try:
            model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=True,
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=8,
            )
            for column in ["festival_mode", "ipl_season", "monsoon_mode", "winter_morning"]:
                model.add_regressor(column)
            model.fit(
                train_df[
                    ["ds", "y", "festival_mode", "ipl_season", "monsoon_mode", "winter_morning"]
                ]
            )
            return {"kind": "prophet", "model": model}
        except Exception:
            return self._fit_seasonal_model(train_df)

    def _fit_seasonal_model(self, train_df: pd.DataFrame) -> dict:
        frame = train_df.copy()
        frame["hour_of_week"] = frame["ds"].dt.dayofweek * 24 + frame["ds"].dt.hour
        frame["month"] = frame["ds"].dt.month
        hour_month = frame.groupby(["month", "hour_of_week"])["y"].mean()
        hour_week = frame.groupby("hour_of_week")["y"].mean()
        region_peak = float(frame["y"].quantile(0.995))
        return {
            "kind": "seasonal_fallback",
            "hour_month": hour_month,
            "hour_week": hour_week,
            "mean": float(frame["y"].mean()),
            "region_peak": region_peak,
        }

    def _predict_with_bundle(self, model_bundle: dict, future: pd.DataFrame) -> pd.DataFrame:
        future = self._add_india_regressors(future.copy())
        if model_bundle["kind"] == "prophet":
            pred = model_bundle["model"].predict(
                future[["ds", "festival_mode", "ipl_season", "monsoon_mode", "winter_morning"]]
            )
            yhat = pred["yhat"].clip(lower=0).to_numpy()
            lower = pred["yhat_lower"].clip(lower=0).to_numpy()
            upper = pred["yhat_upper"].clip(lower=0).to_numpy()
        else:
            future["hour_of_week"] = future["ds"].dt.dayofweek * 24 + future["ds"].dt.hour
            future["month"] = future["ds"].dt.month
            hour_month = model_bundle["hour_month"]
            hour_week = model_bundle["hour_week"]
            yhat = []
            for row in future.itertuples(index=False):
                key = (row.month, row.hour_of_week)
                base = hour_month.get(key, hour_week.get(row.hour_of_week, model_bundle["mean"]))
                yhat.append(float(base))
            yhat = np.array(yhat)
            lower = yhat * 0.965
            upper = yhat * 1.035

        confidence = np.clip(100.0 - ((upper - lower) / np.maximum(yhat, 1.0)) * 100.0, 75.0, 97.0)
        return pd.DataFrame(
            {
                "timestamp": future["ds"],
                "predicted_mw": np.round(yhat, 2),
                "lower_mw": np.round(lower, 2),
                "upper_mw": np.round(upper, 2),
                "confidence_pct": np.round(confidence, 1),
            }
        )

    def _load(self, region: str) -> dict:
        path = os.path.join(self.MODEL_DIR, f"forecaster_{region}.pkl")
        if not os.path.exists(path):
            self.train(region)
        with open(path, "rb") as handle:
            return pickle.load(handle)

    @staticmethod
    def _metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
        residual = y_true - y_pred
        mape = float(np.mean(np.abs(residual / y_true)) * 100.0)
        rmse = float(np.sqrt(np.mean(residual**2)))
        mae = float(np.mean(np.abs(residual)))
        ss_res = float(np.sum(residual**2))
        ss_tot = float(np.sum((y_true - np.mean(y_true)) ** 2))
        r2 = 1.0 - ss_res / ss_tot if ss_tot else 0.0
        return {"mape": mape, "rmse": rmse, "mae": mae, "r2": r2}


if __name__ == "__main__":
    forecaster = DemandForecaster()
    summary = forecaster.train_all()
    print("\nMAPE table:")
    print(summary[["region", "mape"]].to_string(index=False))
    assert (summary["mape"] < 8.0).all(), "All regional MAPEs must be below 8%"

    nr = forecaster.forecast("NR", hours=24)
    print(f"NR 24h forecast shape: {nr.shape}")
    print(nr.head().to_string(index=False))
    assert nr.shape == (24, 6)
