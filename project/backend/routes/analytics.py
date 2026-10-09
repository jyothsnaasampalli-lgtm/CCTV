"""
CCTV Sense - Security Analytics REST API Routes
Provides operational statistics, alert counts, and triage metrics.
"""

from flask import Blueprint, jsonify
from models.incident import IncidentModel
from database.db import fetch_all

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")

@analytics_bp.route("/summary", methods=["GET"])
def get_summary():
    """Retrieve top-level KPI counts for security dashboard."""
    try:
        stats = IncidentModel.get_summary_stats()
        return jsonify({"success": True, "data": stats}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@analytics_bp.route("/alert-logs", methods=["GET"])
def get_alert_logs():
    """Retrieve recent alerts dispatched to security channels."""
    try:
        logs = fetch_all("""
            SELECT a.*, i.camera_id, i.event_type, i.description
            FROM alert_logs a
            JOIN incidents i ON a.incident_id = i.id
            ORDER BY a.sent_at DESC
            LIMIT 25;
        """)
        return jsonify({"success": True, "count": len(logs), "data": logs}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
