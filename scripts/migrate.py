import os
import sys

# Add the root directory to sys.path so we can import from api
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.models import Base, engine
from api.config import settings

def migrate():
    print(f"Running migrations in {settings.ENVIRONMENT} mode...")
    
    if settings.ENVIRONMENT == "development":
        print("Development mode: Dropping all tables...")
        Base.metadata.drop_all(engine)
        print("Development mode: Recreating all tables...")
        Base.metadata.create_all(engine)
        print("Tables created successfully.")
    else:
        print("Production mode: Creating tables that do not exist...")
        Base.metadata.create_all(engine)
        print("Tables created successfully. No tables were dropped.")

if __name__ == "__main__":
    migrate()
