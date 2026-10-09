"""
CCTV Sense - Machine Learning Pipeline Tests
Verifies dataset generation, training stability, inference accuracy,
and threat triage classification logic.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.dataset import get_surveillance_dataset, FEATURE_NAMES
from ml.predict import classify_event_importance

class TestMachineLearningPipeline(unittest.TestCase):
    def test_dataset_generation(self):
        X, y, records = get_surveillance_dataset(num_samples=320)
        self.assertEqual(len(X), 320)
        self.assertEqual(len(y), 320)
        self.assertEqual(len(X[0]), len(FEATURE_NAMES))
        self.assertIn("HIGH", y)
        self.assertIn("MEDIUM", y)
        self.assertIn("LOW", y)

    def test_high_priority_intrusion(self):
        intrusion_features = {
            "zone_type": "PERIMETER",
            "tripwire_crossed": True,
            "is_night_curfew": True,
            "motion_intensity": 0.92
        }
        res = classify_event_importance(intrusion_features)
        self.assertEqual(res["importance_level"], "HIGH")
        self.assertGreaterEqual(res["confidence_score"], 0.70)
        self.assertTrue(any("tripwire" in f.lower() or "perimeter" in f.lower() for f in res["key_factors"]))

    def test_routine_motion_filtering(self):
        # PPT Slide 3: Fewer unnecessary alerts (harmless daytime movement)
        routine_features = {
            "zone_type": "COMMON",
            "motion_intensity": 0.20,
            "is_night_curfew": False,
            "event_duration_sec": 10.0,
            "detected_person_count": 1
        }
        res = classify_event_importance(routine_features)
        self.assertEqual(res["importance_level"], "LOW")
        self.assertTrue(any("routine" in f.lower() or "normal" in f.lower() for f in res["key_factors"]))

    def test_unattended_baggage_medium_priority(self):
        bag_features = {
            "zone_type": "ENTRANCE",
            "stationary_object_duration_sec": 260.0,
            "detected_person_count": 0
        }
        res = classify_event_importance(bag_features)
        self.assertEqual(res["importance_level"], "MEDIUM")
        self.assertTrue(any("unattended" in f.lower() or "abandoned" in f.lower() for f in res["key_factors"]))

if __name__ == "__main__":
    unittest.main()
