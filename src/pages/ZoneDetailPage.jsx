import React, { useState, useEffect, useRef, useContext } from 'react';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft, X, LayoutDashboard, Bell, Navigation,
    BarChart3, FileText, Settings, LogOut, ChevronLeft,
    ChevronRight, ChevronDown, Download
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Area, AreaChart, CartesianGrid, Dot
} from 'recharts';
import { useUser } from '../App';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import './AnalystDashboard.css';

// ─── Mock Data ───────────────────────────────────────────────────────────────
const RISK_ZONES = [
    { id: 1, name: 'Quetta', pos: [30.18, 67.0], risk: 'Critical', color: '#EF4444', pulse: '1.2s' },
    { id: 2, name: 'Kech', pos: [26.0, 63.5], risk: 'Critical', color: '#EF4444', pulse: '1.2s' },
    { id: 3, name: 'Zhob', pos: [31.34, 69.45], risk: 'High', color: '#F97316', pulse: '2s' },
    { id: 4, name: 'Pishin', pos: [30.58, 66.98], risk: 'Medium', color: '#F59E0B', pulse: '2.5s' },
    { id: 5, name: 'Swat', pos: [35.22, 72.42], risk: 'Critical', color: '#EF4444', pulse: '1.2s' },
    { id: 6, name: 'Dir', pos: [35.2, 71.88], risk: 'Low', color: '#22C55E', pulse: '3s' },
];

const TREND_DATA = [
    { day: 'Mon', score: 45 },
    { day: 'Tue', score: 52 },
    { day: 'Wed', score: 48 },
    { day: 'Thu', score: 71 },
    { day: 'Fri', score: 68 },
    { day: 'Sat', score: 82 },
    { day: 'Sun', score: 94 },
];

const EVENT_HISTORY = [
    { time: '14:22:05', type: 'Locust Swarm', confidence: '98%', velocity: '12 km/h NE', status: 'Active' },
    { time: '13:45:12', type: 'Animal Herd', confidence: '89%', velocity: '8 km/h E', status: 'Monitoring' },
    { time: '12:30:41', type: 'Locust Swarm', confidence: '91%', velocity: '14 km/h NE', status: 'Resolved' },
    { time: '11:55:00', type: 'Movement Signature', confidence: '76%', velocity: '5 km/h N', status: 'Resolved' },
    { time: '10:10:22', type: 'Locust Swarm', confidence: '85%', velocity: '10 km/h NW', status: 'Resolved' },
];

const OFFICERS = ['Capt. Imran Shah', 'Lt. Fawad Khan', 'Maj. Sana Qureshi', 'Sgt. Bilal Ahmed'];

