from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    PROJECT_NAME: str = Field(..., description="Name of the FastAPI project.")
    SECRET_KEY: str = Field(..., min_length=32, description="Secret key for security/JWT.")
    MONGO_URI: str = Field(..., description="MongoDB connection string (e.g., mongodb://localhost:27017/dbname).")
    ALLOWED_HOSTS: str = Field(..., description="Comma-separated list of allowed CORS origins.")

    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [host.strip() for host in self.ALLOWED_HOSTS.split(',') if host.strip()]


# ✅ Make sure this is not indented — it must be outside the class.
settings = Settings()
