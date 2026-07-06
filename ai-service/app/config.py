import os
from functools import lru_cache


class Settings:
    def __init__(self) -> None:
        self.gemini_api_key: str = os.environ.get("GEMINI_API_KEY", "")
        self.firebase_service_account_path: str = os.environ.get(
            "FIREBASE_SERVICE_ACCOUNT_PATH", ""
        )
        self.allow_dev_auth: bool = os.environ.get("ALLOW_DEV_AUTH", "true").lower() == "true"
        self.cors_origins: list[str] = [
            origin.strip()
            for origin in os.environ.get("CORS_ORIGINS", "*").split(",")
            if origin.strip()
        ]
        self.session_ttl_seconds: int = int(os.environ.get("SESSION_TTL_SECONDS", str(60 * 60)))
        self.google_maps_api_key: str = os.environ.get("GOOGLE_MAPS_API_KEY", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
