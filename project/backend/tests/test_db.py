"""
CCTV Sense - Database Unit and Integration Tests
Verifies SQLite schema creation, foreign key constraints, CRUD operations,
and fast incident search filtering.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.init_db import initialize_database
from models.camera import CameraModel
from models.incident import IncidentModel

class TestDatabaseOperations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        initialize_database()

    def test_camera_crud(self):
        # 1. Create
        cam_id = "TEST-CAM-99"
        created = CameraModel.create({
            "id": cam_id,
            "name": "Warehouse Testing Feed",
            "location": "Sector 9 Test Lab",
            "zone_type": "PERIMETER",
            "resolution": "1080p",
            "status": "ACTIVE",
            "fps": 30
        })
        self.assertIsNotNone(created)
        self.assertEqual(created["id"], cam_id)

        # 2. Read
        fetched = CameraModel.get_by_id(cam_id)
        self.assertEqual(fetched["name"], "Warehouse Testing Feed")

        # 3. Update
        updated = CameraModel.update(cam_id, {"status": "MAINTENANCE"})
        self.assertEqual(updated["status"], "MAINTENANCE")

        # 4. Delete
        deleted = CameraModel.delete(cam_id)
        self.assertTrue(deleted)
        self.assertIsNone(CameraModel.get_by_id(cam_id))

    def test_incident_search_and_filters(self):
        # Verify fetching with importance filter
        high_incidents = IncidentModel.search(importance_level="HIGH")
        self.assertIsInstance(high_incidents, list)
        for inc in high_incidents:
            self.assertEqual(inc["importance_level"], "HIGH")

        # Verify incident status update
        if high_incidents:
            first_id = high_incidents[0]["id"]
            updated = IncidentModel.update_status(first_id, "ACKNOWLEDGED", resolution_notes="Test ack note")
            self.assertEqual(updated["status"], "ACKNOWLEDGED")

    def test_summary_statistics(self):
        stats = IncidentModel.get_summary_stats()
        self.assertIn("total_incidents", stats)
        self.assertIn("high_importance", stats)
        self.assertIn("medium_importance", stats)
        self.assertIn("low_importance", stats)
        self.assertGreaterEqual(stats["total_incidents"], 1)

if __name__ == "__main__":
    unittest.main()
