from pydantic import BaseModel
import os


class Settings(BaseModel):
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/prompt_version_hub")
    jwt_secret: str = os.getenv("JWT_SECRET", "change_me")
    jwt_access_expires_min: int = int(os.getenv("JWT_ACCESS_EXPIRES_MIN", "15"))
    jwt_refresh_expires_days: int = int(os.getenv("JWT_REFRESH_EXPIRES_DAYS", "7"))
    admin_email: str = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "changeme123")
    google_genai_api_key: str | None = os.getenv("GOOGLE_GENAI_API_KEY")
    google_genai_model: str = os.getenv("GOOGLE_GENAI_MODEL", "gemini-2.5-flash")
    ai_max_requests_per_user_per_day: int = int(os.getenv("AI_MAX_REQUESTS_PER_USER_PER_DAY", "50"))
    ai_rate_limit_per_ip: str = os.getenv("AI_RATE_LIMIT_PER_IP", "10/hour")


settings = Settings()
