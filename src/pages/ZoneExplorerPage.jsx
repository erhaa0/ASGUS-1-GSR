import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Bell, Navigation, BarChart3, FileText,
    Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown,
    LayoutGrid, List, Search, Clock, Activity, ArrowUpRight,
    MapPinOff, Download, X, User, Lock
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { fetchZones, downloadReport } from '../api/api';
import './AnalystDashboard.css';
import './ZoneExplorerPage.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const RISK_COLORS = {
    Critical: { bg: 'rgba(239,68,68,0.12)',  color: '#EF4444', border: 'rgba(239,68,68,0.3)',  solid: '#EF4444' },
    High:     { bg: 'rgba(249,115,22,0.12)', color: '#F97316', border: 'rgba(249,115,22,0.3)', solid: '#F97316' },
    Medium:   { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)', solid: '#F59E0B' },
    Low:      { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', border: 'rgba(34,197,94,0.3)',  solid: '#22C55E' },
};

// ─── Shared Components ────────────────────────────────────────────────────────
const RiskPill = ({ risk }) => {
    const c = RISK_COLORS[risk] || RISK_COLORS.Low;
    return (
        <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 9px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', display: 'inline-block' }}>
            {risk.toUpperCase()}
        </span>
    );
};

// ─── Generate Modal ───────────────────────────────────────────────────────────
const GenerateModal = ({ zone, onClose, onGenerated }) => {
    const [reportType, setReportType]     = useState('Full Report');
    const [fromDate, setFromDate]         = useState('2026-02-21');
    const [toDate, setToDate]             = useState('2026-02-28');
    const [includeCharts, setIncludeCharts] = useState(true);
    const [generating, setGenerating]     = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await downloadReport(zone.zone_id);
            onClose();
            onGenerated('Report downloaded successfully');
        } catch (err) {
            console.error('Report failed:', err);
            setGenerating(false);
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
                        <input type="text" value={zone?.zone_name || ''} readOnly className="modal-input read-only" />
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const ZoneExplorerPage = () => {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [viewMode, setViewMode]                 = useState('grid');

    // ── Real data state ───────────────────────────────
    const [zones, setZones]       = useState([]);
    const [generateZone, setGenerateZone] = useState(null);
    const [toast, setToast]       = useState(null);

    // ── Fetch zones from backend ──────────────────────
    useEffect(() => {
        const loadZones = async () => {
            try {
                const data = await fetchZones();
                if (data) setZones(data);
            } catch (err) {
                console.error('Failed to load zones:', err);
            }
        };
        loadZones();
    }, []);

    // Filters
    const [search, setSearch]         = useState('');
    const [province, setProvince]     = useState('All Provinces');
    const [risk, setRisk]             = useState('All Levels');
    const [eventType, setEventType]   = useState('All Types');
    const [status, setStatus]         = useState('All Status');

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const clearFilters = () => {
        setSearch(''); setProvince('All Provinces'); setRisk('All Levels');
        setEventType('All Types'); setStatus('All Status');
    };

    // ── Summary counts ────────────────────────────────
    const criticalCount    = zones.filter(z => z.risk_level === 'Critical').length;
    const highCount        = zones.filter(z => z.risk_level === 'High').length;
    const monitoringCount  = zones.filter(z => z.risk_level === 'Medium' || z.risk_level === 'Low').length;

    const filteredZones = useMemo(() => zones.filter(z => {
        if (search && !z.zone_name.toLowerCase().includes(search.toLowerCase())) return false;
        if (province !== 'All Provinces' && z.province !== province) return false;
        if (risk !== 'All Levels' && z.risk_level !== risk) return false;
        if (status !== 'All Status' && z.status !== status) return false;
        return true;
    }), [zones, search, province, risk, eventType, status]);

    const selectStyle = {
        background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5',
        borderRadius: 6, padding: '8px 12px', fontSize: 13, cursor: 'pointer',
        outline: 'none', fontFamily: 'inherit'
    };

    return (
        <div className="dashboard-container">
            <Topbar subtitle="Zone Explorer" />
            <div className="main-wrapper">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

                <main style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Page Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.01em' }}>Zone Explorer</h1>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>Browse and investigate all monitored zones across Balochistan and KPK</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className={`ze-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                                <LayoutGrid size={18} />
                            </button>
                            <button className={`ze-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                                <List size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', width: 240 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                            <input
                                type="text" placeholder="Search zones..." value={search} onChange={e => setSearch(e.target.value)}
                                style={{ ...selectStyle, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <select style={selectStyle} value={province} onChange={e => setProvince(e.target.value)}>
                            {['All Provinces', 'Balochistan', 'KPK'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <select style={selectStyle} value={risk} onChange={e => setRisk(e.target.value)}>
                            {['All Levels', 'Critical', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <select style={selectStyle} value={eventType} onChange={e => setEventType(e.target.value)}>
                            {['All Types', 'Locust Swarm', 'Animal Herd', 'Unknown'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <select style={selectStyle} value={status} onChange={e => setStatus(e.target.value)}>
                            {['All Status', 'Active', 'Monitoring', 'Cleared'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <button
                            onClick={clearFilters}
                            style={{ background: 'transparent', border: 'none', color: '#F59E0B', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto', fontWeight: 500 }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                            Clear Filters
                        </button>
                    </div>

                    {/* Summary Strip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 8, padding: '10px 20px', fontSize: 12, color: '#666', fontFamily: 'Space Grotesk, sans-serif' }}>
                        <div><span style={{ color: '#F5F5F5', fontWeight: 600 }}>{zones.length}</span> Total Zones</div>
                        <div style={{ width: 1, height: 16, background: '#1E1E1E' }}></div>
                        <div><span style={{ color: '#EF4444', fontWeight: 600 }}>{criticalCount}</span> Critical</div>
                        <div style={{ width: 1, height: 16, background: '#1E1E1E' }}></div>
                        <div><span style={{ color: '#F97316', fontWeight: 600 }}>{highCount}</span> High</div>
                        <div style={{ width: 1, height: 16, background: '#1E1E1E' }}></div>
                        <div><span style={{ color: '#22C55E', fontWeight: 600 }}>{monitoringCount}</span> Monitoring or Cleared</div>
                    </div>

                    {/* Main Content */}
                    {filteredZones.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
                            <MapPinOff size={48} color="#333" />
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5' }}>No zones match your filters</div>
                            <div style={{ fontSize: 14, color: '#555' }}>Try adjusting the filters above</div>
                            <button onClick={clearFilters} style={{ background: 'transparent', border: '1px solid #F59E0B', color: '#F59E0B', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>Clear Filters</button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="ze-grid">
                            {filteredZones.map(z => {
                                const rc   = RISK_COLORS[z.risk_level] || RISK_COLORS.Low;
                                const conf = Math.round((z.confidence || 0) * 100);
                                return (
                                    <div key={z.zone_id} className="ze-card" style={{ borderLeftColor: rc.solid }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: '#F5F5F5' }}>{z.zone_name}</div>
                                            <RiskPill risk={z.risk_level} />
                                        </div>
                                        <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
                                            {z.province} &middot; {z.zone_name} District
                                        </div>
                                        <div className="topbar-divider" style={{ width: '100%', margin: '12px 0' }}></div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                                            <span style={{ color: '#666' }}>Confidence</span>
                                            <span className="mono" style={{ color: '#F59E0B', fontWeight: 700 }}>{conf}%</span>
                                        </div>
                                        <div style={{ height: 6, background: '#1E1E1E', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${conf}%`, background: rc.solid }}></div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#aaa' }}>
                                                <Clock size={14} color="#555" />
                                                <span className="mono" style={{ fontSize: 11 }}>
                                                    {z.last_detected
                                                        ? new Date(z.last_detected).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC'
                                                        : 'No detections yet'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#aaa' }}>
                                                <Activity size={14} color="#555" /> <span>Locust Swarm</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#aaa' }}>
                                                <ArrowUpRight size={14} color="#555" />
                                                <span className="mono" style={{ fontSize: 11 }}>{z.status || 'Monitoring'}</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="drawer-btn btn-outline" style={{ flex: 1, padding: '8px 0', fontSize: 12 }} onClick={() => navigate(`/zone/${z.zone_name}`)}>
                                                View Detail
                                            </button>
                                            <button className="generate-btn" style={{ width: 40, padding: 0 }} title="Generate Report" onClick={() => setGenerateZone(z)}>
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 8, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#111111' }}>
                                        {['Zone', 'Province', 'Risk Level', 'Confidence', 'Status', 'Last Detected', 'Actions'].map(col => (
                                            <th key={col} style={{ padding: '12px 20px', textAlign: 'left', color: '#555', fontFamily: 'Space Mono, monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, borderBottom: '1px solid #1A1A1A' }}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredZones.map((z, i) => {
                                        const conf = Math.round((z.confidence || 0) * 100);
                                        return (
                                            <tr
                                                key={z.zone_id}
                                                className="ze-row"
                                                style={{ background: i % 2 === 0 ? '#0D0D0D' : '#0F0F0F' }}
                                                onClick={(e) => {
                                                    if (e.target.closest('button')) return;
                                                    navigate(`/zone/${z.zone_name}`);
                                                }}
                                            >
                                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #1A1A1A', fontWeight: 700, color: '#F5F5F5' }}>{z.zone_name}</td>
                                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #1A1A1A', fontSize: 13, color: '#999' }}>{z.province}</td>
                                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #1A1A1A' }}><RiskPill risk={z.risk_level} /></td>
                                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #1A1A1A', fontFamily: 'Space Mono', fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>{conf}%</td>
                                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #1A1A1A', fontSize: 13, color: '#F5F5F5' }}>{z.status || 'Monitoring'}</td>
                                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #1A1A1A', fontFamily: 'Space Mono', fontSize: 11, color: '#666' }}>
                                                    {z.last_detected
                                                        ? new Date(z.last_detected).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC'
                                                        : 'N/A'}
                                                </td>
                                                <td style={{ padding: '14px 20px', borderBottom: '1px solid #1A1A1A' }}>
                                                    <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                                                        <button className="drawer-btn btn-outline" style={{ padding: '6px 12px', fontSize: 11, width: 'auto' }} onClick={() => navigate(`/zone/${z.zone_name}`)}>
                                                            View Detail
                                                        </button>
                                                        <button className="generate-btn" style={{ padding: '6px', width: 'auto', background: '#161616', border: '1px solid #2A2A2A', color: '#F5F5F5' }} onClick={() => setGenerateZone(z)}>
                                                            <Download size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>

            {generateZone && (
                <GenerateModal
                    zone={generateZone}
                    onClose={() => setGenerateZone(null)}
                    onGenerated={showToast}
                />
            )}

            {toast && <div className="success-toast" style={{ zIndex: 9999 }}>{toast}</div>}
        </div>
    );
};

export default ZoneExplorerPage;