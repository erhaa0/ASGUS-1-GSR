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
import { fetchZone, fetchDetections, downloadReport, fetchFieldOfficers, updateUser } from '../api/api';
import './AnalystDashboard.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const RISK_COLOR_MAP = {
    Critical: '#EF4444',
    High:     '#F97316',
    Medium:   '#F59E0B',
    Low:      '#22C55E',
};

const RISK_PULSE_MAP = {
    Critical: '1.2s',
    High:     '2s',
    Medium:   '2.5s',
    Low:      '3s',
};

const ZONE_ID_MAP = {
    Quetta: 'quetta',
    Kech:   'kech',
    Zhob:   'zhob',
    Pishin: 'pishin',
    Swat:   'swat',
    Dir:    'dir',
};

const OFFICERS = ['Capt. Imran Shah', 'Lt. Fawad Khan', 'Maj. Sana Qureshi', 'Sgt. Bilal Ahmed'];

const TREND_DATA = [
    { day: 'Mon', score: 45 },
    { day: 'Tue', score: 52 },
    { day: 'Wed', score: 48 },
    { day: 'Thu', score: 71 },
    { day: 'Fri', score: 68 },
    { day: 'Sat', score: 82 },
    { day: 'Sun', score: 94 },
];

// ─── Zone Map ─────────────────────────────────────────────────────────────────
const ZoneMap = ({ zone }) => {
    const mapRef         = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!zone || !mapRef.current || mapInstanceRef.current) return;

        const pos = zone.pos || [zone.lat, zone.lon] || [30.18, 67.0];
        const map = L.map(mapRef.current, {
            center: pos, zoom: 10,
            zoomControl: true, backgroundColor: '#080808'
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO',
        }).addTo(map);

        const color = zone.color || RISK_COLOR_MAP[zone.risk_level] || '#F59E0B';
        const pulse = zone.pulse || RISK_PULSE_MAP[zone.risk_level] || '2s';

        const primaryIcon = L.divIcon({
            className: '',
            iconSize: [40, 40], iconAnchor: [20, 20],
            html: `<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                <div style="position:absolute;width:40px;height:40px;border-radius:50%;border:2px solid ${color};animation:zone-pulse ${pulse} ease-out infinite;opacity:0;"></div>
                <div style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid rgba(0,0,0,0.4);box-shadow:0 0 8px ${color}99;"></div>
            </div>`,
        });
        L.marker(pos, { icon: primaryIcon }).addTo(map);

        const offsets = [[0.04, 0.07], [-0.05, 0.03], [0.02, -0.06]];
        offsets.forEach(([dlat, dlng]) => {
            const subIcon = L.divIcon({
                className: '',
                iconSize: [16, 16], iconAnchor: [8, 8],
                html: `<div style="width:12px;height:12px;border-radius:50%;background:#555;border:1px solid rgba(255,255,255,0.2);"></div>`,
            });
            L.marker([pos[0] + dlat, pos[1] + dlng], { icon: subIcon }).addTo(map);
        });

        const disableDrag = () => { if (map.dragging) map.dragging.disable(); };
        const enableDrag  = () => { if (map.dragging) map.dragging.enable(); };
        const container   = map.getContainer();
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

// ─── Report Modal ─────────────────────────────────────────────────────────────
const ReportModal = ({ zone, onClose, onShowToast }) => {
    const [reportType, setReportType]     = useState('Full Report');
    const [includeCharts, setIncludeCharts] = useState(true);
    const [fromDate, setFromDate]         = useState('2026-02-21');
    const [toDate, setToDate]             = useState('2026-02-28');
    const [generating, setGenerating]     = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const zoneId = zone?.zone_id || zone?.id || ZONE_ID_MAP[zone?.name] || zone?.name?.toLowerCase() || 'quetta';
            await downloadReport(zoneId);
            onClose();
            onShowToast('Report downloaded successfully');
        } catch (err) {
            console.error('Report failed:', err);
            setGenerating(false);
            onShowToast('Failed to download report — check console');
        }
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
                        <input type="text" value={zone?.name || zone?.zone_name || ''} readOnly className="modal-input read-only" />
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

