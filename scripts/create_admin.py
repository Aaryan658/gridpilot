import argparse
import sys
import os

# Add the project root to sys.path to allow importing api modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.models import SessionLocal, Base, engine
from api.models.user import User
from api.auth.utils import hash_password

def create_admin(email: str, password: str):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print("Admin user already exists.")
            return
            
        hashed = hash_password(password)
        new_admin = User(
            email=email,
            hashed_password=hashed,
            role="gridpilot_admin",
            depot_id=None,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print("Admin user created")
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a GridPilot admin user")
    parser.add_argument("--email", required=True, help="Admin email")
    parser.add_argument("--password", required=True, help="Admin password")
    
    args = parser.parse_args()
    create_admin(args.email, args.password)
