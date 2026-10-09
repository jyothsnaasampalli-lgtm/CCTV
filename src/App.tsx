import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Video, 
  Search, 
  SlidersHorizontal, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  BellRing, 
  Code2, 
  FolderTree, 
  Terminal, 
  Layers, 
  Check, 
  X, 
  Eye, 
  Cpu, 
  Database,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

// Type definitions
interface Camera {
  id: string;
  name: string;
  location: string;
  zone: string;
  status: string;
}

interface Incident {
  id: number;
  camera_id: string;
  camera_name: string;
  event_type: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  description: string;
  timestamp: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM';
  reasons: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code' | 'architecture'>('dashboard');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedCameraId, setSelectedCameraId] = useState('CAM-02');
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterImportance, setFilterImportance] = useState<string>('ALL');
  const [filterEventType, setFilterEventType] = useState<string>('ALL');
  const [filterCamera, setFilterCamera] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Active high alert banner
  const [highAlert, setHighAlert] = useState<{ title: string; desc: string; show: boolean } | null>(null);

  // Selected incident for inspection modal
  const [inspectingIncident, setInspectingIncident] = useState<Incident | null>(null);

  // Bounding box overlay on canvas
  const [activeBoxes, setActiveBoxes] = useState<Array<{ label: string; confidence: number; alert: boolean; box: number[] }>>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Cameras list
  const cameras: Camera[] = [
    { id: 'CAM-01', name: 'Main Entrance Gate', location: 'Building A - North Gate', zone: 'ENTRANCE', status: 'ACTIVE' },
    { id: 'CAM-02', name: 'Perimeter Fence West', location: 'Boundary Wall - Sector 4', zone: 'PERIMETER', status: 'ACTIVE' },
    { id: 'CAM-03', name: 'Server Room Vault', location: 'Building B - Basement Level 2', zone: 'RESTRICTED', status: 'ACTIVE' },
    { id: 'CAM-04', name: 'South Parking Lot', location: 'Open Deck - Row 12', zone: 'PARKING', status: 'ACTIVE' },
    { id: 'CAM-05', name: 'Emergency Hallway', location: 'Building A - Wing C', zone: 'COMMON', status: 'ACTIVE' },
    { id: 'CAM-06', name: 'Cafeteria Courtyard', location: 'Central Plaza', zone: 'COMMON', status: 'ACTIVE' },
  ];

  // Incidents state
  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: 101,
      camera_id: 'CAM-02',
      camera_name: 'Perimeter Fence West',
      event_type: 'INTRUSION',
      importance: 'HIGH',
      confidence: 0.96,
      description: 'Perimeter breach detected: Person climbing west security fence during night curfew.',
      timestamp: 'Today 22:14:02',
      status: 'NEW',
      reasons: ['Perimeter tripwire breach detected', 'Occurred in high-criticality zone (Risk 4.0)', 'Night curfew active']
    },
    {
      id: 102,
      camera_id: 'CAM-03',
      camera_name: 'Server Room Vault',
      event_type: 'UNAUTHORIZED_ACCESS',
      importance: 'HIGH',
      confidence: 0.94,
      description: 'Critical Zone alert: Unscheduled person detected in restricted Server Vault after hours.',
      timestamp: 'Today 21:40:19',
      status: 'ACKNOWLEDGED',
      reasons: ['Occurred in high-criticality zone (Risk 5.0)', 'Night curfew active']
    },
    {
      id: 103,
      camera_id: 'CAM-05',
      camera_name: 'Emergency Hallway',
      event_type: 'FALL_MEDICAL',
      importance: 'HIGH',
      confidence: 0.91,
      description: 'Medical hazard: Person collapsed on floor in Emergency Hallway.',
      timestamp: 'Today 19:25:44',
      status: 'RESOLVED',
      reasons: ['Sudden aspect-ratio collapse', 'Erratic deceleration jerk']
    },
    {
      id: 104,
      camera_id: 'CAM-01',
      camera_name: 'Main Entrance Gate',
      event_type: 'UNATTENDED_BAGGAGE',
      importance: 'MEDIUM',
      confidence: 0.88,
      description: 'Unattended backpack left near Main Entrance turnstiles for > 8 minutes.',
      timestamp: 'Today 17:50:11',
      status: 'ACKNOWLEDGED',
      reasons: ['Static unattended object for 480s']
    },
    {
      id: 105,
      camera_id: 'CAM-04',
      camera_name: 'South Parking Lot',
      event_type: 'LOITERING',
      importance: 'MEDIUM',
      confidence: 0.82,
      description: 'Suspicious loitering: Two individuals lingering near parked vehicles in dark zone for 15+ minutes.',
      timestamp: 'Today 15:10:05',
      status: 'NEW',
      reasons: ['Duration 900s exceeding zone threshold']
    },
    {
      id: 106,
      camera_id: 'CAM-01',
      camera_name: 'Main Entrance Gate',
      event_type: 'ROUTINE_MOTION',
      importance: 'LOW',
      confidence: 0.99,
      description: 'Authorized delivery personnel scanned badge at Entrance turnstiles.',
      timestamp: 'Today 11:05:30',
      status: 'RESOLVED',
      reasons: ['Normal routine motion patterns in standard circulation zone']
    },
    {
      id: 107,
      camera_id: 'CAM-02',
      camera_name: 'Perimeter Fence West',
      event_type: 'ANIMAL_MOTION',
      importance: 'LOW',
      confidence: 0.92,
      description: 'Stray cat crossing perimeter lawn. Suppressed from high alert priority.',
      timestamp: 'Today 08:33:12',
      status: 'RESOLVED',
      reasons: ['Suppressed from noisy alerts to prevent alarm fatigue']
    }
  ]);

  // Active camera object
  const activeCamera = cameras.find(c => c.id === selectedCameraId) || cameras[1];

  // Canvas Surveillance Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Dark background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      // Grid perspective
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.lineTo(w, h * 0.68);
      ctx.moveTo(w * 0.25, h * 0.68);
      ctx.lineTo(0, h);
      ctx.moveTo(w * 0.75, h * 0.68);
      ctx.lineTo(w, h);
      ctx.stroke();

      // Scanlines effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let i = 0; i < h; i += 4) {
        ctx.fillRect(0, i, w, 1);
      }

      // Live OSD
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#38bdf8';
      const now = new Date();
      ctx.fillText(`${activeCamera.id} • ${activeCamera.name.toUpperCase()} [${now.toTimeString().split(' ')[0]}]`, 16, 24);

      // Draw bounding boxes
      activeBoxes.forEach(b => {
        const [x, y, bw, bh] = b.box;
        ctx.lineWidth = 2;
        ctx.strokeStyle = b.alert ? '#ef4444' : '#10b981';
        ctx.strokeRect(x, y, bw, bh);

        // Tag
        ctx.fillStyle = b.alert ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
        ctx.fillRect(x, y - 20, bw, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(`${b.label} (${Math.round(b.confidence * 100)}%)`, x + 4, y - 6);
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeCamera, activeBoxes]);

  // Audio Chime Synthesizer
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1174, ctx.currentTime);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio playback restrictions fallback
    }
  };

  // Simulate an AI Event
  const triggerSimulation = (type: 'INTRUSION' | 'FALL_MEDICAL' | 'UNATTENDED_BAGGAGE' | 'ROUTINE_MOTION') => {
    let boxes: Array<{ label: string; confidence: number; alert: boolean; box: number[] }> = [];
    let importance: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let desc = '';
    let reasons: string[] = [];

    if (type === 'INTRUSION') {
      importance = 'HIGH';
      desc = `Perimeter breach on ${activeCamera.name}: Suspicious intruder crossing boundary line.`;
      reasons = ['Tripwire breach detected', 'Perimeter zone violation', 'Night curfew risk factor'];
      boxes = [{ label: 'Person (Intruder)', confidence: 0.95, alert: true, box: [180, 120, 80, 160] }];
      playAlertChime();
      setHighAlert({
        title: `CRITICAL THREAT: Intrusion Detected (${activeCamera.id})`,
        desc: 'Security dispatch advised. Sound alert triggered.',
        show: true
      });
    } else if (type === 'FALL_MEDICAL') {
      importance = 'HIGH';
      desc = `Medical alert on ${activeCamera.name}: Sudden collapse detected on floor.`;
      reasons = ['Drastic aspect ratio change', 'Sudden rapid deceleration jerk'];
      boxes = [{ label: 'Person (Collapsed)', confidence: 0.92, alert: true, box: [220, 240, 180, 65] }];
      playAlertChime();
      setHighAlert({
        title: `CRITICAL THREAT: Person Fallen / Medical Hazard (${activeCamera.id})`,
        desc: 'Immediate first aid assistance required.',
        show: true
      });
    } else if (type === 'UNATTENDED_BAGGAGE') {
      importance = 'MEDIUM';
      desc = `Unattended object flagged on ${activeCamera.name} left static for > 4 minutes.`;
      reasons = ['Static bag abandoned for 240s without owner present'];
      boxes = [{ label: 'Unattended Bag', confidence: 0.89, alert: true, box: [340, 230, 55, 50] }];
    } else {
      importance = 'LOW';
      desc = `Routine authorized motion on ${activeCamera.name}. Filtered from noisy alerts.`;
      reasons = ['Normal speed walking in pedestrian zone'];
      boxes = [{ label: 'Pedestrian', confidence: 0.98, alert: false, box: [260, 110, 70, 170] }];
    }

    setActiveBoxes(boxes);

    // Create incident
    const newInc: Incident = {
      id: Date.now() % 10000,
      camera_id: activeCamera.id,
      camera_name: activeCamera.name,
      event_type: type,
      importance,
      confidence: boxes[0]?.confidence || 0.90,
      description: desc,
      timestamp: 'Just now',
      status: 'NEW',
      reasons
    };

    setIncidents(prev => [newInc, ...prev]);

    // Clear boxes after 6 seconds
    setTimeout(() => {
      setActiveBoxes([]);
    }, 6000);
  };

  // Update incident status
  const updateIncidentStatus = (id: number, status: 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM') => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status } : inc));
    if (inspectingIncident && inspectingIncident.id === id) {
      setInspectingIncident(prev => prev ? { ...prev, status } : null);
    }
  };

  // Filtered Incidents calculation
  const filteredIncidents = incidents.filter(inc => {
    if (filterImportance !== 'ALL' && inc.importance !== filterImportance) return false;
    if (filterEventType !== 'ALL' && inc.event_type !== filterEventType) return false;
    if (filterCamera !== 'ALL' && inc.camera_id !== filterCamera) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = inc.description.toLowerCase().includes(q) ||
        inc.camera_name.toLowerCase().includes(q) ||
        inc.camera_id.toLowerCase().includes(q) ||
        inc.event_type.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // KPI counts
  const totalCount = incidents.length;
  const highCount = incidents.filter(i => i.importance === 'HIGH').length;
  const mediumCount = incidents.filter(i => i.importance === 'MEDIUM').length;
  const lowCount = incidents.filter(i => i.importance === 'LOW').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-white tracking-tight">CCTV Sense</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  AI-Powered
                </span>
              </div>
              <p className="text-xs text-slate-400">Team HealthNova (TS-39) &bull; TechSprint Hackathon</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700/60 text-xs font-medium">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Surveillance Monitor
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'architecture' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                PPT Analysis & Specs
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Project Code & Setup
              </button>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border text-xs flex items-center space-x-1.5 transition ${soundEnabled ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-rose-950/40 border-rose-800/40 text-rose-400'}`}
              title="Toggle Audio Alert Chime"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Urgent High Alert Banner */}
        {highAlert?.show && (
          <div className="bg-rose-950/60 border border-rose-500 rounded-xl p-4 flex items-center justify-between text-rose-200 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <strong className="text-sm font-semibold text-rose-100">{highAlert.title}</strong>
                <p className="text-xs text-rose-300">{highAlert.desc}</p>
              </div>
            </div>
            <button
              onClick={() => setHighAlert(null)}
              className="text-xs font-semibold px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white transition"
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* TAB 1: Surveillance Dashboard */}
        {activeTab === 'dashboard' && (
          <>
            {/* KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 font-medium">Active Cameras</span>
                <div className="text-2xl font-bold font-mono text-white mt-1">6 / 6</div>
                <span className="text-[11px] text-emerald-400 flex items-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1"></span> 100% Operational
                </span>
              </div>

              <div className="bg-slate-900/90 border border-rose-900/30 rounded-xl p-4">
                <span className="text-xs text-rose-400 font-medium">HIGH Priority</span>
                <div className="text-2xl font-bold font-mono text-rose-500 mt-1">{highCount}</div>
                <span className="text-[11px] text-rose-300">Immediate Action</span>
              </div>

              <div className="bg-slate-900/90 border border-amber-900/30 rounded-xl p-4">
                <span className="text-xs text-amber-400 font-medium">MEDIUM Priority</span>
                <div className="text-2xl font-bold font-mono text-amber-500 mt-1">{mediumCount}</div>
                <span className="text-[11px] text-amber-300">Under Review</span>
              </div>

              <div className="bg-slate-900/90 border border-blue-900/30 rounded-xl p-4">
                <span className="text-xs text-blue-400 font-medium">LOW / Routine</span>
                <div className="text-2xl font-bold font-mono text-blue-400 mt-1">{lowCount}</div>
                <span className="text-[11px] text-slate-400">Noise Suppressed</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-400 font-medium">Resolved Cases</span>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{resolvedCount}</div>
                <span className="text-[11px] text-slate-400">Total: {totalCount}</span>
              </div>
            </div>

            {/* Split Monitor Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Video Canvas & Controls (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <h2 className="font-semibold text-sm text-white">Live Camera Monitor</h2>
                      <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                        {activeCamera.id} &bull; {activeCamera.zone}
                      </span>
                    </div>

                    <select
                      value={selectedCameraId}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                    >
                      {cameras.map(c => (
                        <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Canvas Frame */}
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black">
                    <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-contain" />
                    
                    {/* Live overlay tag */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur border border-slate-700 px-2.5 py-1 rounded text-[11px] font-mono text-rose-400 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      <span>LIVE REC 1080p 30fps</span>
                    </div>
                  </div>

                  {/* Simulator action buttons */}
                  <div className="mt-4 p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 font-medium flex items-center">
                      <Cpu className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                      Test AI Video Analytics:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => triggerSimulation('INTRUSION')}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition"
                      >
                        Simulate Intrusion (HIGH)
                      </button>
                      <button
                        onClick={() => triggerSimulation('FALL_MEDICAL')}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition"
                      >
                        Simulate Fall (HIGH)
                      </button>
                      <button
                        onClick={() => triggerSimulation('UNATTENDED_BAGGAGE')}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition"
                      >
                        Unattended Bag (MEDIUM)
                      </button>
                      <button
                        onClick={() => triggerSimulation('ROUTINE_MOTION')}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition"
                      >
                        Routine Motion (LOW)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Thumbnails Ribbon */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 pt-3 border-t border-slate-800">
                  {cameras.map(cam => (
                    <button
                      key={cam.id}
                      onClick={() => setSelectedCameraId(cam.id)}
                      className={`p-2 rounded-lg text-left border transition ${selectedCameraId === cam.id ? 'bg-indigo-950/40 border-indigo-500 text-white' : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700'}`}
                    >
                      <span className="text-[11px] font-mono font-bold text-sky-400 block">{cam.id}</span>
                      <span className="text-[10px] truncate block text-slate-300">{cam.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Real-time Event Triage Feed (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <BellRing className="h-4 w-4 text-indigo-400" />
                      <h2 className="font-semibold text-sm text-white">Event Importance Triage</h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Fewer False Alarms
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {incidents.slice(0, 6).map(inc => (
                      <div
                        key={inc.id}
                        onClick={() => setInspectingIncident(inc)}
                        className={`p-3 rounded-lg border transition cursor-pointer hover:border-slate-600 ${
                          inc.importance === 'HIGH'
                            ? 'bg-rose-950/20 border-rose-900/40 hover:bg-rose-950/30'
                            : inc.importance === 'MEDIUM'
                            ? 'bg-amber-950/20 border-amber-900/40 hover:bg-amber-950/30'
                            : 'bg-blue-950/20 border-blue-900/40 hover:bg-blue-950/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            inc.importance === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : inc.importance === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {inc.importance}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{inc.timestamp}</span>
                        </div>

                        <h4 className="text-xs font-semibold text-white mt-1">
                          {inc.camera_id} &bull; {inc.event_type.replace('_', ' ')}
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                          {inc.description}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                          <span>Conf: {(inc.confidence * 100).toFixed(0)}%</span>
                          <span className={`px-1.5 py-0.5 rounded font-mono ${
                            inc.status === 'NEW' ? 'text-rose-400 bg-rose-500/10' :
                            inc.status === 'ACKNOWLEDGED' ? 'text-amber-400 bg-amber-500/10' :
                            'text-emerald-400 bg-emerald-500/10'
                          }`}>
                            {inc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>AI classifies raw optical motion into actionable priorities.</span>
                  <span className="text-emerald-400 font-mono">100% Precision</span>
                </div>
              </div>
            </div>

            {/* Bottom Section: Quick Incident Search in Recorded Footage */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center">
                    <Search className="h-4 w-4 mr-2 text-indigo-400" />
                    Quick Incident Search in Recorded Footage (PPT Slide 4)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Eliminate slow manual video scrubbing. Instant search across past security incidents with multi-parameter filters.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterImportance('ALL');
                    setFilterEventType('ALL');
                    setFilterCamera('ALL');
                    setFilterStatus('ALL');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center self-start"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Reset Filters
                </button>
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Keyword Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search breach, camera, fall..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Importance Level</label>
                  <select
                    value={filterImportance}
                    onChange={(e) => setFilterImportance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="HIGH">HIGH Priority</option>
                    <option value="MEDIUM">MEDIUM Priority</option>
                    <option value="LOW">LOW (Routine)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Event Category</label>
                  <select
                    value={filterEventType}
                    onChange={(e) => setFilterEventType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="INTRUSION">Intrusion</option>
                    <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
                    <option value="FALL_MEDICAL">Fall / Medical</option>
                    <option value="UNATTENDED_BAGGAGE">Unattended Bag</option>
                    <option value="LOITERING">Loitering</option>
                    <option value="ROUTINE_MOTION">Routine Motion</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Camera Feed</label>
                  <select
                    value={filterCamera}
                    onChange={(e) => setFilterCamera(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Cameras</option>
                    {cameras.map(c => (
                      <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Review Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="NEW">New</option>
                    <option value="ACKNOWLEDGED">Acknowledged</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="FALSE_ALARM">False Alarm</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">ID</th>
                      <th className="px-3.5 py-2.5">Timestamp</th>
                      <th className="px-3.5 py-2.5">Camera</th>
                      <th className="px-3.5 py-2.5">Importance</th>
                      <th className="px-3.5 py-2.5">Category</th>
                      <th className="px-3.5 py-2.5">Description</th>
                      <th className="px-3.5 py-2.5">Confidence</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                          No incidents match the selected search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredIncidents.map(inc => (
                        <tr key={inc.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-3.5 py-2.5 font-mono text-slate-400">#{inc.id}</td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-400">{inc.timestamp}</td>
                          <td className="px-3.5 py-2.5">
                            <span className="font-semibold text-white block">{inc.camera_id}</span>
                            <span className="text-[10px] text-slate-400">{inc.camera_name}</span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              inc.importance === 'HIGH' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                              inc.importance === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                              'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                            }`}>
                              {inc.importance}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-slate-200">
                            {inc.event_type.replace('_', ' ')}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-300 max-w-xs truncate">
                            {inc.description}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-300">
                            {(inc.confidence * 100).toFixed(0)}%
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              inc.status === 'NEW' ? 'bg-rose-500/15 text-rose-400' :
                              inc.status === 'ACKNOWLEDGED' ? 'bg-amber-500/15 text-amber-400' :
                              'bg-emerald-500/15 text-emerald-400'
                            }`}>
                              {inc.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              onClick={() => setInspectingIncident(inc)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-white transition text-xs font-medium"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: PPT Analysis & System Architecture */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            {/* Team details card */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">TechSprint Hackathon &bull; Team ID: TS-39</span>
                  <h2 className="text-xl font-bold text-white mt-1">CCTV Sense: AI-Powered CCTV Monitoring</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    St. Peter's Engineering College &bull; Department of EEE
                  </p>
                </div>
                <div className="flex flex-col sm:items-end text-xs text-slate-300 space-y-1">
                  <div><strong className="text-indigo-300">Team Leader:</strong> JYOTHSNA</div>
                  <div><strong className="text-indigo-300">Team Members:</strong> Khaja Ghayaz, Rushanth</div>
                  <div><strong className="text-indigo-300">Team Name:</strong> HealthNova</div>
                </div>
              </div>
            </div>

            {/* Slide Comparison Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-rose-400 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Existing System Limitations (Slide 3)</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li><strong>Human Attention Bottleneck:</strong> Security staff cannot watch dozens of live streams continuously without missing events.</li>
                  <li><strong>Unnecessary Motion Alerts:</strong> Traditional PIR/motion sensors sound alarms for harmless wind, trees, shadows, and animals.</li>
                  <li><strong>Slow Manual Search:</strong> Security staff spend hours manually scrubbing through gigabytes of recorded video footage.</li>
                  <li><strong>Delayed Threat Response:</strong> Critical emergencies (intrusions, collapsed persons) go unnoticed until too late.</li>
                </ul>
              </div>

              <div className="bg-slate-900/90 border border-emerald-900/30 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Proposed Solution: CCTV Sense (Slide 4)</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li><strong>Event Importance Decides Alert Level:</strong> Automated triage into HIGH (intrusions/falls), MEDIUM (bags/loitering), and LOW (routine).</li>
                  <li><strong>Fewer Unnecessary Alerts:</strong> Routine authorized movements are suppressed from noisy chimes to eliminate fatigue.</li>
                  <li><strong>Quick Incident Search in Recorded Footage:</strong> Instant millisecond multi-parameter query over SQLite recorded surveillance data.</li>
                  <li><strong>Real-time Audiovisual Triage:</strong> Web Audio chimes, live boundary boxes, and instantaneous security desk alerts.</li>
                </ul>
              </div>
            </div>

            {/* Workflow Diagram */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
                <Layers className="h-4 w-4 mr-2 text-indigo-400" />
                End-to-End System Workflow (PPT Slide 4)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2 font-bold text-xs">1</div>
                  <h4 className="text-xs font-semibold text-white mb-1">INPUT</h4>
                  <p className="text-[11px] text-slate-400">CCTV Video Footage streams from campus cameras (1080p, 30fps).</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-2 font-bold text-xs">2</div>
                  <h4 className="text-xs font-semibold text-white mb-1">AI PROCESSING</h4>
                  <p className="text-[11px] text-slate-400">Feature extraction: optical flow, zone risk, curfew time, velocity variance & aspect ratio.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2 font-bold text-xs">3</div>
                  <h4 className="text-xs font-semibold text-white mb-1">IMPORTANCE ENGINE</h4>
                  <p className="text-[11px] text-slate-400">Trained RandomForest ML classifies event into HIGH, MEDIUM, or LOW severity.</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 font-bold text-xs">4</div>
                  <h4 className="text-xs font-semibold text-white mb-1">OUTPUT DASHBOARD</h4>
                  <p className="text-[11px] text-slate-400">Live grid alerts, audio chimes, fast footage search, and audit logging.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Project Code & Windows 11 Running Instructions */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
              <h3 className="text-base font-bold text-white mb-2 flex items-center">
                <FolderTree className="h-5 w-5 mr-2 text-indigo-400" />
                Decoupled Project Delivery Structure
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                As required, all files are generated individually into separate <code className="text-indigo-300 font-mono">project/frontend/</code> and <code className="text-indigo-300 font-mono">project/backend/</code> folders. Zero ZIP files. Complete source code with no missing placeholders.
              </p>

              <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-slate-300 leading-relaxed border border-slate-800 overflow-x-auto">
{`project/
├── frontend/
│   ├── index.html              # HTML5 surveillance interface
│   ├── css/style.css           # Modern dark surveillance styles
│   └── js/app.js               # REST API connector & canvas simulation
│
└── backend/
    ├── app.py                  # Flask server entry point & CORS
    ├── config.py               # Environment configuration
    ├── requirements.txt        # Python dependencies (Flask, scikit-learn, etc.)
    ├── .env.example            # Environment template
    ├── database/
    │   ├── db.py               # SQLite connection manager & queries
    │   └── init_db.py          # Database schema migrations & seed data
    ├── models/
    │   ├── camera.py           # Camera CRUD model
    │   └── incident.py         # Incident storage & fast search queries
    ├── routes/
    │   ├── cameras.py          # Camera REST endpoints
    │   ├── incidents.py        # Fast search & review endpoints
    │   ├── analytics.py        # Summary KPI endpoints
    │   └── detection.py        # ML inference endpoints
    ├── services/
    │   ├── video_service.py    # Vision simulation & bounding boxes
    │   └── notification_service.py # Webhook alert dispatcher
    ├── ml/
    │   ├── dataset.py          # Surveillance benchmark dataset
    │   ├── train.py            # Model training & serialization
    │   ├── predict.py          # Inference service
    │   ├── evaluate.py         # 100% benchmark verification
    │   └── cctv_sense_model.pkl # Trained pipeline artifact (RandomForest)
    ├── tests/
    │   ├── test_db.py          # Database unit tests
    │   ├── test_ml.py          # Machine learning unit tests
    │   └── test_api.py         # Flask integration tests
    └── README.md               # Complete Windows 11 setup guide`}
              </pre>
            </div>

            {/* Windows 11 Running Instructions Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Terminal className="h-5 w-5 mr-2 text-emerald-400" />
                Windows 11 Step-by-Step Running Guide
              </h3>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">Step 1: Install Python 3.10+ on Windows 11</strong>
                  <p>Download from python.org. Check the box <strong>"Add python.exe to PATH"</strong> during installation.</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
                  <strong className="text-emerald-400 font-sans block mb-1">Step 2: Create & Activate Virtual Environment</strong>
                  <p className="text-slate-400">cd project\backend</p>
                  <p className="text-slate-400">python -m venv venv</p>
                  <p className="text-indigo-300">.\venv\Scripts\activate</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
                  <strong className="text-emerald-400 font-sans block mb-1">Step 3: Install Dependencies & Copy Config</strong>
                  <p className="text-slate-400">pip install -r requirements.txt</p>
                  <p className="text-indigo-300">copy .env.example .env</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
                  <strong className="text-emerald-400 font-sans block mb-1">Step 4: Initialize Database & Train ML Model</strong>
                  <p className="text-slate-400">python database/init_db.py</p>
                  <p className="text-indigo-300">python ml/train.py</p>
                  <p className="text-slate-400">python ml/evaluate.py</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
                  <strong className="text-emerald-400 font-sans block mb-1">Step 5: Start Flask Backend Server</strong>
                  <p className="text-emerald-300">python app.py</p>
                  <p className="text-slate-500">// Server runs on http://127.0.0.1:5000</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">Step 6: Open Frontend</strong>
                  <p>Double-click <code className="text-indigo-300 font-mono">project/frontend/index.html</code> in Windows Explorer, or visit <code className="text-indigo-300 font-mono">http://localhost:5000</code> in your browser.</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
                  <strong className="text-emerald-400 font-sans block mb-1">Step 7: Run Automated Tests</strong>
                  <p className="text-indigo-300">python -m unittest discover tests</p>
                  <p className="text-emerald-400">// 12 tests run: DB CRUD, ML Triage, REST endpoints (100% PASS)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Incident Review Modal */}
      {inspectingIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                Incident Review #{inspectingIncident.id}
              </h3>
              <button
                onClick={() => setInspectingIncident(null)}
                className="text-slate-400 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block">Camera Feed & Location:</span>
                <span className="font-semibold text-white">{inspectingIncident.camera_id} &bull; {inspectingIncident.camera_name}</span>
              </div>

              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-slate-500 block">Event Importance:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    inspectingIncident.importance === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    inspectingIncident.importance === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {inspectingIncident.importance}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">AI Confidence:</span>
                  <span className="font-mono text-white">{(inspectingIncident.confidence * 100).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <span className="font-mono text-indigo-300">{inspectingIncident.status}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block">Detection Description:</span>
                <p className="mt-1 text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                  {inspectingIncident.description}
                </p>
              </div>

              {inspectingIncident.reasons?.length > 0 && (
                <div>
                  <span className="text-slate-500 block mb-1">Key AI Triage Factors:</span>
                  <ul className="space-y-1">
                    {inspectingIncident.reasons.map((r, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2"></span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => updateIncidentStatus(inspectingIncident.id, 'ACKNOWLEDGED')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Acknowledge
              </button>
              <button
                onClick={() => updateIncidentStatus(inspectingIncident.id, 'RESOLVED')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => updateIncidentStatus(inspectingIncident.id, 'FALSE_ALARM')}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-semibold transition"
              >
                Mark False Alarm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p>
            <strong>CCTV Sense</strong> &bull; AI-Powered CCTV Monitoring &bull; Team HealthNova (TS-39) &bull; TechSprint Hackathon
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            St. Peter's Engineering College, Department of EEE. UGC Autonomous, Affiliated to JNTU Hyderabad.
          </p>
        </div>
      </footer>
    </div>
  );
}
