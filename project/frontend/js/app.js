/**
 * CCTV Sense - Frontend Dashboard Application Logic
 * Team: HealthNova (TS-39) - TechSprint Hackathon
 * Connects directly to Flask REST API endpoints.
 */

// API Base URL - Configured for local Flask server or relative host
const API_BASE = window.location.port === "5000" ? "" : "http://localhost:5000";

// Global State
let state = {
  cameras: [],
  activeCameraId: "CAM-02",
  incidents: [],
  stats: {},
  soundEnabled: true,
  audioCtx: null,
  activeFilter: {
    q: "",
    importance: "",
    event_type: "",
    camera_id: "",
    status: ""
  }
};

// Canvas & Animation State
let canvas, ctx;
let animationFrameId = null;
let currentBoundingBoxes = [];

// Initialize Dashboard on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  bindUIEvents();
  fetchInitialData();

  // Polling for live dashboard refresh every 8 seconds
  setInterval(() => {
    fetchIncidents(false);
    fetchStats();
  }, 8000);
});

/**
 * Binds UI Event Listeners
 */
function bindUIEvents() {
  // Refresh Feeds Button
  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    fetchInitialData();
  });

  // Sound Toggle Button
  const soundBtn = document.getElementById("soundToggleBtn");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      state.soundEnabled = !state.soundEnabled;
      soundBtn.innerHTML = state.soundEnabled ? "<span>&#128266;</span> Sound ON" : "<span>&#128263;</span> Sound OFF";
    });
  }

  // Camera Dropdown Filter
  const camSelect = document.getElementById("cameraSelectFilter");
  if (camSelect) {
    camSelect.addEventListener("change", (e) => {
      if (e.target.value !== "ALL") {
        selectCamera(e.target.value);
      }
    });
  }

  // Search & Filter Inputs (Instant reactive search)
  const filterQuery = document.getElementById("filterQuery");
  const filterImportance = document.getElementById("filterImportance");
  const filterEventType = document.getElementById("filterEventType");
  const filterCamera = document.getElementById("filterCamera");
  const filterStatus = document.getElementById("filterStatus");

  const triggerSearch = () => {
    state.activeFilter.q = filterQuery?.value.trim() || "";
    state.activeFilter.importance = filterImportance?.value || "";
    state.activeFilter.event_type = filterEventType?.value || "";
    state.activeFilter.camera_id = filterCamera?.value || "";
    state.activeFilter.status = filterStatus?.value || "";
    fetchIncidents(true);
  };

  filterQuery?.addEventListener("input", debounce(triggerSearch, 300));
  filterImportance?.addEventListener("change", triggerSearch);
  filterEventType?.addEventListener("change", triggerSearch);
  filterCamera?.addEventListener("change", triggerSearch);
  filterStatus?.addEventListener("change", triggerSearch);

  // Clear Filters
  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => {
    if (filterQuery) filterQuery.value = "";
    if (filterImportance) filterImportance.value = "";
    if (filterEventType) filterEventType.value = "";
    if (filterCamera) filterCamera.value = "";
    if (filterStatus) filterStatus.value = "";
    state.activeFilter = { q: "", importance: "", event_type: "", camera_id: "", status: "" };
    fetchIncidents(true);
  });
}

/**
 * Initializes HTML5 Surveillance Canvas Simulation
 */
function initCanvas() {
  canvas = document.getElementById("surveillanceCanvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  startCanvasRenderLoop();
}

/**
 * Continuous Canvas Loop (Draws synthetic video frames, noise, scanlines, and detection boxes)
 */
function startCanvasRenderLoop() {
  let frameCount = 0;

  function render() {
    frameCount++;
    const width = canvas.width;
    const height = canvas.height;

    // Background surveillance scene
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, width, height);

    // Simulated camera perspectives (Perimeter Fence or Hallway perspective lines)
    ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Perspective lines
    ctx.moveTo(0, height * 0.7);
    ctx.lineTo(width, height * 0.7);
    ctx.moveTo(width * 0.3, height * 0.7);
    ctx.lineTo(0, height);
    ctx.moveTo(width * 0.7, height * 0.7);
    ctx.lineTo(width, height);
    ctx.stroke();

    // Surveillance scanlines effect
    ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
    for (let i = 0; i < height; i += 4) {
      ctx.fillRect(0, i, width, 1);
    }

    // Camera OSD (On-Screen Display)
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#38bdf8";
    const now = new Date();
    const timeStr = now.toISOString().replace("T", " ").substring(0, 19);
    ctx.fillText(`${state.activeCameraId} - LIVE [${timeStr}]`, 16, 26);

    // Draw active bounding boxes
    if (currentBoundingBoxes.length > 0) {
      currentBoundingBoxes.forEach((item) => {
        const [x, y, w, h] = item.box;
        ctx.lineWidth = 2;
        ctx.strokeStyle = item.alert ? "#ef4444" : "#10b981";
        ctx.strokeRect(x, y, w, h);

        // Label banner
        ctx.fillStyle = item.alert ? "rgba(239, 68, 68, 0.85)" : "rgba(16, 185, 129, 0.85)";
        ctx.fillRect(x, y - 20, w, 20);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.fillText(`${item.label} (${Math.round(item.confidence * 100)}%)`, x + 4, y - 6);
      });
    }

    animationFrameId = requestAnimationFrame(render);
  }

  render();
}

