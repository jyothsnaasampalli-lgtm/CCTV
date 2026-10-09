# CCTV Sense: AI-Powered CCTV Monitoring System

> **Team**: HealthNova (TS-39)  
> **Institution**: St. Peter's Engineering College, Department of EEE  
> **Team Leader**: JYOTHSNA  
> **Team Members**: Khaja Ghayaz, Rushanth  
> **Event**: TechSprint Hackathon  

---

## 1. Project Concept & Objectives (Based on PPT)

### **The Problem**
Watching every CCTV camera all the time is difficult, leading to surveillance fatigue:
* **Many camera feeds + limited security staff attention = critical incidents missed**.
* **Traditional motion detection** creates endless false alarms (moving tree branches, shadows, pets, routine traffic).
* **Manual footage review** is painfully slow and tedious when searching for past events.

### **The Solution: CCTV Sense**
* **Event Importance Triage**: AI analyses camera footage and categorizes events into **HIGH**, **MEDIUM**, and **LOW** priority levels.
* **Fewer Unnecessary Alerts**: Filters out harmless routine motion, suppressing alarm fatigue.
* **Faster Incident Search**: Instant keyword, category, camera, and date-range filtering across recorded footage in milliseconds.
* **Live Interactive Dashboard**: Multi-camera grid, real-time alert banners, audio chime notification, and incident review workflows.

---

## 2. Directory Structure

```text
project/
├── frontend/
│   ├── index.html              # HTML5 responsive surveillance dashboard
│   ├── css/
│   │   └── style.css           # Modern dark surveillance interface styles
│   └── js/
│       └── app.js              # REST API connector & canvas video simulation
│
└── backend/
    ├── app.py                  # Flask server entry point & CORS configuration
    ├── config.py               # Environment configuration loader
    ├── requirements.txt        # Python package dependencies
    ├── .env.example            # Environment variable template
    ├── database/
    │   ├── db.py               # Thread-safe SQLite connection & query manager
    │   └── init_db.py          # Database schema migrations & seed data
    ├── models/
    │   ├── __init__.py
    │   ├── camera.py           # Camera CRUD data model
    │   └── incident.py         # Incident storage & fast search queries
    ├── routes/
    │   ├── __init__.py
    │   ├── cameras.py          # /api/cameras REST endpoints
    │   ├── incidents.py        # /api/incidents search & triage endpoints
    │   ├── analytics.py        # /api/analytics KPI metrics & alert logs
    │   └── detection.py        # /api/detection ML inference endpoints
    ├── services/
    │   ├── __init__.py
    │   ├── video_service.py    # Vision bounding boxes & frame simulation
    │   └── notification_service.py # Alert logger & webhook dispatcher
    ├── ml/
    │   ├── __init__.py
    │   ├── dataset.py          # Surveillance benchmark dataset generator
    │   ├── train.py            # Model training, metrics & serialization
    │   ├── predict.py          # Real-time event importance classifier
    │   ├── evaluate.py         # Benchmark scenario verification
    │   └── cctv_sense_model.pkl # Trained model pipeline artifact
    ├── tests/
    │   ├── __init__.py
    │   ├── test_db.py          # Database CRUD unit tests
    │   ├── test_ml.py          # Machine learning inference tests
    │   └── test_api.py         # Flask REST API integration tests
    └── README.md               # Complete Windows 11 setup guide
```

---

## 3. Technology Stack

* **Frontend**: HTML5, CSS3, Modern Vanilla JavaScript (ES6+), HTML5 Canvas, Web Audio API.
* **Backend**: Python 3.10+, Flask, Flask-CORS.
* **Machine Learning**: Scikit-Learn (RandomForestClassifier, StandardScaler Pipeline) with statistical fallback.
* **Database**: SQLite (ACID compliant, zero configuration, WAL mode enabled).
* **Testing**: Python `unittest` & `pytest`.

---

## 4. Beginner-Friendly Step-by-Step Running Instructions for Windows 11

