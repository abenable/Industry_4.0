"""
Configuration settings for the inference API
"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # CORS settings
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,http://localhost:5000,http://localhost:5173"
    )

    # Model paths
    MODEL_DIR: str = "models"
    BEAN_MODEL_PATH: str = os.path.join(MODEL_DIR, "bean_model.onnx")
    MAIZE_MODEL_PATH: str = os.path.join(MODEL_DIR, "maize_model.onnx")

    # Image processing
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB
    SUPPORTED_FORMATS: List[str] = ["jpg", "jpeg", "png"]

    # Model settings
    DEFAULT_MODEL: str = "bean"

    class Config:
        env_file = ".env"
        case_sensitive = True

    def get_allowed_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list"""
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
        return self.ALLOWED_ORIGINS


settings = Settings()
