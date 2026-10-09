"""
CCTV Sense - Flask REST API Integration Tests
Tests HTTP endpoints, JSON responses, error codes, and request workflows.
"""

import os
import sys
import unittest
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app

class TestApiEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.flask_app = create_app()
        cls.client = cls.flask_app.test_client()

    def test_health_endpoint(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["service"], "CCTV Sense Backend")

    def test_cameras_endpoint(self):
        res = self.client.get("/api/cameras")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(len(data["data"]), 1)

    def test_incidents_search_endpoint(self):
        res = self.client.get("/api/incidents?importance=HIGH")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        for inc in data["data"]:
            self.assertEqual(inc["importance_level"], "HIGH")

    def test_ml_classify_endpoint(self):
        payload = {
            "zone_type": "RESTRICTED",
            "motion_intensity": 0.85,
            "is_night_curfew": True
        }
        res = self.client.post(
            "/api/detection/classify",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn(data["data"]["importance_level"], ["HIGH", "MEDIUM", "LOW"])

    def test_analytics_summary_endpoint(self):
        res = self.client.get("/api/analytics/summary")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("total_incidents", data["data"])

if __name__ == "__main__":
    unittest.main()
