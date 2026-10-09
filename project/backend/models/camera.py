"""
CCTV Sense - Camera Data Model
Handles camera definitions, zones, status checks, and CRUD database operations.
"""

from typing import List, Dict, Optional, Any
from database.db import fetch_all, fetch_one, execute_query

class CameraModel:
    @staticmethod
    def get_all(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve all registered CCTV cameras with optional status filter."""
        query = "SELECT * FROM cameras"
        params = ()
        if status_filter:
            query += " WHERE status = ?"
            params = (status_filter.upper(),)
        query += " ORDER BY id ASC;"
        return fetch_all(query, params)

    @staticmethod
    def get_by_id(camera_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a camera by its unique identifier."""
        return fetch_one("SELECT * FROM cameras WHERE id = ?;", (camera_id,))

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        """Registers a new CCTV camera feed into the system."""
        query = """
            INSERT INTO cameras (id, name, location, zone_type, resolution, status, fps)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """
        params = (
            data["id"].strip().upper(),
            data["name"].strip(),
            data["location"].strip(),
            data.get("zone_type", "COMMON").upper(),
            data.get("resolution", "1080p"),
            data.get("status", "ACTIVE").upper(),
            int(data.get("fps", 30))
        )
        execute_query(query, params)
        return CameraModel.get_by_id(data["id"].strip().upper())

    @staticmethod
    def update(camera_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates camera parameters."""
        existing = CameraModel.get_by_id(camera_id)
        if not existing:
            return None
            
        query = """
            UPDATE cameras
            SET name = ?, location = ?, zone_type = ?, resolution = ?, status = ?, fps = ?
            WHERE id = ?;
        """
        params = (
            data.get("name", existing["name"]).strip(),
            data.get("location", existing["location"]).strip(),
            data.get("zone_type", existing["zone_type"]).upper(),
            data.get("resolution", existing["resolution"]),
            data.get("status", existing["status"]).upper(),
            int(data.get("fps", existing["fps"])),
            camera_id
        )
        execute_query(query, params)
        return CameraModel.get_by_id(camera_id)

    @staticmethod
    def delete(camera_id: str) -> bool:
        """Deletes a camera from database."""
        rows = execute_query("DELETE FROM cameras WHERE id = ?;", (camera_id,))
        return rows > 0
