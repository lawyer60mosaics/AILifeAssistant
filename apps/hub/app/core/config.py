from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Minutes Hub"
    local_only: bool = True
    summary_interval_seconds: int = 180
    redact_custom_terms: str = ""
    cloud_llm_base_url: str = "https://api.openai.com/v1"
    cloud_llm_api_key: str = ""
    cloud_llm_model: str = "gpt-4o-mini"
    cloud_llm_timeout_seconds: int = 30
    hub_host: str = "0.0.0.0"
    hub_port: int = 8765
    mdns_enabled: bool = True
    mdns_service_name: str = "AI Minutes Hub"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
