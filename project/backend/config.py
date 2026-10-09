"""
CCTV Sense - Configuration Module
Manages environment variables, database locations, and operational parameters.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base application configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "cctv-sense-secret-key-healthnova-2026")
    DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    PORT = int(os.getenv("PORT", 5000))
    
    # Database
    DATABASE_PATH = os.path.join(
        BASE_DIR, 
        os.getenv("DATABASE_PATH", "database/cctv_sense.db")
    )
    
    # ML Model
    MODEL_PATH = os.path.join(
        BASE_DIR, 
        os.getenv("MODEL_PATH", "ml/cctv_sense_model.pkl")
    )
    
    # Alerts & Notifications
    ALERT_WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "")
    NOTIFICATION_ENABLED = os.getenv("NOTIFICATION_ENABLED", "True").lower() in ("true", "1", "yes")
    MIN_ALERT_SEVERITY = os.getenv("MIN_ALERT_SEVERITY", "MEDIUM")
    
    # Security Contact
    SECURITY_DESK_EMAIL = os.getenv("SECURITY_DESK_EMAIL", "security-desk@campus.edu")

config = Config()
