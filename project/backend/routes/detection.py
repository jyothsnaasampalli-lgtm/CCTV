"""
CCTV Sense - AI Detection and Machine Learning Inference REST API Routes
Directly powers PPT Slide 4 'AI checks the footage' & 'Identifies important events'.
"""

from flask import Blueprint, request, jsonify
from ml.predict import classify_event_importance
from services.video_service import VideoService
from models.camera import CameraModel

detection_bp = Blueprint("detection", __name__, url_prefix="/api/detection")

@detection_bp.route("/classify", methods=["POST"])
def classify_features():
    """
    Direct ML model inference endpoint.
    Accepts surveillance feature inputs and returns predicted importance level (HIGH, MEDIUM, LOW),
    confidence score, and explainable triage factors.
    """
    data = request.get_json() or {}
    try:
        result = classify_event_importance(data)
        return jsonify({
            "success": True,
            "data": result
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@detection_bp.route("/simulate-frame", methods=["POST"])
def simulate_frame_detection():
    """
    Simulates real-time CCTV frame analysis on a camera feed.
    Extracts vision bounding boxes and runs the ML triage model.
    """
    data = request.get_json() or {}
    camera_id = data.get("camera_id", "CAM-01")
    scenario = data.get("scenario", "AUTO")

    camera = CameraModel.get_by_id(camera_id)
    if not camera:
        return jsonify({"success": False, "error": f"Camera '{camera_id}' not found."}), 404

    try:
        analysis = VideoService.analyze_camera_frame(camera, event_scenario=scenario)
        return jsonify({
            "success": True,
            "data": analysis
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
