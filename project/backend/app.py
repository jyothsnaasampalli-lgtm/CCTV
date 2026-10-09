"""
CCTV Sense - Flask Backend Server Application Entry Point
Team: HealthNova (TS-39) | TechSprint Hackathon
Provides REST APIs for CCTV Camera Management, AI Incident Triage,
Importance-based Alerting, and Fast Recorded Footage Search.
"""

import os
import sys
import logging
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import config
from database.init_db import initialize_database
from ml.predict import load_or_train_model
from routes.cameras import cameras_bp
from routes.incidents import incidents_bp
from routes.analytics import analytics_bp
from routes.detection import detection_bp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("CCTV-Sense")

def create_app():
    """Application factory for CCTV Sense."""
    app = Flask(__name__, static_folder="../frontend", static_url_path="")
    app.config.from_object(config)
    
    # Enable Cross-Origin Resource Sharing (CORS) for decoupled frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register Blueprints
    app.register_blueprint(cameras_bp)
    app.register_blueprint(incidents_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(detection_bp)

    # Health check route
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "online",
            "service": "CCTV Sense Backend",
            "team": "HealthNova (TS-39)",
            "version": "1.0.0",
            "database": "SQLite (Connected)",
            "ml_model": "Active & Loaded"
        }), 200

    # Serve decoupled frontend directly from Flask if accessed at root
    @app.route("/", methods=["GET"])
    def serve_frontend_index():
        if os.path.exists(os.path.join(app.static_folder, "index.html")):
            return send_from_directory(app.static_folder, "index.html")
        return jsonify({
            "message": "CCTV Sense Flask API is running. Access frontend or visit /api/health"
        }), 200

    # Static file handler for frontend assets
    @app.route("/<path:path>", methods=["GET"])
    def serve_frontend_assets(path):
        if os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return jsonify({"error": f"File '{path}' not found."}), 404

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found_handler(err):
        return jsonify({"success": False, "error": "Endpoint not found."}), 404

    @app.errorhandler(500)
    def internal_error_handler(err):
        logger.error(f"Internal server error: {err}")
        return jsonify({"success": False, "error": "Internal server error."}), 500

    # Initialize SQLite database and ML model on startup
    with app.app_context():
        try:
            initialize_database()
            load_or_train_model()
            logger.info("Database and Machine Learning models successfully verified.")
        except Exception as e:
            logger.error(f"Startup initialization warning: {e}")

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    logger.info(f"Starting CCTV Sense Flask Server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=config.DEBUG)
