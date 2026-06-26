from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./gridpilot.db"

    # App
    SECRET_KEY: str = "change-this-in-production"
    ENVIRONMENT: str = "development"
    APP_NAME: str = "GridPilot"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # OCPP
    OCPP_PORT: int = 9000

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
