"""
CCTV Sense - Incident Data Model
Powers the core 'Faster Incident Search' requirement from the PPT.
Enables fast parameterized queries across recorded CCTV footage, severity triage,
incident verification workflows, and summary metrics.
"""

from typing import List, Dict, Optional, Any
from database.db import fetch_all, fetch_one, execute_query, execute_insert

class IncidentModel:
    @staticmethod
    def search(
        camera_id: Optional[str] = None,
        importance_level: Optional[str] = None,
        event_type: Optional[str] = None,
        status: Optional[str] = None,
        search_query: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Fast multi-criteria search across recorded incidents.
        Directly fulfills PPT Slide 4 'Search recorded incidents' requirement.
        """
        sql = """
            SELECT i.*, c.name AS camera_name, c.location AS camera_location, c.zone_type
            FROM incidents i
            JOIN cameras c ON i.camera_id = c.id
            WHERE 1=1
        """
        params = []

        if camera_id:
            sql += " AND i.camera_id = ?"
            params.append(camera_id.upper())

        if importance_level:
            sql += " AND i.importance_level = ?"
            params.append(importance_level.upper())

        if event_type:
            sql += " AND i.event_type = ?"
            params.append(event_type.upper())

        if status:
            sql += " AND i.status = ?"
            params.append(status.upper())

        if search_query:
            sql += " AND (i.description LIKE ? OR i.event_type LIKE ? OR c.name LIKE ? OR c.location LIKE ?)"
            wildcard = f"%{search_query.strip()}%"
            params.extend([wildcard, wildcard, wildcard, wildcard])

        if date_from:
            sql += " AND i.timestamp >= ?"
            params.append(date_from)

        if date_to:
            sql += " AND i.timestamp <= ?"
            params.append(date_to)

        sql += " ORDER BY i.timestamp DESC LIMIT ? OFFSET ?;"
        params.extend([limit, offset])

        return fetch_all(sql, tuple(params))

    @staticmethod
    def get_by_id(incident_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves a single incident by ID with camera details."""
        sql = """
            SELECT i.*, c.name AS camera_name, c.location AS camera_location, c.zone_type
            FROM incidents i
            JOIN cameras c ON i.camera_id = c.id
            WHERE i.id = ?;
        """
        return fetch_one(sql, (incident_id,))

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        """Records a new detected incident into database."""
        sql = """
            INSERT INTO incidents (
                camera_id, event_type, importance_level, confidence_score,
                description, timestamp, snapshot_url, video_clip_url,
                status, assigned_to, resolution_notes
            ) VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?, ?);
        """
        params = (
            data["camera_id"].upper(),
            data["event_type"].upper(),
            data["importance_level"].upper(),
            float(data.get("confidence_score", 0.90)),
            data["description"],
            data.get("timestamp"),
            data.get("snapshot_url"),
            data.get("video_clip_url"),
            data.get("status", "NEW").upper(),
            data.get("assigned_to"),
            data.get("resolution_notes")
        )
        new_id = execute_insert(sql, params)
        return IncidentModel.get_by_id(new_id)

    @staticmethod
    def update_status(
        incident_id: int, 
        status: str, 
        assigned_to: Optional[str] = None, 
        resolution_notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Updates the status (ACKNOWLEDGED, RESOLVED, FALSE_ALARM) of an incident."""
        sql = """
            UPDATE incidents
            SET status = ?,
                assigned_to = COALESCE(?, assigned_to),
                resolution_notes = COALESCE(?, resolution_notes)
            WHERE id = ?;
        """
        execute_query(sql, (status.upper(), assigned_to, resolution_notes, incident_id))
        return IncidentModel.get_by_id(incident_id)

    @staticmethod
    def get_summary_stats() -> Dict[str, Any]:
        """Calculates security dashboard summary counts and distribution."""
        total = fetch_one("SELECT COUNT(*) AS count FROM incidents;")["count"]
        high = fetch_one("SELECT COUNT(*) AS count FROM incidents WHERE importance_level = 'HIGH';")["count"]
        medium = fetch_one("SELECT COUNT(*) AS count FROM incidents WHERE importance_level = 'MEDIUM';")["count"]
        low = fetch_one("SELECT COUNT(*) AS count FROM incidents WHERE importance_level = 'LOW';")["count"]
        pending = fetch_one("SELECT COUNT(*) AS count FROM incidents WHERE status IN ('NEW', 'ACKNOWLEDGED');")["count"]
        resolved = fetch_one("SELECT COUNT(*) AS count FROM incidents WHERE status = 'RESOLVED';")["count"]

        # Counts by event type
        by_type_rows = fetch_all("""
            SELECT event_type, COUNT(*) AS count
            FROM incidents
            GROUP BY event_type
            ORDER BY count DESC;
        """)
        
        # Camera activity breakdown
        by_camera_rows = fetch_all("""
            SELECT c.id, c.name, COUNT(i.id) as incident_count
            FROM cameras c
            LEFT JOIN incidents i ON c.id = i.camera_id
            GROUP BY c.id, c.name
            ORDER BY incident_count DESC;
        """)

        return {
            "total_incidents": total,
            "high_importance": high,
            "medium_importance": medium,
            "low_importance": low,
            "pending_review": pending,
            "resolved": resolved,
            "by_event_type": {r["event_type"]: r["count"] for r in by_type_rows},
            "by_camera": by_camera_rows
        }
