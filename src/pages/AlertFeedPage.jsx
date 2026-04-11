import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Bell, Navigation, BarChart3, FileText,
    Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown,
    Search, Check, ExternalLink, X, BellOff, Activity, Clock
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import './AnalystDashboard.css';
import './AlertFeedPage.css';

// ─── Constants & Data ─────────────────────────────────────────────────────────
const RISK_COLORS = {
    Critical: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '#EF4444' },
    High: { bg: 'rgba(249,115,22,0.12)', color: '#F97316', border: '#F97316' },
    Medium: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '#F59E0B' },
    Low: { bg: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '#22C55E' },
};

const STATUS_INDICATORS = {
    Active: '#EF4444',
    Monitoring: '#F59E0B',
    Resolved: '#22C55E',
    Dismissed: '#666666'
};

const INITIAL_ALERTS = [
    { id: 'ALT-0047', zone: 'Swat', province: 'KPK', risk: 'Critical', status: 'Active', type: 'Locust Swarm', time: '28 Feb 2026 · 14:22:05 PKT', timestamp: 1709115725000, conf: 98, vel: '22 km/h NE', clusters: 14, desc: 'Large scale locust swarm detected via DBSCAN clustering. 14 anomalous regions identified. Movement NE at 22 km/h. Confidence 98%.' },
    { id: 'ALT-0046', zone: 'Kech', province: 'Balochistan', risk: 'Critical', status: 'Active', type: 'Unknown', time: '28 Feb 2026 · 14:15:30 PKT', timestamp: 1709115330000, conf: 97, vel: '18 km/h NW', clusters: 11, desc: 'Rapid movement signature detected near Kech crossing. Image differencing shows 340 sq km affected area. Confidence 97%.' },
    { id: 'ALT-0045', zone: 'Quetta', province: 'Balochistan', risk: 'High', status: 'Monitoring', type: 'Unknown', time: '28 Feb 2026 · 13:42:15 PKT', timestamp: 1709113335000, conf: 89, vel: '10 km/h NW', clusters: 6, desc: 'Sustained terrain vibration pattern detected south of Quetta. Multiple signatures confirmed across 3 consecutive image pairs. Confidence 89%.' },
    { id: 'ALT-0044', zone: 'Zhob', province: 'Balochistan', risk: 'High', status: 'Monitoring', type: 'Locust Swarm', time: '28 Feb 2026 · 12:15:00 PKT', timestamp: 1709108100000, conf: 91, vel: '8 km/h NE', clusters: 8, desc: 'Secondary locust cluster forming in agricultural sector 4. Slow NE drift observed. Confidence 91%.' },
    { id: 'ALT-0043', zone: 'Pishin', province: 'Balochistan', risk: 'Medium', status: 'Active', type: 'Animal Herd', time: '28 Feb 2026 · 11:30:45 PKT', timestamp: 1709105445000, conf: 82, vel: '5 km/h SE', clusters: 4, desc: 'Scattered movement patterns detected across Pishin plains. Low velocity suggests animal herd. Monitoring for convergence. Confidence 82%.' },
    { id: 'ALT-0042', zone: 'Dir', province: 'KPK', risk: 'Low', status: 'Resolved', type: 'Unknown', time: '28 Feb 2026 · 09:12:30 PKT', timestamp: 1709097150000, conf: 38, vel: '3 km/h S', clusters: 2, desc: 'Minor movement anomaly detected. Subsequent image pair showed dissipation. Likely natural wildlife. Confidence 38%.' },
    { id: 'ALT-0041', zone: 'Swat', province: 'KPK', risk: 'Critical', status: 'Active', type: 'Locust Swarm', time: '27 Feb 2026 · 18:45:00 PKT', timestamp: 1709045100000, conf: 96, vel: '28 km/h NE', clusters: 17, desc: 'Follow-up detection on ALT-0047 corridor. Swarm density increasing. Velocity accelerating to 28 km/h. Confidence 96%.' },
    { id: 'ALT-0040', zone: 'Quetta', province: 'Balochistan', risk: 'High', status: 'Active', type: 'Unknown', time: '27 Feb 2026 · 15:20:10 PKT', timestamp: 1709032810000, conf: 84, vel: '14 km/h N', clusters: 7, desc: 'New movement cluster forming north of previous ALT-0045 zone. Possible split swarm behavior. Confidence 84%.' },
    { id: 'ALT-0039', zone: 'Kech', province: 'Balochistan', risk: 'Medium', status: 'Monitoring', type: 'Locust Swarm', time: '27 Feb 2026 · 11:05:25 PKT', timestamp: 1709017525000, conf: 71, vel: '12 km/h W', clusters: 5, desc: 'Reduced movement activity vs previous detection. Swarm may be settling. Confidence 71%.' },
    { id: 'ALT-0038', zone: 'Zhob', province: 'Balochistan', risk: 'Low', status: 'Resolved', type: 'Animal Herd', time: '26 Feb 2026 · 08:30:00 PKT', timestamp: 1708921800000, conf: 42, vel: '4 km/h E', clusters: 3, desc: 'False positive confirmed by field officer observation. Animal herd, no agricultural threat. Confidence 42%.' }
];

