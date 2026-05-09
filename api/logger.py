import logging, json, os
from datetime import datetime

os.makedirs("logs", exist_ok=True)

logging.basicConfig(
    filename="logs/gridpilot.log",
    level=logging.INFO,
    format="%(asctime)s %(message)s"
)

class GridPilotLogger:

    def __init__(self):
        self.logger = logging.getLogger(
            "gridpilot"
        )

    def log_optimizer_run(
        self, result: dict
    ):
        comparison = result.get(
            "comparison", {}
        )
        self.logger.info(json.dumps({
            "event": "OPTIMIZER_RUN",
            "ts":
                datetime.utcnow().isoformat(),
            "status": result.get("status"),
            "peak_reduction_pct":
                comparison.get(
                    "peak_reduction_pct"
                ),
            "solve_time_ms":
                result.get("solve_time_ms"),
            "all_ready":
                result.get("all_ready_on_time"),
            "dvvnl_saving":
                comparison.get(
                    "dvvnl_monthly_saving_inr"
                ),
        }))

    def log_request(
        self, endpoint, method, status, ms
    ):
        self.logger.info(json.dumps({
            "event": "REQUEST",
            "ts":
                datetime.utcnow().isoformat(),
            "endpoint": endpoint,
            "method": method,
            "status": status,
            "ms": ms,
        }))

    def log_error(self, error, context=""):
        self.logger.error(json.dumps({
            "event": "ERROR",
            "ts":
                datetime.utcnow().isoformat(),
            "error": str(error),
            "context": context,
        }))

gridpilot_logger = GridPilotLogger()
