"""
CCTV Sense - Camera Management REST API Routes
Endpoints for retrieving, registering, updating, and removing surveillance cameras.
"""

from flask import Blueprint, request, jsonify
from models.camera import CameraModel

cameras_bp = Blueprint("cameras", __name__, url_prefix="/api/cameras")

@cameras_bp.route("", methods=["GET"])
def list_cameras():
    """Retrieve all surveillance cameras, optionally filtered by status."""
    status = request.args.get("status")
    cameras = CameraModel.get_all(status_filter=status)
    return jsonify({
        "success": True,
        "count": len(cameras),
        "data": cameras
    }), 200

@cameras_bp.route("/<string:camera_id>", methods=["GET"])
def get_camera(camera_id):
    """Retrieve specific camera details."""
    cam = CameraModel.get_by_id(camera_id)
    if not cam:
        return jsonify({"success": False, "error": f"Camera '{camera_id}' not found."}), 404
    return jsonify({"success": True, "data": cam}), 200

@cameras_bp.route("", methods=["POST"])
def create_camera():
    """Register a new surveillance camera stream."""
    data = request.get_json() or {}
    
    # Input validation
    required = ["id", "name", "location"]
    for req in required:
        if not data.get(req) or not str(data[req]).strip():
            return jsonify({"success": False, "error": f"Field '{req}' is required."}), 400

    cam_id = data["id"].strip().upper()
    existing = CameraModel.get_by_id(cam_id)
    if existing:
        return jsonify({"success": False, "error": f"Camera with ID '{cam_id}' already exists."}), 409

    try:
        new_cam = CameraModel.create(data)
        return jsonify({"success": True, "message": "Camera registered successfully.", "data": new_cam}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cameras_bp.route("/<string:camera_id>", methods=["PUT"])
def update_camera(camera_id):
    """Update camera parameters."""
    data = request.get_json() or {}
    updated = CameraModel.update(camera_id, data)
    if not updated:
        return jsonify({"success": False, "error": f"Camera '{camera_id}' not found."}), 404
    return jsonify({"success": True, "message": "Camera updated.", "data": updated}), 200

@cameras_bp.route("/<string:camera_id>", methods=["DELETE"])
def delete_camera(camera_id):
    """Delete a camera from the system."""
    deleted = CameraModel.delete(camera_id)
    if not deleted:
        return jsonify({"success": False, "error": f"Camera '{camera_id}' not found."}), 404
    return jsonify({"success": True, "message": f"Camera '{camera_id}' removed."}), 200