// ─── Shared Components ────────────────────────────────────────────────────────
const RiskPill = ({ risk }) => {
    const c = RISK_COLORS[risk] || RISK_COLORS.Low;
    return (
        <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}44`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' }}>
            {risk.toUpperCase()}
        </span>
    );
};

// Inline Sidebar and Topbar removed, using global components

// ─── Main Page Component ──────────────────────────────────────────────────────
const AlertFeedPage = () => {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [alerts, setAlerts] = useState(INITIAL_ALERTS);
    const [selectedAlerts, setSelectedAlerts] = useState([]);

    const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
    const bulkRef = useRef(null);

    const [unreadCount, setUnreadCount] = useState(2);
    const [toast, setToast] = useState(null);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState('');

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleMarkAllRead = () => {
        setAlerts(prev => prev.map(a => ({ ...a, status: 'Resolved' })));
        setUnreadCount(0);
        showToast("All alerts marked as read");
    };

    // Filters
    const [search, setSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState('All Levels');
    const [zoneFilter, setZoneFilter] = useState('All Zones');
    const [typeFilter, setTypeFilter] = useState('All Types');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [sortOrder, setSortOrder] = useState('Newest First');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bulkRef.current && !bulkRef.current.contains(event.target)) {
                setBulkActionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBulkAction = (action) => {
        if (action === 'assign') {
            setAssignModalOpen(true);
            setBulkActionsOpen(false);
            return;
        }

        setAlerts(prev => prev.map(a => {
            if (selectedAlerts.includes(a.id)) {
                if (action === 'dismiss') return { ...a, status: 'Dismissed' };
                if (action === 'monitor') return { ...a, status: 'Monitoring' };
            }
            return a;
        }));

        const count = selectedAlerts.length;
        setSelectedAlerts([]);
        setBulkActionsOpen(false);

        if (action === 'dismiss') showToast(`${count} alerts dismissed`);
        if (action === 'monitor') showToast(`${count} alerts updated`);
    };

    const handleAssignConfirm = () => {
        if (!selectedOfficer) return;
        const count = selectedAlerts.length;
        setSelectedAlerts([]);
        setAssignModalOpen(false);
        showToast(`${count} alerts assigned to ${selectedOfficer}`);
        setSelectedOfficer('');
    };

    const handleSingleStatusChange = (id, newStatus) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    };

    const clearFilters = () => {
        setSearch(''); setRiskFilter('All Levels'); setZoneFilter('All Zones');
        setTypeFilter('All Types'); setStatusFilter('All Status'); setSortOrder('Newest First');
    };

    const toggleSelect = (id) => {
        setSelectedAlerts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const filteredAndSortedAlerts = useMemo(() => {
        let result = alerts.filter(a => {
            if (search && !a.zone.toLowerCase().includes(search.toLowerCase()) && !a.type.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
            if (riskFilter !== 'All Levels' && a.risk !== riskFilter) return false;
            if (zoneFilter !== 'All Zones' && a.zone !== zoneFilter) return false;
            if (typeFilter !== 'All Types' && a.type !== typeFilter) return false;
            if (statusFilter !== 'All Status' && a.status !== statusFilter) return false;
            return true;
        });

        const riskVal = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };

        result.sort((a, b) => {
            // First pass logic for Newest First: Active ones stay above resolved/dismissed if same group
            const aIsDimmed = a.status === 'Resolved' || a.status === 'Dismissed';
            const bIsDimmed = b.status === 'Resolved' || b.status === 'Dismissed';

            if (sortOrder === 'Newest First') {
                if (aIsDimmed !== bIsDimmed) return aIsDimmed ? 1 : -1;
                return b.timestamp - a.timestamp;
            }
            if (sortOrder === 'Oldest First') return a.timestamp - b.timestamp;
            if (sortOrder === 'Highest Risk') return riskVal[b.risk] - riskVal[a.risk];
            if (sortOrder === 'Lowest Risk') return riskVal[a.risk] - riskVal[b.risk];
            if (sortOrder === 'Highest Confidence') return b.conf - a.conf;
            return 0;
        });

        return result;
    }, [alerts, search, riskFilter, zoneFilter, typeFilter, statusFilter, sortOrder]);

    const selectStyle = {
        background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5',
        borderRadius: 6, padding: '8px 12px', fontSize: 13, cursor: 'pointer',
        outline: 'none', fontFamily: 'inherit'
    };

    return (
        <div className="dashboard-container">
            <Topbar subtitle="Alert Feed" notificationOverride={unreadCount} />
            <div className="main-wrapper">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

                <main style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>

                    {/* Page Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.01em' }}>Alert Feed</h1>
                            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>All detected movement events across monitored zones</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="af-header-btn dark" onClick={handleMarkAllRead}>
                                <Check size={16} /> Mark All Read
                            </button>
                            <div style={{ position: 'relative' }} ref={bulkRef}>
                                <button className="af-header-btn amber" onClick={() => setBulkActionsOpen(!bulkActionsOpen)}>
                                    Bulk Actions <ChevronDown size={14} />
                                </button>
                                {bulkActionsOpen && (
                                    <div className="af-bulk-dropdown">
                                        <div className="af-dropdown-item" onClick={() => handleBulkAction('dismiss')}>Dismiss Selected</div>
                                        <div className="af-dropdown-item" onClick={() => handleBulkAction('monitor')}>Mark Selected as Monitoring</div>
                                        <div className="af-dropdown-item" onClick={() => handleBulkAction('assign')}>Assign Selected to Field Officer</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Summary Strip */}
                    <div className="af-summary-strip">
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#F5F5F5' }}>18</span>
                            <span className="lbl">Total Active</span>
                        </div>
                        <div className="af-summary-div"></div>
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#EF4444' }}>3</span>
                            <span className="lbl">Critical</span>
                        </div>
                        <div className="af-summary-div"></div>
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#F97316' }}>7</span>
                            <span className="lbl">High</span>
                        </div>
                        <div className="af-summary-div"></div>
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#F59E0B' }}>8</span>
                            <span className="lbl">Medium / Low</span>
                        </div>
                        <div className="af-summary-div"></div>
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#22C55E' }}>12</span>
                            <span className="lbl">Resolved Today</span>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div style={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', width: 260 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                            <input
                                type="text" placeholder="Search alerts by zone or event type..." value={search} onChange={e => setSearch(e.target.value)}
                                style={{ ...selectStyle, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <select style={selectStyle} value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
                            {['All Levels', 'Critical', 'High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <select style={selectStyle} value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
                            {['All Zones', 'Quetta', 'Kech', 'Zhob', 'Pishin', 'Swat', 'Dir'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <select style={selectStyle} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                            {['All Types', 'Locust Swarm', 'Animal Herd', 'Unknown'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            {['All Status', 'Active', 'Monitoring', 'Resolved', 'Dismissed'].map(o => <option key={o}>{o}</option>)}
                        </select>
                        <select style={selectStyle} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                            {['Newest First', 'Oldest First', 'Highest Risk', 'Lowest Risk', 'Highest Confidence'].map(o => <option key={o}>{o}</option>)}
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

                    {/* Alert List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 100 }}>
                        {filteredAndSortedAlerts.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
                                <BellOff size={48} color="#333" />
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5' }}>No alerts match your filters</div>
                                <div style={{ fontSize: 14, color: '#555' }}>Try adjusting filters or clearing them</div>
                                <button onClick={clearFilters} style={{ background: 'transparent', border: '1px solid #F59E0B', color: '#F59E0B', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>Clear Filters</button>
                            </div>
                        ) : (
                            filteredAndSortedAlerts.map(alert => {
                                const isDimmed = alert.status === 'Resolved' || alert.status === 'Dismissed';
                                const leftBorderColor = isDimmed ? '#2A2A2A' : RISK_COLORS[alert.risk].border;
                                const isSelected = selectedAlerts.includes(alert.id);

                                return (
                                    <div key={alert.id} className={`af-card ${isDimmed ? 'dimmed' : ''}`} style={{ borderLeftColor: leftBorderColor }}>
                                        {/* Row 1 */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                            <input type="checkbox" className="af-checkbox" checked={isSelected} onChange={() => toggleSelect(alert.id)} />
                                            <RiskPill risk={alert.risk} />
                                            <span className="mono" style={{ fontSize: 11, color: '#666' }}>{alert.id}</span>
                                            <div style={{ flex: 1 }}></div>
                                            <span className="mono" style={{ fontSize: 11, color: '#666' }}>{alert.time}</span>
                                        </div>

                                        {/* Row 2 */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>{alert.zone}</div>
                                                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{alert.province}</div>
                                            </div>
                                            <div>
                                                <select
                                                    className="af-status-select"
                                                    value={alert.status}
                                                    onChange={(e) => handleSingleStatusChange(alert.id, e.target.value)}
                                                >
                                                    {Object.keys(STATUS_INDICATORS).map(s => (
                                                        <option key={s} value={s}>{s === alert.status ? '• ' : ''}{s}</option>
                                                    ))}
                                                </select>
                                                {/* Visual dot indicator hack since option styling isn't reliable */}
                                                <div style={{ position: 'relative', marginTop: -22, marginLeft: 10, pointerEvents: 'none' }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_INDICATORS[alert.status] }}></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 3 */}
                                        <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 16 }}>
                                            {alert.desc}
                                        </div>

                                        {/* Row 4 */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <div className="af-chip amber"><Activity size={12} /> Conf: {alert.conf}%</div>
                                                <div className="af-chip dark">{alert.type}</div>
                                                <div className="af-chip dark mono">{alert.vel}</div>
                                                <div className="af-chip dark">Clusters: {alert.clusters}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="af-btn ghost" onClick={() => handleSingleStatusChange(alert.id, 'Dismissed')}><X size={14} /> Dismiss</button>
                                                <button className="af-btn amber" onClick={() => navigate(`/zone/${alert.zone}`)}><ExternalLink size={14} /> Investigate</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Bulk Actions Floating Bar */}
                    {selectedAlerts.length > 0 && (
                        <div className="af-floating-bar" style={{ left: sidebarCollapsed ? 64 : 220 }}>
                            <span style={{ color: '#F5F5F5', fontWeight: 600, fontSize: 14 }}>{selectedAlerts.length} alerts selected</span>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="af-btn ghost" onClick={() => setSelectedAlerts([])}>Deselect All</button>
                                <button className="af-btn dark" onClick={() => handleBulkAction('dismiss')}>Dismiss Selected</button>
                                <button className="af-btn amber-solid" onClick={() => handleBulkAction('monitor')}>Mark as Monitoring</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Modals & Toasts */}
            {assignModalOpen && (
                <div className="modal-overlay" onClick={() => setAssignModalOpen(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Assign to Field Officer</h3>
                            <button className="close-btn" onClick={() => setAssignModalOpen(false)}><X size={18} /></button>
                        </div>
                        <div className="topbar-divider" style={{ width: '100%', margin: '16px 0' }}></div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Select Officer</label>
                                <select
                                    className="modal-input"
                                    value={selectedOfficer}
                                    onChange={(e) => setSelectedOfficer(e.target.value)}
                                    style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5', borderRadius: 6, padding: '10px 12px', width: '100%', outline: 'none' }}
                                >
                                    <option value="" disabled>Select an officer...</option>
                                    <option value="Capt. Tariq Mahmood">Capt. Tariq Mahmood</option>
                                    <option value="Lt. Ali Reza">Lt. Ali Reza</option>
                                    <option value="Sgt. Yasir Khan">Sgt. Yasir Khan</option>
                                    <option value="Insp. Fatima Bilal">Insp. Fatima Bilal</option>
                                </select>
                            </div>
                            <button
                                className="generate-btn"
                                style={{ marginTop: 24, opacity: selectedOfficer ? 1 : 0.5, width: '100%' }}
                                disabled={!selectedOfficer}
                                onClick={handleAssignConfirm}
                            >
                                Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="success-toast" style={{ zIndex: 9999 }}>{toast}</div>}
        </div>
    );
};

export default AlertFeedPage;
