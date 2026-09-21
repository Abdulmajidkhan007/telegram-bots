from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Expense Manager API"
    environment: str = "development"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://expenseuser:expensepass@localhost:5432/expensedb"
    redis_url: str = "redis://:redispass@localhost:6379/0"

    secret_key: str = "supersecretkey"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    bot_token: str = ""
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"
    openai_api_key: str = ""

    export_dir: str = "./exports"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