/**
 * Fetch All Initial Data from Flask Backend
 */
async function fetchInitialData() {
  try {
    await Promise.all([fetchCameras(), fetchIncidents(true), fetchStats()]);
    updateBackendStatus(true);
  } catch (err) {
    console.warn("Backend connection notice:", err);
    updateBackendStatus(false);
  }
}

function updateBackendStatus(online) {
  const pill = document.querySelector(".status-pill");
  const text = document.getElementById("backendStatusText");
  if (!pill || !text) return;
  if (online) {
    pill.className = "status-pill active";
    text.textContent = "Flask API: Connected";
  } else {
    pill.className = "status-pill offline";
    text.textContent = "Flask API: Offline / Reconnecting";
  }
}

/**
 * Fetch Cameras List
 */
async function fetchCameras() {
  try {
    const res = await fetch(`${API_BASE}/api/cameras`);
    if (!res.ok) throw new Error("Cameras fetch failed");
    const json = await res.json();
    if (json.success) {
      state.cameras = json.data;
      renderCameraRibbon(json.data);
      if (json.data.length > 0 && !state.cameras.some(c => c.id === state.activeCameraId)) {
        selectCamera(json.data[0].id);
      }
    }
  } catch (e) {
    console.error("Camera loading error:", e);
  }
}

/**
 * Render Camera Selector Thumbnails
 */
function renderCameraRibbon(cameras) {
  const ribbon = document.getElementById("cameraRibbon");
  if (!ribbon) return;

  ribbon.innerHTML = cameras.map(cam => `
    <div class="camera-card ${cam.id === state.activeCameraId ? 'active' : ''}" onclick="selectCamera('${cam.id}')">
      <span class="cam-code">${cam.id}</span>
      <span class="cam-name-sub">${cam.name}</span>
    </div>
  `).join("");
}

/**
 * Switch Active Camera Feed
 */
function selectCamera(camId) {
  state.activeCameraId = camId;
  const cam = state.cameras.find(c => c.id === camId);
  if (!cam) return;

  // Update header and metadata
  const tag = document.getElementById("currentCamTag");
  const loc = document.getElementById("feedLocation");
  const zone = document.getElementById("feedZone");

  if (tag) tag.textContent = `${cam.id} • ${cam.name.toUpperCase()}`;
  if (loc) loc.textContent = cam.location;
  if (zone) zone.textContent = `ZONE: ${cam.zone_type}`;

  // Update dropdown selection
  const select = document.getElementById("cameraSelectFilter");
  if (select) select.value = camId;

  // Highlight active thumbnail
  document.querySelectorAll(".camera-card").forEach(el => {
    el.classList.toggle("active", el.querySelector(".cam-code")?.textContent === camId);
  });

  // Clear current bounding boxes until new event
  currentBoundingBoxes = [];
  hideAlertBadge();
}

/**
 * Fetch Incidents with Active Search Filters (PPT Slide 4: Faster Incident Search)
 */
async function fetchIncidents(showLoading = false) {
  try {
    const params = new URLSearchParams();
    if (state.activeFilter.q) params.append("q", state.activeFilter.q);
    if (state.activeFilter.importance) params.append("importance", state.activeFilter.importance);
    if (state.activeFilter.event_type) params.append("event_type", state.activeFilter.event_type);
    if (state.activeFilter.camera_id) params.append("camera_id", state.activeFilter.camera_id);
    if (state.activeFilter.status) params.append("status", state.activeFilter.status);

    const res = await fetch(`${API_BASE}/api/incidents?${params.toString()}`);
    if (!res.ok) throw new Error("Incidents fetch failed");
    const json = await res.json();
    if (json.success) {
      state.incidents = json.data;
      renderTriageFeed(json.data);
      renderIncidentTable(json.data);
    }
  } catch (err) {
    console.error("Incidents fetch error:", err);
  }
}

