"""
CCTV Sense - Surveillance Event Prediction & Inference Service
Loads the trained ML model pipeline and provides real-time event importance classification,
confidence scoring, and explainable incident triage for security staff.
"""

import os
import sys
import pickle
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.dataset import FEATURE_NAMES, ZONE_RISK_MAP

MODEL_PATH = os.path.join(os.path.dirname(__file__), "cctv_sense_model.pkl")

# Cached model instance
_MODEL_CACHE = None

def load_or_train_model():
    """Loads the serialized model artifact or executes training if not found."""
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    if not os.path.exists(MODEL_PATH):
        print(f"[ML Inference] Model artifact not found at {MODEL_PATH}. Executing initial training...")
        from ml.train import train_and_evaluate_model
        train_and_evaluate_model()

    with open(MODEL_PATH, "rb") as f:
        _MODEL_CACHE = pickle.load(f)
        
    return _MODEL_CACHE

def extract_feature_vector(raw_input: Dict[str, Any]) -> List[float]:
    """
    Normalizes incoming CCTV analytics raw features into a numerical vector matching FEATURE_NAMES.
    Accepts raw camera feeds parameters or synthetic sensor inputs.
    """
    # Zone risk score calculation
    zone_type = raw_input.get("zone_type", "COMMON").upper()
    zone_risk = raw_input.get("zone_risk_score", ZONE_RISK_MAP.get(zone_type, 1.0))
    
    stationary_duration = float(raw_input.get("stationary_object_duration_sec", 0.0))
    event_duration = float(raw_input.get("event_duration_sec", max(15.0, stationary_duration)))

    vector = [
        float(raw_input.get("motion_intensity", 0.25 if stationary_duration > 0 else 0.3)),
        float(zone_risk),
        1.0 if raw_input.get("is_night_curfew", False) else 0.0,
        float(event_duration),
        float(raw_input.get("detected_person_count", 0 if stationary_duration > 0 else 1)),
        float(raw_input.get("velocity_variance", 0.05 if stationary_duration > 0 else 0.2)),
        float(raw_input.get("aspect_ratio_drop", 0.0)),
        1.0 if raw_input.get("tripwire_crossed", False) else 0.0,
        float(stationary_duration)
    ]
    return vector

def classify_event_importance(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Classifies a surveillance event and returns:
    - importance_level: 'HIGH' | 'MEDIUM' | 'LOW'
    - confidence_score: float (0.0 to 1.0)
    - probabilities: dict of class probabilities
    - triage_recommendation: actionable instruction for security guards
    - key_factors: list of reasons why this alert level was assigned
    """
    model_data = load_or_train_model()
    model = model_data["model"]
    
    feature_vector = extract_feature_vector(input_data)
    feat_map = dict(zip(FEATURE_NAMES, feature_vector))
    
    # Predict
    if hasattr(model, "predict_proba"):
        probas_raw = model.predict_proba([feature_vector])
        if isinstance(probas_raw[0], dict):
            probas = probas_raw[0]
        else:
            # Scikit-learn probability array
            classes = getattr(model, "classes_", ["HIGH", "MEDIUM", "LOW"])
            probas = {cls: round(float(prob), 4) for cls, prob in zip(classes, probas_raw[0])}
    else:
        # Fallback uniform
        probas = {"HIGH": 0.33, "MEDIUM": 0.33, "LOW": 0.34}

    pred_level = max(probas.keys(), key=lambda k: probas[k])
    confidence = probas[pred_level]

    # Generate Explainable Key Factors
    key_factors = []
    if feat_map["tripwire_crossed"] > 0.5:
        key_factors.append("Perimeter tripwire breach detected")
    if feat_map["zone_risk_score"] >= 4.0:
        key_factors.append(f"Occurred in high-criticality zone (Risk Level {feat_map['zone_risk_score']})")
    if feat_map["aspect_ratio_drop"] > 0.5:
        key_factors.append("Sudden aspect-ratio collapse indicative of medical fall or injury")
    if feat_map["stationary_object_duration_sec"] > 120.0:
        key_factors.append(f"Unattended static object abandoned for {int(feat_map['stationary_object_duration_sec'])}s")
    if feat_map["is_night_curfew"] > 0.5:
        key_factors.append("Activity detected during restricted night curfew hours")
    if feat_map["velocity_variance"] > 0.6:
        key_factors.append("Erratic rapid velocity signatures detected (potential altercation)")
    if feat_map["detected_person_count"] > 8:
        key_factors.append(f"High crowd density ({int(feat_map['detected_person_count'])} individuals)")
    if not key_factors:
        key_factors.append("Normal routine motion patterns in standard circulation zone")

    # Actionable Recommendation
    if pred_level == "HIGH":
        action = "CRITICAL: Trigger siren alert, notify security control desk immediately, and dispatch field response team."
    elif pred_level == "MEDIUM":
        action = "ATTENTION: Flag camera feed on main monitor. Monitor stream for escalation over the next 3-5 minutes."
    else:
        action = "ROUTINE: Routine activity recorded in audit trail. Suppressed from high-priority alert chime to prevent alarm fatigue."

    return {
        "importance_level": pred_level,
        "confidence_score": round(confidence, 3),
        "probabilities": probas,
        "triage_recommendation": action,
        "key_factors": key_factors,
        "features_analyzed": feat_map
    }

if __name__ == "__main__":
    # Test sample high priority intrusion
    test_sample = {
        "zone_type": "PERIMETER",
        "tripwire_crossed": True,
        "is_night_curfew": True,
        "motion_intensity": 0.85
    }
    result = classify_event_importance(test_sample)
    print("\n[ML Test Inference Result]:")
    print(f"Predicted Importance: {result['importance_level']} (Confidence: {result['confidence_score']})")
    print(f"Recommendation: {result['triage_recommendation']}")
    print(f"Factors: {result['key_factors']}")
