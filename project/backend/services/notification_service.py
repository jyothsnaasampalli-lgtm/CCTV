"""
CCTV Sense - Notification and Alert Dispatch Service
Dispatches real-time alerts for HIGH and MEDIUM severity incidents.
Logs alerts to SQLite database and sends external webhooks if configured.
"""

import logging
from typing import Dict, Any, Optional
from database.db import execute_insert
from config import config

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def dispatch_alert(incident: Dict[str, Any], channel: str = "DASHBOARD") -> Optional[int]:
        """
        Dispatches and logs an alert for security personnel.
        High severity triggers both dashboard chime and optional external webhook.
        """
        severity = incident.get("importance_level", "LOW")
        incident_id = incident.get("id")

        # Check if severity meets configured threshold
        if severity == "LOW" and config.MIN_ALERT_SEVERITY in ("MEDIUM", "HIGH"):
            # Suppressed from noisy alerts to prevent alarm fatigue
            return None

        # 1. Log alert in SQLite database
        alert_id = None
        try:
            sql = """
                INSERT INTO alert_logs (incident_id, channel, severity, status)
                VALUES (?, ?, ?, 'DELIVERED');
            """
            alert_id = execute_insert(sql, (incident_id, channel, severity))
        except Exception as e:
            logger.error(f"[Alert Service] Failed to log alert for incident {incident_id}: {e}")

        # 2. Dispatch external webhook if configured
        if config.ALERT_WEBHOOK_URL and config.NOTIFICATION_ENABLED:
            NotificationService._send_webhook_payload(incident)

        return alert_id

    @staticmethod
    def _send_webhook_payload(incident: Dict[str, Any]):
        """Dispatches an asynchronous JSON payload to configured external security webhook."""
        try:
            import requests
            payload = {
                "source": "CCTV Sense - AI Surveillance Monitor",
                "team": "HealthNova (TS-39)",
                "incident_id": incident.get("id"),
                "camera_id": incident.get("camera_id"),
                "camera_name": incident.get("camera_name", "Surveillance Feed"),
                "importance_level": incident.get("importance_level"),
                "event_type": incident.get("event_type"),
                "description": incident.get("description"),
                "timestamp": incident.get("timestamp"),
                "action_required": incident.get("importance_level") == "HIGH"
            }
            # Timeout set to 3 seconds to avoid blocking main thread
            requests.post(config.ALERT_WEBHOOK_URL, json=payload, timeout=3.0)
            logger.info(f"[Alert Service] Webhook alert dispatched for incident #{incident.get('id')}")
        except Exception as ex:
            # Non-blocking graceful error logging
            logger.warning(f"[Alert Service] Webhook dispatch bypassed/failed: {ex}")
