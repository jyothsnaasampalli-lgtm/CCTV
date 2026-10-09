"""
CCTV Sense - Surveillance Event Dataset Generator
Generates realistic surveillance event feature datasets for training and evaluation.
Features reflect real CCTV analytics: optical flow motion intensity, zone risk,
time-of-day curfew risk, duration, object counts, velocity variance, tripwire breach,
and stationary baggage duration.
"""

import random
from typing import List, Dict, Any, Tuple

# Zone risk mapping
ZONE_RISK_MAP = {
    "RESTRICTED": 5.0,
    "PERIMETER": 4.0,
    "PARKING": 3.0,
    "ENTRANCE": 2.0,
    "COMMON": 1.0
}

EVENT_TYPES = [
    "INTRUSION",
    "UNAUTHORIZED_ACCESS",
    "FALL_MEDICAL",
    "UNATTENDED_BAGGAGE",
    "LOITERING",
    "CROWD_SURGE",
    "ROUTINE_MOTION",
    "ANIMAL_MOTION"
]

IMPORTANCE_LEVELS = ["HIGH", "MEDIUM", "LOW"]

FEATURE_NAMES = [
    "motion_intensity",               # 0.0 - 1.0 (optical flow magnitude)
    "zone_risk_score",               # 1.0 - 5.0 (Restricted vault to common area)
    "is_night_curfew",               # 0 or 1 (1 if between 22:00 and 06:00)
    "event_duration_sec",            # 1.0 - 600.0 seconds
    "detected_person_count",         # 0 - 20 persons
    "velocity_variance",             # 0.0 - 1.0 (erratic motion like fights/falls)
    "aspect_ratio_drop",             # 0.0 - 1.0 (standing person falling flat)
    "tripwire_crossed",              # 0 or 1 (boundary perimeter breached)
    "stationary_object_duration_sec" # 0.0 - 900.0 (bag left behind)
]