// ─── Assign Modal ─────────────────────────────────────────────────────────────
const AssignModal = ({ zone, officers, onClose, onShowToast }) => {
    const displayOfficers = officers && officers.length > 0 ? officers : OFFICERS.map(name => ({ user_id: name, full_name: name }));
    const [officerId, setOfficerId]   = useState(displayOfficers[0]?.user_id || '');
    const [notes, setNotes]           = useState('');
    const [confirming, setConfirming] = useState(false);

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            const zoneId      = zone?.id || zone?.zone_id;
            const officerName = displayOfficers.find(o => o.user_id === officerId)?.full_name || officerId;
            if (zoneId && officerId) {
                await updateUser(officerId, { assigned_zone: zoneId });
            }
            onClose();
            onShowToast(`Field officer ${officerName} assigned to ${zone?.name || zone?.zone_name} successfully`);
        } catch (err) {
            console.error('Assignment failed:', err);
            setConfirming(false);
        }
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
                        <input type="text" value={zone?.name || zone?.zone_name || ''} readOnly className="modal-input read-only" />
                    </div>
                    <div className="input-group">
                        <label>Select Officer</label>
                        <select className="modal-input" value={officerId} onChange={e => setOfficerId(e.target.value)} style={{ cursor: 'pointer' }}>
                            {displayOfficers.map(o => <option key={o.user_id} value={o.user_id}>{o.full_name}</option>)}
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
    const { zoneName }  = useParams();
    const navigate      = useNavigate();
    const location      = useLocation();
    const { user }      = useUser();
    const role          = user?.role || 'analyst';
    const isAnalyst     = role === 'analyst';
    const isAdmin       = role === 'admin';
    const dashboardPath = role === 'field-officer' ? '/field-officer' : role === 'admin' ? '/admin' : '/analyst';

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [showReportModal, setShowReportModal]   = useState(false);
    const [showAssignModal, setShowAssignModal]   = useState(false);
    const [toast, setToast]                       = useState(null);
    const [exporting, setExporting]               = useState(false);
    const exportCardRef = useRef(null);

    // ── Real data state ───────────────────────────────
    const [zoneData, setZoneData]         = useState(location.state?.zone || null);
    const [detections, setDetections]     = useState([]);
    const [trendData, setTrendData]       = useState(TREND_DATA);
    const [fieldOfficers, setFieldOfficers] = useState([]);

    // ── Fetch zone + detections + field officers ──────
    useEffect(() => {
        const loadData = async () => {
            try {
                const zoneId = ZONE_ID_MAP[zoneName] || zoneName || 'quetta';

                const [zoneRes, detectionsRes, officersRes] = await Promise.all([
                    fetchZone(zoneId),
                    fetchDetections({ zone_id: zoneId, limit: 100 }),
                    fetchFieldOfficers(),
                ]);

                if (zoneRes) {
                    setZoneData({
                        ...zoneRes,
                        name:  zoneRes.zone_name,
                        pos:   [zoneRes.lat, zoneRes.lon],
                        risk:  zoneRes.risk_level,
                        color: RISK_COLOR_MAP[zoneRes.risk_level] || '#F59E0B',
                        pulse: RISK_PULSE_MAP[zoneRes.risk_level] || '2s',
                        id:    zoneRes.zone_id,
                    });
                }

                if (detectionsRes && detectionsRes.length > 0) {
                    // Table: latest 5
                    setDetections(detectionsRes.slice(0, 5).map(d => ({
                        time:       d.detected_at
                            ? new Date(d.detected_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '--:--:--',
                        type:       d.event_type || 'Locust Swarm',
                        confidence: `${Math.round((d.confidence || 0) * 100)}%`,
                        velocity:   d.velocity || 'N/A',
                        status:     d.status || 'Active',
                    })));

                    // Trend chart: group by day, average risk_score
                    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayMap = {};
                    detectionsRes.forEach(d => {
                        if (!d.detected_at) return;
                        const day = DAY_NAMES[new Date(d.detected_at).getDay()];
                        if (!dayMap[day]) dayMap[day] = { sum: 0, count: 0 };
                        dayMap[day].sum   += (d.risk_score || 0) * 100;
                        dayMap[day].count += 1;
                    });
                    const today = new Date();
                    const last7 = Array.from({ length: 7 }, (_, i) => {
                        const d = new Date(today);
                        d.setDate(d.getDate() - (6 - i));
                        return DAY_NAMES[d.getDay()];
                    });
                    const trend = last7.map(day => ({
                        day,
                        score: dayMap[day]
                            ? Math.round(dayMap[day].sum / dayMap[day].count)
                            : 0,
                    }));
                    if (trend.some(t => t.score > 0)) setTrendData(trend);
                }

                if (officersRes) setFieldOfficers(officersRes);
            } catch (err) {
                console.error('Failed to load zone detail:', err);
            }
        };
        loadData();
    }, [zoneName]);

    const showGlobalToast = (msg, color) => {
        setToast({ msg, color: color || '#22C55E' });
        setTimeout(() => setToast(null), 3000);
    };

    const handleExport = async () => {
        if (!exportCardRef.current) return;
        setExporting(true);
        const el          = exportCardRef.current;
        const origPadding = el.style.padding;
        el.style.padding  = '24px';

        const wm = document.createElement('div');
        wm.setAttribute('data-watermark', 'true');
        wm.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #1E1E1E;font-family:Space Mono,monospace;font-size:10px;color:#333;letter-spacing:0.08em;text-align:center;';
        wm.textContent = `ASGUS-1 GSR · ${zoneData?.name?.toUpperCase()} · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        el.appendChild(wm);

        try {
            const canvas = await html2canvas(el, { backgroundColor: '#0D0D0D', scale: 2, useCORS: true, logging: false });
            const link   = document.createElement('a');
            link.download = `asgus1-zone-${zoneData?.name}-${Date.now()}.png`;
            link.href     = canvas.toDataURL('image/png');
            link.click();
            showGlobalToast('Zone card exported as PNG', '#22C55E');
        } finally {
            el.style.padding = origPadding;
            el.removeChild(wm);
            setExporting(false);
        }
    };

    const statusColor = { Active: '#EF4444', Monitoring: '#F59E0B', Resolved: '#22C55E' };

    // Zone meta from real data
    const zoneMeta = {
        Province:          zoneData?.province || 'Balochistan',
        'Risk Level':      zoneData?.risk_level || zoneData?.risk || 'N/A',
        'Confidence':      zoneData?.confidence ? `${Math.round(zoneData.confidence * 100)}%` : 'N/A',
        'Sensitivity':     zoneData?.sensitivity_weight || 'N/A',
        'Last Detected':   zoneData?.last_detected
            ? new Date(zoneData.last_detected).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : 'N/A',
    };

    // Latest detection stats
    const latest = detections[0];

    return (
        <div className="dashboard-container">
            <Topbar subtitle={`Zone Detail: ${zoneData?.name || zoneName || ''}`} />

            <div className="main-wrapper">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

                <main style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Back button */}
                    <div>
                        <button
                            onClick={() => navigate(dashboardPath)}
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
                            {zoneData && <ZoneMap zone={zoneData} />}
                            <div className="mono" style={{
                                position: 'absolute', bottom: 10, left: 12, zIndex: 1000,
                                fontSize: 10, color: '#F59E0B', background: 'rgba(0,0,0,0.65)',
                                padding: '4px 8px', borderRadius: 4
                            }}>
                                {zoneData?.lat?.toFixed(4) || (zoneData?.pos?.[0]?.toFixed(4))} N &nbsp;·&nbsp; {zoneData?.lon?.toFixed(4) || (zoneData?.pos?.[1]?.toFixed(4))} E
                            </div>
                        </div>

                        {/* Zone Summary Panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div ref={exportCardRef} style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{zoneData?.name || zoneName}</h2>
                                        <span className="risk-pill" style={{ background: 'rgba(255,255,255,0.06)', color: zoneData?.color, fontSize: 11, padding: '3px 10px' }}>
                                            {(zoneData?.risk || zoneData?.risk_level || 'N/A').toUpperCase()} RISK
                                        </span>
                                    </div>
                                    <div className="mono" style={{ fontSize: 11, color: '#555' }}>
                                        Last detected: {zoneData?.last_detected
                                            ? new Date(zoneData.last_detected).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC'
                                            : 'N/A'}
                                    </div>
                                </div>

                                {/* 2x2 Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {[
                                        { label: 'CONFIDENCE SCORE', value: zoneData?.confidence ? `${Math.round(zoneData.confidence * 100)}%` : (latest?.confidence || 'N/A'), color: '#F59E0B' },
                                        { label: 'EVENT TYPE',       value: latest?.type || 'Locust Swarm', color: '#F5F5F5' },
                                        { label: 'VELOCITY',         value: latest?.velocity || 'N/A',       color: '#F5F5F5' },
                                        { label: 'DBSCAN CLUSTERS',  value: detections.length > 0 ? String(detections.length) : 'N/A', color: '#F59E0B' },
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
                                        {Object.entries(zoneMeta).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                                <span style={{ color: '#555' }}>{k}</span>
                                                <span style={{ color: '#F5F5F5', fontWeight: 500 }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
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
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                    <defs>
                                        <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="#1E1E1E" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fill: '#555' }} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fill: '#555' }} />
                                    <Tooltip
                                        contentStyle={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 4, fontSize: 11 }}
                                        itemStyle={{ color: '#F59E0B' }}
                                        cursor={{ stroke: '#2A2A2A' }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#F59E0B" strokeWidth={2} fill="url(#amberGrad)"
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
                                            <th key={col} style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', borderBottom: '1px solid #1E1E1E' }}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detections.length > 0 ? detections.map((row, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? '#0D0D0D' : '#111111' }}>
                                            <td style={{ padding: '10px 10px', fontFamily: 'Space Mono, monospace', borderBottom: '1px solid #1E1E1E', color: '#888' }}>{row.time}</td>
                                            <td style={{ padding: '10px 10px', borderBottom: '1px solid #1E1E1E', color: '#F5F5F5' }}>{row.type}</td>
                                            <td style={{ padding: '10px 10px', fontFamily: 'Space Mono, monospace', borderBottom: '1px solid #1E1E1E', color: '#F5F5F5' }}>{row.confidence}</td>
                                            <td style={{ padding: '10px 10px', borderBottom: '1px solid #1E1E1E', color: '#F5F5F5' }}>{row.velocity}</td>
                                            <td style={{ padding: '10px 10px', borderBottom: '1px solid #1E1E1E' }}>
                                                <span style={{ background: (statusColor[row.status] || '#666') + '22', color: statusColor[row.status] || '#666', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#555', fontSize: 13 }}>
                                                No detections yet. Trigger a detection job from Admin Panel.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {showReportModal && <ReportModal zone={zoneData} onClose={() => setShowReportModal(false)} onShowToast={showGlobalToast} />}
            {showAssignModal && <AssignModal zone={zoneData} officers={fieldOfficers} onClose={() => setShowAssignModal(false)} onShowToast={showGlobalToast} />}

            {toast && (
                <div className="success-toast" style={{ background: toast.color ? `${toast.color}18` : undefined, borderColor: toast.color || undefined, color: toast.color || undefined }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};

export default ZoneDetailPage;
