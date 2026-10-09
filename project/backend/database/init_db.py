"""
CCTV Sense - Database Initialization and Migration Script
Creates tables for cameras, incidents, alert logs, and seeds realistic initial data.
"""

import os
import sys
from datetime import datetime, timedelta

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.db import get_db, init_db_dir

SCHEMA_SQL = """
-- Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    zone_type TEXT NOT NULL, -- PERIMETER, RESTRICTED, ENTRANCE, PARKING, COMMON
    resolution TEXT DEFAULT '1080p',
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, MAINTENANCE
    fps INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents Table (Events detected by AI)
CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- INTRUSION, VIOLENCE, UNATTENDED_BAGGAGE, FALL_MEDICAL, LOITERING, CROWD_SURGE, ROUTINE_MOTION
    importance_level TEXT NOT NULL, -- HIGH, MEDIUM, LOW
    confidence_score REAL NOT NULL, -- 0.0 to 1.0
    description TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    snapshot_url TEXT,
    video_clip_url TEXT,
    status TEXT DEFAULT 'NEW', -- NEW, ACKNOWLEDGED, RESOLVED, FALSE_ALARM
    assigned_to TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras (id) ON DELETE CASCADE
);

-- Alert Logs Table
CREATE TABLE IF NOT EXISTS alert_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL,
    channel TEXT NOT NULL, -- DASHBOARD, AUDIO, WEBHOOK, EMAIL
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'DELIVERED',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents (id) ON DELETE CASCADE
);

-- Indexes for lightning-fast search on recorded footage/incidents
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_camera_id ON incidents (camera_id);
CREATE INDEX IF NOT EXISTS idx_incidents_importance ON incidents (importance_level);
CREATE INDEX IF NOT EXISTS idx_incidents_event_type ON incidents (event_type);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
"""

SAMPLE_CAMERAS = [
    ("CAM-01", "Main Entrance Gate", "Building A - North Gate", "ENTRANCE", "1080p", "ACTIVE", 30),
    ("CAM-02", "Perimeter Fence West", "Boundary Wall - Sector 4", "PERIMETER", "4K", "ACTIVE", 25),
    ("CAM-03", "Server Room Vault", "Building B - Basement Level 2", "RESTRICTED", "1080p", "ACTIVE", 30),
    ("CAM-04", "South Parking Lot", "Open Deck - Row 12", "PARKING", "1080p", "ACTIVE", 30),
    ("CAM-05", "Emergency Hallway", "Building A - Wing C", "COMMON", "1080p", "ACTIVE", 30),
    ("CAM-06", "Cafeteria Courtyard", "Central Plaza", "COMMON", "1080p", "ACTIVE", 30)
]

def generate_sample_incidents():
    """Generates a realistic set of high, medium, and low incidents spread across the last 48 hours."""
    now = datetime.now()
    return [
        (
            "CAM-02",
            "INTRUSION",
            "HIGH",
            0.96,
            "Perimeter breach detected: Person climbing west security fence during night curfew.",
            (now - timedelta(minutes=14)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/intrusion_cam02.jpg",
            "NEW",
            None
        ),
        (
            "CAM-03",
            "UNAUTHORIZED_ACCESS",
            "HIGH",
            0.94,
            "Critical Zone alert: Unscheduled person detected in restricted Server Vault after hours.",
            (now - timedelta(minutes=48)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/vault_cam03.jpg",
            "ACKNOWLEDGED",
            "Security Team Alpha dispatched"
        ),
        (
            "CAM-05",
            "FALL_MEDICAL",
            "HIGH",
            0.91,
            "Medical hazard: Person collapsed on floor in Emergency Hallway.",
            (now - timedelta(hours=2, minutes=10)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/fall_cam05.jpg",
            "RESOLVED",
            "Campus first aid assisted visitor to clinic"
        ),
        (
            "CAM-01",
            "UNATTENDED_BAGGAGE",
            "MEDIUM",
            0.87,
            "Unattended backpack left near Main Entrance turnstiles for > 8 minutes.",
            (now - timedelta(hours=3, minutes=35)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/bag_cam01.jpg",
            "ACKNOWLEDGED",
            "Staff alerted owner returning from cafe"
        ),
        (
            "CAM-04",
            "LOITERING",
            "MEDIUM",
            0.82,
            "Suspicious loitering: Two individuals lingering near parked vehicles in dark zone for 15+ minutes.",
            (now - timedelta(hours=5, minutes=15)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/loitering_cam04.jpg",
            "NEW",
            None
        ),
        (
            "CAM-06",
            "CROWD_SURGE",
            "MEDIUM",
            0.79,
            "Unusual dense crowd clustering observed in Cafeteria Courtyard corridor.",
            (now - timedelta(hours=8, minutes=20)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/crowd_cam06.jpg",
            "RESOLVED",
            "Routine lunch rush cleared naturally"
        ),
        (
            "CAM-01",
            "ROUTINE_MOTION",
            "LOW",
            0.98,
            "Authorized delivery personnel scanned badge at Entrance turnstiles.",
            (now - timedelta(hours=11, minutes=5)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/routine_cam01.jpg",
            "RESOLVED",
            "Routine clearance"
        ),
        (
            "CAM-04",
            "ROUTINE_MOTION",
            "LOW",
            0.95,
            "Vehicle entering South Parking Lot through standard barrier gate.",
            (now - timedelta(hours=14, minutes=40)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/car_cam04.jpg",
            "RESOLVED",
            "Standard transit"
        ),
        (
            "CAM-02",
            "ANIMAL_MOTION",
            "LOW",
            0.88,
            "Stray cat crossing perimeter lawn. Filtered from high alert priority.",
            (now - timedelta(hours=18, minutes=12)).strftime("%Y-%m-%d %H:%M:%S"),
            "/assets/snapshots/cat_cam02.jpg",
            "RESOLVED",
            "Harmless wildlife motion - suppressed"
        )
    ]

def initialize_database():
    """Initializes tables and seeds initial data."""
    init_db_dir()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.executescript(SCHEMA_SQL)
        
        # Check if cameras already exist
        cursor.execute("SELECT COUNT(*) FROM cameras;")
        cam_count = cursor.fetchone()[0]
        if cam_count == 0:
            cursor.executemany(
                "INSERT INTO cameras (id, name, location, zone_type, resolution, status, fps) VALUES (?, ?, ?, ?, ?, ?, ?);",
                SAMPLE_CAMERAS
            )
            print(f"[CCTV Sense DB] Seeded {len(SAMPLE_CAMERAS)} CCTV cameras.")
        
        # Check if incidents already exist
        cursor.execute("SELECT COUNT(*) FROM incidents;")
        incident_count = cursor.fetchone()[0]
        if incident_count == 0:
            incidents = generate_sample_incidents()
            for inc in incidents:
                cursor.execute(
                    """
                    INSERT INTO incidents 
                    (camera_id, event_type, importance_level, confidence_score, description, timestamp, snapshot_url, status, resolution_notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    inc
                )
            print(f"[CCTV Sense DB] Seeded {len(incidents)} realistic surveillance incidents.")
            
    print("[CCTV Sense DB] Database initialized successfully.")

if __name__ == "__main__":
    initialize_database()
