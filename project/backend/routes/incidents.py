"""
CCTV Sense - Incidents and Recorded Footage Search REST API Routes
Directly powers PPT Slide 4 'Search recorded incidents' & 'Alerts based on event importance'.
"""

from flask import Blueprint, request, jsonify
from models.incident import IncidentModel
from services.notification_service import NotificationService

incidents_bp = Blueprint("incidents", __name__, url_prefix="/api/incidents")

@incidents_bp.route("", methods=["GET"])
def search_incidents():
    """
    Search recorded incidents with granular multi-parameter filtering.
    Fulfills PPT requirement: 'Quick incident search in recorded footage'.
    """
    camera_id = request.args.get("camera_id")
    importance_level = request.args.get("importance")
    event_type = request.args.get("event_type")
    status = request.args.get("status")
    search_query = request.args.get("q")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))

    try:
        results = IncidentModel.search(
            camera_id=camera_id,
            importance_level=importance_level,
            event_type=event_type,
            status=status,
            search_query=search_query,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset
        )
        return jsonify({
            "success": True,
            "count": len(results),
            "filters_applied": {
                "camera_id": camera_id,
                "importance": importance_level,
                "event_type": event_type,
                "status": status,
                "q": search_query
            },
            "data": results
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@incidents_bp.route("/<int:incident_id>", methods=["GET"])
def get_incident(incident_id):
    """Retrieve details of a specific incident."""
    inc = IncidentModel.get_by_id(incident_id)
    if not inc:
        return jsonify({"success": False, "error": f"Incident #{incident_id} not found."}), 404
    return jsonify({"success": True, "data": inc}), 200

@incidents_bp.route("", methods=["POST"])
def create_incident():
    """Manually or programmatically log an incident."""
    data = request.get_json() or {}
    required = ["camera_id", "event_type", "importance_level", "description"]
    for req in required:
        if not data.get(req):
            return jsonify({"success": False, "error": f"Field '{req}' is required."}), 400

    try:
        new_inc = IncidentModel.create(data)
        NotificationService.dispatch_alert(new_inc)
        return jsonify({
            "success": True, 
            "message": "Incident logged successfully.", 
            "data": new_inc
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@incidents_bp.route("/<int:incident_id>/status", methods=["PATCH"])
def update_status(incident_id):
    """Update review status (ACKNOWLEDGED, RESOLVED, FALSE_ALARM) for an incident."""
    data = request.get_json() or {}
    new_status = data.get("status")
    if not new_status:
        return jsonify({"success": False, "error": "Field 'status' is required."}), 400

    valid_statuses = ["NEW", "ACKNOWLEDGED", "RESOLVED", "FALSE_ALARM"]
    if new_status.upper() not in valid_statuses:
        return jsonify({
            "success": False, 
            "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        }), 400

    assigned_to = data.get("assigned_to")
    notes = data.get("resolution_notes")

    updated = IncidentModel.update_status(
        incident_id=incident_id,
        status=new_status,
        assigned_to=assigned_to,
        resolution_notes=notes
    )
    if not updated:
        return jsonify({"success": False, "error": f"Incident #{incident_id} not found."}), 404

    return jsonify({
        "success": True,
        "message": f"Incident status updated to '{new_status.upper()}'.",
        "data": updated
    }), 200
