from pydantic import BaseModel
import os


class Settings(BaseModel):
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/prompt_version_hub")
    jwt_secret: str = os.getenv("JWT_SECRET", "change_me")
    jwt_expires_min: int = int(os.getenv("JWT_EXPIRES_MIN", "60"))
    admin_email: str = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "changeme123")


settings = Settings()