def generate_surveillance_record(event_type: str) -> Dict[str, Any]:
    """Generates a realistic surveillance feature record based on event type."""
    if event_type in ("INTRUSION", "UNAUTHORIZED_ACCESS"):
        importance = "HIGH"
        motion_intensity = round(random.uniform(0.60, 0.98), 3)
        zone_risk = random.choice([4.0, 5.0])
        is_curfew = random.choice([0, 1, 1])  # 66% night intrusions
        duration = round(random.uniform(15.0, 180.0), 1)
        persons = random.randint(1, 3)
        velocity_var = round(random.uniform(0.30, 0.85), 3)
        aspect_ratio_drop = round(random.uniform(0.0, 0.25), 3)
        # In unauthorized access, tripwire may or may not be crossed
        tripwire = 1 if event_type == "INTRUSION" else random.choice([0, 1])
        stationary_obj = 0.0

    elif event_type == "FALL_MEDICAL":
        importance = "HIGH"
        motion_intensity = round(random.uniform(0.50, 0.90), 3)
        zone_risk = random.choice([1.0, 2.0, 3.0, 4.0])
        is_curfew = random.choice([0, 1])
        duration = round(random.uniform(30.0, 300.0), 1)
        persons = random.randint(1, 2)
        velocity_var = round(random.uniform(0.60, 0.95), 3) # Sudden drop/fall jerk
        aspect_ratio_drop = round(random.uniform(0.70, 0.98), 3) # Key signature: height shrinks drastically
        tripwire = 0
        stationary_obj = 0.0

    elif event_type == "UNATTENDED_BAGGAGE":
        importance = "MEDIUM"
        motion_intensity = round(random.uniform(0.15, 0.45), 3)
        zone_risk = random.choice([2.0, 3.0, 4.0])
        is_curfew = random.choice([0, 0, 1])
        duration = round(random.uniform(180.0, 720.0), 1)
        persons = 0
        velocity_var = round(random.uniform(0.0, 0.15), 3)
        aspect_ratio_drop = 0.0
        tripwire = 0
        stationary_obj = round(random.uniform(180.0, 900.0), 1)

    elif event_type == "LOITERING":
        importance = "MEDIUM"
        motion_intensity = round(random.uniform(0.30, 0.60), 3)
        zone_risk = random.choice([2.0, 3.0, 4.0])
        is_curfew = random.choice([0, 1])
        duration = round(random.uniform(240.0, 800.0), 1) # Lingering in same spot
        persons = random.randint(1, 4)
        velocity_var = round(random.uniform(0.20, 0.45), 3)
        aspect_ratio_drop = round(random.uniform(0.0, 0.15), 3)
        tripwire = 0
        stationary_obj = 0.0

    elif event_type == "CROWD_SURGE":
        importance = "MEDIUM"
        motion_intensity = round(random.uniform(0.70, 0.95), 3)
        zone_risk = random.choice([1.0, 2.0, 3.0])
        is_curfew = 0
        duration = round(random.uniform(60.0, 360.0), 1)
        persons = random.randint(8, 25)
        velocity_var = round(random.uniform(0.50, 0.80), 3)
        aspect_ratio_drop = round(random.uniform(0.0, 0.20), 3)
        tripwire = 0
        stationary_obj = 0.0

    elif event_type == "ROUTINE_MOTION":
        importance = "LOW"
        motion_intensity = round(random.uniform(0.10, 0.50), 3)
        zone_risk = random.choice([1.0, 2.0, 3.0])
        is_curfew = 0
        duration = round(random.uniform(5.0, 45.0), 1)
        persons = random.randint(1, 3)
        velocity_var = round(random.uniform(0.05, 0.25), 3)
        aspect_ratio_drop = round(random.uniform(0.0, 0.10), 3)
        tripwire = 0
        stationary_obj = 0.0

    else: # ANIMAL_MOTION
        importance = "LOW"
        motion_intensity = round(random.uniform(0.10, 0.45), 3)
        zone_risk = random.choice([1.0, 3.0, 4.0])
        is_curfew = random.choice([0, 1])
        duration = round(random.uniform(3.0, 30.0), 1)
        persons = 0
        velocity_var = round(random.uniform(0.10, 0.40), 3)
        aspect_ratio_drop = 0.0
        tripwire = 0
        stationary_obj = 0.0

    return {
        "motion_intensity": motion_intensity,
        "zone_risk_score": zone_risk,
        "is_night_curfew": is_curfew,
        "event_duration_sec": duration,
        "detected_person_count": persons,
        "velocity_variance": velocity_var,
        "aspect_ratio_drop": aspect_ratio_drop,
        "tripwire_crossed": tripwire,
        "stationary_object_duration_sec": stationary_obj,
        "event_type": event_type,
        "importance_level": importance
    }

def get_surveillance_dataset(num_samples: int = 1200) -> Tuple[List[List[float]], List[str], List[Dict[str, Any]]]:
    """
    Generates balanced training and validation dataset for CCTV Sense importance classification.
    Returns:
        X (list of feature vectors),
        y (list of ground-truth importance labels: HIGH, MEDIUM, LOW),
        records (list of full dictionaries with metadata)
    """
    random.seed(42)
    records = []
    
    samples_per_type = num_samples // len(EVENT_TYPES)
    for et in EVENT_TYPES:
        for _ in range(samples_per_type):
            records.append(generate_surveillance_record(et))
            
    # Shuffle dataset
    random.shuffle(records)
    
    X = []
    y = []
    for r in records:
        features = [r[col] for col in FEATURE_NAMES]
        X.append(features)
        y.append(r["importance_level"])
        
    return X, y, records

if __name__ == "__main__":
    X, y, records = get_surveillance_dataset(500)
    print(f"[Dataset] Generated {len(X)} records across {len(FEATURE_NAMES)} features.")
    from collections import Counter
    print("[Dataset] Class Distribution:", Counter(y))
