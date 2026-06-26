import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.models import SessionLocal, OptimizerRun, Base, engine
from api.models.user import User
from api.auth.depot_filter import apply_depot_filter
import uuid

def test_isolation():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Create some test data
        depot_a_id = "depot_a"
        depot_b_id = "depot_b"
        
        run_a = OptimizerRun(run_id=str(uuid.uuid4())[:8], depot_id=depot_a_id)
        run_b = OptimizerRun(run_id=str(uuid.uuid4())[:8], depot_id=depot_b_id)
        db.add(run_a)
        db.add(run_b)
        db.commit()
        
        # Test Depot Admin A
        admin_a = User(role="depot_admin", depot_id=depot_a_id)
        query_a = apply_depot_filter(db.query(OptimizerRun), OptimizerRun, admin_a)
        results_a = query_a.all()
        
        has_b = any(r.depot_id == depot_b_id for r in results_a)
        if not has_b and len(results_a) > 0:
            print("PASS: depot_admin user A cannot see depot B data")
        else:
            print("FAIL: depot_admin user A cannot see depot B data")
            
        # Test Gridpilot Admin
        grid_admin = User(role="gridpilot_admin", depot_id=None)
        query_grid = apply_depot_filter(db.query(OptimizerRun), OptimizerRun, grid_admin)
        results_grid = query_grid.all()
        
        has_a = any(r.depot_id == depot_a_id for r in results_grid)
        has_b = any(r.depot_id == depot_b_id for r in results_grid)
        
        if has_a and has_b:
            print("PASS: gridpilot_admin can see all depot data")
        else:
            print("FAIL: gridpilot_admin can see all depot data")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_isolation()