/**
 * Fetch KPI Summary Statistics
 */
async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/summary`);
    if (!res.ok) return;
    const json = await res.json();
    if (json.success) {
      state.stats = json.data;
      updateKpiDisplay(json.data);
    }
  } catch (err) {
    console.error("Stats fetch error:", err);
  }
}

function updateKpiDisplay(stats) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? 0;
  };
  setEl("statHighCount", stats.high_importance);
  setEl("statMediumCount", stats.medium_importance);
  setEl("statLowCount", stats.low_importance);
  setEl("statResolvedCount", stats.resolved);
}

/**
 * Render Live Triage Feed in Right Column
 */
function renderTriageFeed(incidents) {
  const feed = document.getElementById("triageFeed");
  if (!feed) return;

  if (incidents.length === 0) {
    feed.innerHTML = `<div class="empty-state" style="padding: 24px; text-align: center; color: var(--text-muted);">No incidents matching active criteria.</div>`;
    return;
  }

  feed.innerHTML = incidents.slice(0, 8).map(inc => `
    <div class="triage-card ${inc.importance_level}" onclick="openIncidentModal(${inc.id})">
      <div class="triage-top">
        <span class="importance-badge ${inc.importance_level}">${inc.importance_level}</span>
        <span class="triage-time">${inc.timestamp ? inc.timestamp.substring(11, 19) : 'Just now'}</span>
      </div>
      <div class="triage-title">${inc.camera_id} • ${inc.event_type.replace('_', ' ')}</div>
      <div class="triage-desc">${inc.description}</div>
      <div class="triage-meta">
        <span>Conf: ${(inc.confidence_score * 100).toFixed(0)}%</span>
        <span class="status-badge ${inc.status}">${inc.status}</span>
      </div>
    </div>
  `).join("");
}

/**
 * Render Incident Search Table
 */
function renderIncidentTable(incidents) {
  const tbody = document.getElementById("incidentTableBody");
  if (!tbody) return;

  if (incidents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">No surveillance records found for this query.</td></tr>`;
    return;
  }

  tbody.innerHTML = incidents.map(inc => `
    <tr>
      <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem;">#${inc.id}</td>
      <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--text-secondary);">${inc.timestamp || '-'}</td>
      <td><strong>${inc.camera_id}</strong> <br><span style="font-size: 0.65rem; color: var(--text-muted);">${inc.camera_name || ''}</span></td>
      <td><span class="importance-badge ${inc.importance_level}">${inc.importance_level}</span></td>
      <td><strong>${inc.event_type.replace('_', ' ')}</strong></td>
      <td style="max-width: 320px; line-height: 1.3;">${inc.description}</td>
      <td style="font-family: 'JetBrains Mono', monospace;">${(inc.confidence_score * 100).toFixed(0)}%</td>
      <td><span class="status-badge ${inc.status}">${inc.status}</span></td>
      <td>
        <button class="view-btn" onclick="openIncidentModal(${inc.id})">Inspect</button>
      </td>
    </tr>
  `).join("");
}

/**
 * Simulate Video Incident on Active Camera Feed
 */
