import uuid, datetime
from database.models import (
    SessionLocal, OptimizerRun, GridMeasurement
)
from api.auth.depot_filter import apply_depot_filter
from api.models.user import User

class OptimizerRepository:

    def save_run(self, result: dict, depot_id: str = None) -> str:
        run_id = str(uuid.uuid4())[:8]
        db = SessionLocal()
        try:
            comparison = result.get(
                "comparison", {}
            )
            un_c = comparison.get(
                "unmanaged_carbon_kg", 0
            ) or 0
            sc_c = comparison.get(
                "scheduled_carbon_kg", 0
            ) or 0
            run = OptimizerRun(
                run_id=run_id,
                depot_id=depot_id,
                n_vehicles=result.get(
                    "n_vehicles", 500),
                peak_kw_before=comparison.get(
                    "unmanaged_peak_kw"),
                peak_kw_after=comparison.get(
                    "scheduled_peak_kw"),
                peak_reduction_pct=comparison.get(
                    "peak_reduction_pct"),
                carbon_saved_kg=un_c - sc_c,
                carbon_reduction_pct=comparison.get(
                    "carbon_reduction_pct"),
                dvvnl_saving_inr=comparison.get(
                    "dvvnl_monthly_saving_inr"),
                solve_time_ms=result.get(
                    "solve_time_ms"),
                solver_status=result.get(
                    "status"),
                all_ready=result.get(
                    "all_ready_on_time", False),
                overloads_before=comparison.get(
                    "unmanaged_overload_events"),
                overloads_after=comparison.get(
                    "scheduled_overload_events"),
                result_summary=comparison,
            )
            db.add(run)
            db.commit()
            print(f"[DB] Saved run {run_id}")
            return run_id
        except Exception as e:
            print(f"[DB ERROR] {e}")
            db.rollback()
            return "error"
        finally:
            db.close()

    def get_cumulative_savings(self, current_user: User = None) -> dict:
        db = SessionLocal()
        try:
            query = db.query(OptimizerRun)
            if current_user:
                query = apply_depot_filter(query, OptimizerRun, current_user)
            runs = query.all()
            if not runs:
                return {
                    "total_runs": 0,
                    "message":
                        "No optimizer runs yet. "
                        "Call POST /depot/schedule"
                }
            total_carbon = sum(
                r.carbon_saved_kg or 0
                for r in runs
            )
            total_dvvnl = sum(
                (r.dvvnl_saving_inr or 0) / 12
                for r in runs
            )
            avg_reduction = sum(
                r.peak_reduction_pct or 0
                for r in runs
            ) / len(runs)
            first_run = runs[0].timestamp
            days = (
                datetime.datetime.utcnow() -
                first_run
            ).days
            return {
                "total_runs": len(runs),
                "total_carbon_saved_kg":
                    round(total_carbon, 1),
                "total_dvvnl_saving_inr":
                    round(total_dvvnl),
                "avg_peak_reduction_pct":
                    round(avg_reduction, 1),
                "best_reduction_pct": round(max(
                    r.peak_reduction_pct or 0
                    for r in runs
                ), 1),
                "deployment_days": days,
            }
        finally:
            db.close()

    def get_last_runs(self, n=10, current_user: User = None) -> list:
        db = SessionLocal()
        try:
            query = db.query(OptimizerRun)
            if current_user:
                query = apply_depot_filter(query, OptimizerRun, current_user)
                
            runs = (
                query
                .order_by(
                    OptimizerRun.timestamp.desc()
                )
                .limit(n)
                .all()
            )
            return [
                {
                    "run_id": r.run_id,
                    "timestamp":
                        r.timestamp.isoformat(),
                    "peak_reduction_pct":
                        r.peak_reduction_pct,
                    "solve_time_ms":
                        r.solve_time_ms,
                    "all_ready": r.all_ready,
                }
                for r in runs
            ]
        finally:
            db.close()