const ZONE_META = {
    District: 'Quetta District',
    Province: 'Balochistan',
    'Area (km²)': '2,653 km²',
    'Elevation Range': '1,680 – 3,470 m',
    'Vegetation Index': '0.28 (Sparse)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
// Inline Sidebar and Topbar removed, using global imports
const ZoneMap = ({ zone }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!zone || !mapRef.current) return;
        if (mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: zone.pos || [30.18, 67.0],
            zoom: 10,
            zoomControl: true,
            backgroundColor: '#080808'
        });

        // Tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO',
        }).addTo(map);

        // Primary zone marker
        const primaryIcon = L.divIcon({
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                <div style="position:absolute;width:40px;height:40px;border-radius:50%;border:2px solid ${zone.color};animation:zone-pulse ${zone.pulse} ease-out infinite;opacity:0;"></div>
                <div style="width:20px;height:20px;border-radius:50%;background:${zone.color};border:2px solid rgba(0,0,0,0.4);box-shadow:0 0 8px ${zone.color}99;"></div>
            </div>`,
        });
        L.marker(zone.pos, { icon: primaryIcon }).addTo(map);

        // Sub-detection points (dummy nearby offsets)
        const offsets = [[0.04, 0.07], [-0.05, 0.03], [0.02, -0.06]];
        offsets.forEach(([dlat, dlng]) => {
            const subIcon = L.divIcon({
                className: '',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                html: `<div style="width:12px;height:12px;border-radius:50%;background:#555;border:1px solid rgba(255,255,255,0.2);"></div>`,
            });
            L.marker([zone.pos[0] + dlat, zone.pos[1] + dlng], { icon: subIcon }).addTo(map);
        });

        const disableDrag = () => { if (map.dragging) map.dragging.disable() };
        const enableDrag = () => { if (map.dragging) map.dragging.enable() };
        const container = map.getContainer();
        container.addEventListener('mouseleave', disableDrag);
        container.addEventListener('mouseenter', enableDrag);

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                container.removeEventListener('mouseleave', disableDrag);
                container.removeEventListener('mouseenter', enableDrag);
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [zone]);

    return (
        <div className="map-wrapper" style={{ height: '100%', width: '100%', isolation: 'isolate', zIndex: 0, position: 'relative' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
        </div>
    );
};

const ReportModal = ({ zone, onClose, onShowToast }) => {
    const [reportType, setReportType] = useState('Full Report');
    const [includeCharts, setIncludeCharts] = useState(true);
    const [fromDate, setFromDate] = useState('2026-02-21');
    const [toDate, setToDate] = useState('2026-02-28');
    const [generating, setGenerating] = useState(false);

    const handleGenerate = () => {
        setGenerating(true);
        setTimeout(() => {
            // Build and download the file
            const content = `ASGUS-1 GSR SYSTEM REPORT\n======================\nZone: ${zone?.name}\nReport Type: ${reportType}\nDate Range: ${fromDate} to ${toDate}\nGenerated: ${new Date().toISOString()}\nConfidence: 94%\nRisk Level: ${zone?.risk || 'Medium'}\n\nThis report was generated by the ASGUS-1 GSR Intelligent Terrain Movement Detection System.`;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asgus1-report-${zone?.name}-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setGenerating(false);
            onClose();
            onShowToast('Report downloaded successfully');
        }, 2000);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Generate Zone Report</h3>
                    <button className="close-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="topbar-divider" style={{ width: '100%', margin: '16px 0' }}></div>
                <div className="modal-body">
                    <div className="input-group">
                        <label>Zone Name</label>
                        <input type="text" value={zone?.name || ''} readOnly className="modal-input read-only" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="input-group"><label>From</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="modal-input" /></div>
                        <div className="input-group"><label>To</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="modal-input" /></div>
                    </div>
                    <div className="input-group">
                        <label>Report Type</label>
                        <div className="pill-group">
                            {['Risk Analysis', 'Movement Summary', 'Full Report'].map(t => (
                                <button key={t} className={`pill-btn ${reportType === t ? 'active' : ''}`} onClick={() => setReportType(t)}>{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="toggle-group">
                        <span>Include Charts</span>
                        <label className="switch">
                            <input type="checkbox" checked={includeCharts} onChange={() => setIncludeCharts(!includeCharts)} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <button className="generate-btn" disabled={generating} onClick={handleGenerate}>
                        {generating ? <div className="spinner"></div> : 'GENERATE PDF →'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Modals ───────────────────────────────────────────────────────────────────
const AssignModal = ({ zone, onClose, onShowToast }) => {
    const [officer, setOfficer] = useState(OFFICERS[0]);
    const [notes, setNotes] = useState('');
    const [confirming, setConfirming] = useState(false);

    const handleConfirm = () => {
        setConfirming(true);
        setTimeout(() => {
            setConfirming(false);
            onClose();
            onShowToast(`Field officer ${officer} assigned to ${zone?.name} successfully`);
        }, 1500);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Assign Field Officer</h3>
                    <button className="close-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="topbar-divider" style={{ width: '100%', margin: '16px 0' }}></div>
                <div className="modal-body">
                    <div className="input-group">
                        <label>Zone</label>
                        <input type="text" value={zone?.name || ''} readOnly className="modal-input read-only" />
                    </div>
                    <div className="input-group">
                        <label>Select Officer</label>
                        <select className="modal-input" value={officer} onChange={e => setOfficer(e.target.value)} style={{ cursor: 'pointer' }}>
                            {OFFICERS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Notes</label>
                        <textarea className="modal-input" rows={3} placeholder="Deployment instructions..." value={notes}
                            onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <button className="generate-btn" disabled={confirming} onClick={handleConfirm}>
                        {confirming ? <div className="spinner"></div> : 'CONFIRM ASSIGNMENT'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ZoneDetailPage = () => {
    const { zoneName } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const role = user?.role || 'analyst';
    const isAnalyst = role === 'analyst';
    const isAdmin = role === 'admin';

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [toast, setToast] = useState(null);
    const [exporting, setExporting] = useState(false);
    const exportCardRef = useRef(null);

    const showGlobalToast = (msg, color) => {
        setToast({ msg, color: color || '#22C55E' });
        setTimeout(() => setToast(null), 3000);
    };

    const handleExport = async () => {
        if (!exportCardRef.current) return;
        setExporting(true);
        const el = exportCardRef.current;
        const origPadding = el.style.padding;
        el.style.padding = '24px';

        // Inject watermark
        const wm = document.createElement('div');
        wm.setAttribute('data-watermark', 'true');
        wm.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #1E1E1E;font-family:Space Mono,monospace;font-size:10px;color:#333;letter-spacing:0.08em;text-align:center;';
        wm.textContent = `ASGUS-1 GSR · ${zoneData?.name?.toUpperCase()} · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        el.appendChild(wm);

        try {
            const canvas = await html2canvas(el, {
                backgroundColor: '#0D0D0D',
                scale: 2,
                useCORS: true,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `asgus1-zone-${zoneData?.name}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showGlobalToast('Zone card exported as PNG', '#22C55E');
        } finally {
            el.style.padding = origPadding;
            el.removeChild(wm);
            setExporting(false);
        }
    };

    // Try to get zone from router state, else find by name
    const zoneData = location.state?.zone || RISK_ZONES.find(z => z.name === zoneName) || RISK_ZONES[0];

    const statusColor = { Active: '#EF4444', Monitoring: '#F59E0B', Resolved: '#22C55E' };

    return (
        <div className="dashboard-container">
            <Topbar subtitle={`Zone Detail: ${zoneData?.name || ''}`} />

            <div className="main-wrapper">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

                <main style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Back button */}
                    <div>
                        <button
                            onClick={() => navigate('/analyst')}
                            className="layer-btn"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
                        >
                            <ArrowLeft size={14} /> Back to Dashboard
                        </button>
                    </div>

                    {/* ── TOP ROW ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: 20 }}>

                        {/* Zone Map */}
                        <div style={{ background: '#000', borderRadius: 8, border: '1px solid #1E1E1E', overflow: 'hidden', height: 380, position: 'relative' }}>
                            <style>{`
                                @keyframes zone-pulse {
                                    0%   { transform: scale(1);   opacity: 0.7; }
                                    100% { transform: scale(2.2); opacity: 0;   }
                                }
                            `}</style>
                            <ZoneMap zone={zoneData} />
                            {/* Coordinates overlay */}
                            <div className="mono" style={{
                                position: 'absolute', bottom: 10, left: 12, zIndex: 1000,
                                fontSize: 10, color: '#F59E0B', background: 'rgba(0,0,0,0.65)',
                                padding: '4px 8px', borderRadius: 4
                            }}>
                                {zoneData?.pos[0].toFixed(4)} N &nbsp;·&nbsp; {zoneData?.pos[1].toFixed(4)} E
                            </div>
                        </div>

                        {/* Zone Summary Panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div ref={exportCardRef} style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Header */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{zoneData?.name}</h2>
                                        <span className="risk-pill" style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            color: zoneData?.color,
                                            fontSize: 11, padding: '3px 10px'
                                        }}>
                                            {zoneData?.risk?.toUpperCase()} RISK
                                        </span>
                                    </div>
                                    <div className="mono" style={{ fontSize: 11, color: '#555' }}>Last detected: 14:22:05 UTC</div>
                                </div>

                                {/* 2x2 Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {[
                                        { label: 'CONFIDENCE SCORE', value: '94%', color: '#F59E0B' },
                                        { label: 'EVENT TYPE', value: 'Locust Swarm', color: '#F5F5F5' },
                                        { label: 'VELOCITY', value: '12 km/h NE', color: '#F5F5F5' },
                                        { label: 'DBSCAN CLUSTERS', value: '7', color: '#F59E0B' },
                                    ].map(s => (
                                        <div key={s.label} className="stat-card" style={{ padding: 14 }}>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
                                            <div className="stat-label">{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Zone Metadata */}
                                <div>
                                    <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>Zone Metadata</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {Object.entries(ZONE_META).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                                <span style={{ color: '#555' }}>{k}</span>
                                                <span style={{ color: '#F5F5F5', fontWeight: 500 }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons - OUTSIDE ref */}
                            <div className="zone-actions" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <button className="generate-btn" onClick={() => setShowReportModal(true)}>
                                    Generate Report
                                </button>
                                <button
                                    className="drawer-btn btn-outline"
                                    style={{ padding: '12px', fontSize: 13, width: '100%', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    onClick={handleExport}
                                    disabled={exporting}
                                >
                                    {exporting ? <div className="spinner" /> : <><Download size={14} /> Export Card</>}
                                </button>
                                {(isAnalyst || isAdmin) && (
                                    <button
                                        className="drawer-btn btn-outline"
                                        style={{ padding: '12px', fontSize: 13, width: '100%', borderRadius: 6 }}
                                        onClick={() => setShowAssignModal(true)}
                                    >
                                        Assign Field Officer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── BOTTOM ROW ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                        {/* Risk Trend Chart */}
                        <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 8, padding: 20 }}>
                            <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
                                Risk Score — Last 7 Days
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={TREND_DATA} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                    <defs>
                                        <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#1E1E1E" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false} tickLine={false}
                                        tick={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fill: '#555' }}
                                    />
                                    <YAxis
                                        domain={[0, 100]} axisLine={false} tickLine={false}
                                        tick={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fill: '#555' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 4, fontSize: 11 }}
                                        itemStyle={{ color: '#F59E0B' }}
                                        cursor={{ stroke: '#2A2A2A' }}
                                    />
                                    <Area
                                        type="monotone" dataKey="score"
                                        stroke="#F59E0B" strokeWidth={2}
                                        fill="url(#amberGrad)"
                                        dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }}
                                        activeDot={{ r: 6, fill: '#F59E0B', strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Event History Table */}
                        <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 8, padding: 20 }}>
                            <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                                Detection Event History
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: '#161616' }}>
                                        {['Time', 'Event Type', 'Confidence', 'Velocity', 'Status'].map(col => (
                                            <th key={col} style={{
                                                padding: '8px 10px', textAlign: 'left',
                                                color: '#555', fontFamily: 'Space Mono, monospace',
                                                fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                                                borderBottom: '1px solid #1E1E1E'
                                            }}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {EVENT_HISTORY.map((row, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? '#0D0D0D' : '#111111' }}>
                                            <td style={{ padding: '10px 10px', fontFamily: 'Space Mono, monospace', borderBottom: '1px solid #1E1E1E', color: '#888' }}>{row.time}</td>
                                            <td style={{ padding: '10px 10px', borderBottom: '1px solid #1E1E1E', color: '#F5F5F5' }}>{row.type}</td>
                                            <td style={{ padding: '10px 10px', fontFamily: 'Space Mono, monospace', borderBottom: '1px solid #1E1E1E', color: '#F5F5F5' }}>{row.confidence}</td>
                                            <td style={{ padding: '10px 10px', borderBottom: '1px solid #1E1E1E', color: '#F5F5F5' }}>{row.velocity}</td>
                                            <td style={{ padding: '10px 10px', borderBottom: '1px solid #1E1E1E' }}>
                                                <span style={{
                                                    background: statusColor[row.status] + '22',
                                                    color: statusColor[row.status],
                                                    borderRadius: 4, padding: '2px 8px',
                                                    fontSize: 10, fontWeight: 700
                                                }}>{row.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modals */}
            {showReportModal && <ReportModal zone={zoneData} onClose={() => setShowReportModal(false)} onShowToast={showGlobalToast} />}
            {showAssignModal && <AssignModal zone={zoneData} onClose={() => setShowAssignModal(false)} onShowToast={showGlobalToast} />}

            {/* Global Toast */}
            {toast && (
                <div className="success-toast" style={{ background: toast.color ? `${toast.color}18` : undefined, borderColor: toast.color || undefined, color: toast.color || undefined }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default ZoneDetailPage;
