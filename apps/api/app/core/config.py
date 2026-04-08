from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_env: str = "development"
    app_name: str = "Global Market Intelligence API"
    cors_origins: str = "http://localhost:3000"

    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_db_url: str | None = None

    openai_api_key: str | None = None
    openai_model: str = "gpt-5.4-mini"

    gnews_api_key: str | None = None
    news_provider: str = "gnews"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

