from pydantic_settings import BaseSettings


class BotSettings(BaseSettings):
    bot_token: str
    database_url: str = "postgresql+asyncpg://expenseuser:expensepass@localhost:5432/expensedb"
    redis_url: str = "redis://:redispass@localhost:6379/0"
    api_url: str = "http://localhost:8000"
    openai_api_key: str = ""
    environment: str = "development"
    dashboard_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = BotSettings()