### Step 1: Install Required Software
1. Download and install **Python 3.10, 3.11, or 3.12** from [python.org](https://www.python.org/downloads/).
   > **IMPORTANT**: During installation on Windows 11, check the box:  
   > `[x] Add python.exe to PATH`
2. Open **Command Prompt (cmd)** or **PowerShell** and verify:
   ```cmd
   python --version
   pip --version
   ```

---

### Step 2: Open Project Directory
Open PowerShell or Command Prompt and navigate to the project directory:
```cmd
cd path\to\project\backend
```

---

### Step 3: Create & Activate a Python Virtual Environment
Creating a virtual environment ensures clean dependencies:
```cmd
python -m venv venv
```
Activate the virtual environment:
* In **Command Prompt (cmd.exe)**:
  ```cmd
  venv\Scripts\activate
  ```
* In **PowerShell**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
*(If PowerShell displays an execution policy error, run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` first).*

---

### Step 4: Install Dependencies
Install all required Python packages from `requirements.txt`:
```cmd
pip install -r requirements.txt
```

---

### Step 5: Configure Environment Variables
Copy the template configuration file:
* In Command Prompt:
  ```cmd
  copy .env.example .env
  ```
* In PowerShell:
  ```powershell
  cp .env.example .env
  ```
You can keep the default values for local testing, or edit `.env` to configure custom ports or alert webhook URLs.

---

### Step 6: Initialize the SQLite Database
Initialize the SQLite database with surveillance camera feeds and baseline incident data:
```cmd
python database/init_db.py
```
**Expected Output:**
```
[CCTV Sense DB] Seeded 6 CCTV cameras.
[CCTV Sense DB] Seeded 9 realistic surveillance incidents.
[CCTV Sense DB] Database initialized successfully.
```

---

### Step 7: Train the Machine Learning Model
Train the CCTV Sense importance classification model and generate the model artifact:
```cmd
python ml/train.py
```
**Expected Output:**
```
[1/4] Generating surveillance analytics dataset...
[2/4] Training model pipeline...
[3/4] Evaluation Metrics: Accuracy > 95%
[4/4] Serializing model artifact to 'ml/cctv_sense_model.pkl'...
[Success] Model artifact saved successfully.
```
To run the benchmark test suite against specific surveillance scenarios:
```cmd
python ml/evaluate.py
```

---

### Step 8: Start the Flask Backend Server
Run the Flask server:
```cmd
python app.py
```
**Expected Output:**
```
Starting CCTV Sense Flask Server on port 5000...
 * Running on http://127.0.0.1:5000
```
Keep this terminal window open.

---

### Step 9: Open and Connect the Frontend
You have two simple ways to open the frontend:

#### Option A: Direct Browser Access (Simplest)
1. In Windows File Explorer, navigate to `project/frontend/`.
2. Double-click **`index.html`** to open it in Chrome, Edge, or Firefox.
3. The dashboard connects automatically to `http://localhost:5000`.

#### Option B: Access via Flask Web Server
With Flask running, open your web browser and navigate directly to:
```
http://localhost:5000
```
Flask will serve the frontend dashboard directly from the root URL.

---

### Step 10: Run Automated Tests
Open a second terminal window (with `venv` activated) in `project/backend/`:
```cmd
python -m unittest discover tests
```
All unit tests for the database, ML model, and REST APIs will run and verify functionality.

---

## 5. Troubleshooting Common Windows 11 Issues

1. **`python is not recognized as an internal or external command`**:
   - Re-run the Python installer, select **Modify**, and check **Add Python to environment variables**.
2. **`Address already in use (Port 5000)`**:
   - If port 5000 is occupied, set `PORT=5001` in your `.env` file and restart `python app.py`.
3. **CORS Issues in Browser**:
   - The Flask backend is equipped with `flask-cors` accepting requests from any origin (`*`). Ensure the backend is running.
4. **Audio chime not playing**:
   - Modern browsers require user interaction (e.g. clicking anywhere on the page or the "Sound ON" button) before allowing audio output.
