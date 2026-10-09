"""
CCTV Sense - Video Analytics and Feed Processing Service
Processes incoming camera streams or uploaded footage clips, generates
bounding boxes for detected objects, extracts motion vectors, and triggers
the ML importance classifier.
"""

import random
from typing import Dict, Any, List
from ml.predict import classify_event_importance
from models.incident import IncidentModel
from services.notification_service import NotificationService

class VideoService:
    @staticmethod
    def analyze_camera_frame(camera: Dict[str, Any], event_scenario: str = "AUTO") -> Dict[str, Any]:
        """
        Simulates frame-level object detection and feature extraction for a camera stream.
        Generates bounding boxes and invokes ML importance triage.
        """
        cam_id = camera["id"]
        zone_type = camera.get("zone_type", "COMMON")

        # Map scenario or synthesize based on zone
        if event_scenario == "AUTO":
            # 70% normal, 20% medium, 10% high
            r = random.random()
            if r > 0.88:
                scenario = "INTRUSION" if zone_type in ("PERIMETER", "RESTRICTED") else "FALL_MEDICAL"
            elif r > 0.65:
                scenario = "LOITERING" if zone_type == "PARKING" else "UNATTENDED_BAGGAGE"
            else:
                scenario = "ROUTINE_MOTION"
        else:
            scenario = event_scenario

        # Construct optical flow and vision bounding boxes based on scenario
        bounding_boxes = []
        raw_features = {
            "zone_type": zone_type,
            "event_type": scenario
        }

        if scenario == "INTRUSION":
            raw_features.update({
                "motion_intensity": 0.89,
                "is_night_curfew": True,
                "tripwire_crossed": True,
                "velocity_variance": 0.72,
                "detected_person_count": 1,
                "event_duration_sec": 45.0
            })
            bounding_boxes.append({
                "label": "Person (Intruder)",
                "confidence": 0.94,
                "box": [120, 180, 85, 210], # [x, y, w, h]
                "alert": True
            })

        elif scenario == "FALL_MEDICAL":
            raw_features.update({
                "motion_intensity": 0.76,
                "aspect_ratio_drop": 0.88,
                "velocity_variance": 0.85,
                "detected_person_count": 1,
                "event_duration_sec": 95.0
            })
            bounding_boxes.append({
                "label": "Person (Collapsed / Fall)",
                "confidence": 0.91,
                "box": [240, 310, 195, 75], # Horizontal aspect ratio
                "alert": True
            })

        elif scenario == "UNATTENDED_BAGGAGE":
            raw_features.update({
                "motion_intensity": 0.22,
                "stationary_object_duration_sec": 280.0,
                "detected_person_count": 0,
                "event_duration_sec": 300.0
            })
            bounding_boxes.append({
                "label": "Unattended Backpack",
                "confidence": 0.89,
                "box": [380, 260, 60, 55],
                "alert": True
            })

        elif scenario == "LOITERING":
            raw_features.update({
                "motion_intensity": 0.42,
                "event_duration_sec": 320.0,
                "detected_person_count": 2,
                "velocity_variance": 0.28
            })
            bounding_boxes.append({
                "label": "Person (Loitering)",
                "confidence": 0.86,
                "box": [160, 140, 70, 180],
                "alert": True
            })
            bounding_boxes.append({
                "label": "Person (Loitering)",
                "confidence": 0.84,
                "box": [250, 145, 65, 175],
                "alert": True
            })

        else: # ROUTINE_MOTION
            raw_features.update({
                "motion_intensity": 0.28,
                "event_duration_sec": 12.0,
                "detected_person_count": 1,
                "velocity_variance": 0.12
            })
            bounding_boxes.append({
                "label": "Authorized Pedestrian",
                "confidence": 0.96,
                "box": [300, 150, 65, 175],
                "alert": False
            })

        # Run ML inference
        classification = classify_event_importance(raw_features)

        # Build Incident Record if MEDIUM or HIGH
        incident_id = None
        if classification["importance_level"] in ("HIGH", "MEDIUM"):
            desc = f"{scenario.replace('_', ' ').title()} flagged on {camera['name']}: {', '.join(classification['key_factors'])}."
            new_inc = IncidentModel.create({
                "camera_id": cam_id,
                "event_type": scenario,
                "importance_level": classification["importance_level"],
                "confidence_score": classification["confidence_score"],
                "description": desc,
                "snapshot_url": f"/assets/snapshots/{scenario.lower()}_{cam_id.lower()}.jpg",
                "status": "NEW"
            })
            incident_id = new_inc["id"]
            # Dispatch notifications
            NotificationService.dispatch_alert(new_inc)

        return {
            "camera_id": cam_id,
            "camera_name": camera["name"],
            "event_scenario": scenario,
            "bounding_boxes": bounding_boxes,
            "ml_classification": classification,
            "created_incident_id": incident_id
        }