async function simulateIncident(scenario) {
  try {
    const payload = {
      camera_id: state.activeCameraId,
      scenario: scenario
    };

    const res = await fetch(`${API_BASE}/api/detection/simulate-frame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Simulation request failed");
    const json = await res.json();

    if (json.success) {
      const data = json.data;
      currentBoundingBoxes = data.bounding_boxes || [];

      const ml = data.ml_classification;
      showAlertBadge(ml.importance_level, scenario);

      // If HIGH severity, play audio chime and show urgent banner
      if (ml.importance_level === "HIGH") {
        playAlertChime();
        showHighAlertBanner(scenario, data.camera_name, ml.triage_recommendation);
      }

      // Refresh incident list and statistics immediately
      fetchIncidents(false);
      fetchStats();
    }
  } catch (err) {
    console.error("Simulation error:", err);
  }
}

function showAlertBadge(importance, scenario) {
  const badge = document.getElementById("detectionOverlayBadge");
  const text = document.getElementById("overlayBadgeText");
  if (!badge || !text) return;

  text.textContent = `[${importance}] ${scenario.replace('_', ' ')}`;
  badge.className = `overlay-badge ${importance}`;
  badge.classList.remove("hidden");

  setTimeout(() => {
    badge.classList.add("hidden");
  }, 4500);
}

function hideAlertBadge() {
  const badge = document.getElementById("detectionOverlayBadge");
  if (badge) badge.classList.add("hidden");
}

function showHighAlertBanner(scenario, camName, action) {
  const banner = document.getElementById("highAlertBanner");
  const title = document.getElementById("bannerTitle");
  const desc = document.getElementById("bannerDesc");
  if (!banner) return;

  if (title) title.textContent = `CRITICAL INCIDENT: ${scenario.replace('_', ' ')} (${camName})`;
  if (desc) desc.textContent = action || "Immediate physical security response required.";
  banner.classList.remove("hidden");
}

function dismissBanner() {
  const banner = document.getElementById("highAlertBanner");
  if (banner) banner.classList.add("hidden");
}

/**
 * Web Audio API Alert Chime (Zero external dependencies)
 */
function playAlertChime() {
  if (!state.soundEnabled) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!state.audioCtx) {
      state.audioCtx = new AudioContext();
    }
    const ctx = state.audioCtx;

    // Dual-tone urgent alert chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc2.frequency.setValueAtTime(1174, ctx.currentTime); // D6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.45);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (e) {
    console.warn("Audio playback not permitted or supported:", e);
  }
}

/**
 * Open Incident Inspection Modal
 */
function openIncidentModal(incidentId) {
  const inc = state.incidents.find(i => i.id === incidentId);
  if (!inc) return;

  const modal = document.getElementById("incidentModal");
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");
  const footer = document.getElementById("modalFooter");

  if (!modal || !body || !footer) return;

  title.textContent = `Incident Review #${inc.id} - ${inc.event_type.replace('_', ' ')}`;

  body.innerHTML = `
    <div><strong>Camera Feed:</strong> ${inc.camera_id} (${inc.camera_name || 'Camera'}) - ${inc.camera_location || 'Campus'}</div>
    <div><strong>Timestamp:</strong> ${inc.timestamp}</div>
    <div><strong>Event Importance:</strong> <span class="importance-badge ${inc.importance_level}">${inc.importance_level}</span></div>
    <div><strong>AI Confidence:</strong> ${(inc.confidence_score * 100).toFixed(1)}%</div>
    <div style="margin-top: 8px;"><strong>Description & Detection Summary:</strong><br><p style="margin-top: 4px; color: var(--text-primary);">${inc.description}</p></div>
    <div style="margin-top: 8px;"><strong>Current Verification Status:</strong> <span class="status-badge ${inc.status}">${inc.status}</span></div>
    ${inc.resolution_notes ? `<div style="margin-top: 6px;"><strong>Resolution Notes:</strong> ${inc.resolution_notes}</div>` : ''}
  `;

  footer.innerHTML = `
    <button class="control-btn" onclick="updateIncidentStatus(${inc.id}, 'ACKNOWLEDGED')">Acknowledge</button>
    <button class="control-btn primary" onclick="updateIncidentStatus(${inc.id}, 'RESOLVED')">Mark Resolved</button>
    <button class="control-btn" style="color: #fca5a5;" onclick="updateIncidentStatus(${inc.id}, 'FALSE_ALARM')">Mark False Alarm</button>
  `;

  modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("incidentModal");
  if (modal) modal.classList.add("hidden");
}

/**
 * Update Incident Verification Status via REST API
 */
async function updateIncidentStatus(incidentId, status) {
  try {
    const res = await fetch(`${API_BASE}/api/incidents/${incidentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status, resolution_notes: `Status set to ${status} via Security Web Dashboard` })
    });
    if (res.ok) {
      closeModal();
      fetchIncidents(false);
      fetchStats();
    }
  } catch (err) {
    console.error("Status update error:", err);
  }
}

/**
 * Utility debounce function
 */
function debounce(fn, wait) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Expose globals for inline event handlers
window.simulateIncident = simulateIncident;
window.selectCamera = selectCamera;
window.openIncidentModal = openIncidentModal;
window.closeModal = closeModal;
window.dismissBanner = dismissBanner;
window.updateIncidentStatus = updateIncidentStatus;
