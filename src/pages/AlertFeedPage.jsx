import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Bell, Navigation, BarChart3, FileText,
    Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown,
    Search, Check, ExternalLink, X, BellOff, Activity, Clock
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { fetchDetections, updateDetectionStatus, bulkUpdateDetections, fetchFieldOfficers, updateUser } from '../api/api';
import './AnalystDashboard.css';
import './AlertFeedPage.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const RISK_COLORS = {
    Critical: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '#EF4444' },
    High:     { bg: 'rgba(249,115,22,0.12)', color: '#F97316', border: '#F97316' },
    Medium:   { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '#F59E0B' },
    Low:      { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', border: '#22C55E' },
};

const STATUS_INDICATORS = {
    Active:    '#EF4444',
    Monitoring:'#F59E0B',
    Resolved:  '#22C55E',
    Dismissed: '#666666'
};

// ─── Map backend detection to frontend alert format ───────────────────────────
const mapDetection = (d) => ({
    id:        d.alert_id || d.event_id,
    event_id:  d.event_id,
    zone:      d.zone_name,
    province:  d.province,
    risk:      d.risk_level,
    status:    d.status || 'Active',
    type:      d.event_type || 'Locust Swarm',
    time:      d.detected_at
        ? new Date(d.detected_at).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          }) + ' PKT'
        : '',
    timestamp: d.detected_at ? new Date(d.detected_at).getTime() : Date.now(),
    conf:      Math.round((d.confidence || 0) * 100),
    vel:       d.velocity || 'N/A',
    clusters:  d.dbscan_clusters || 0,
    desc:      d.description || `${d.event_type} detected in ${d.zone_name}.`,
});

// ─── Shared Components ────────────────────────────────────────────────────────
const RiskPill = ({ risk }) => {
    const c = RISK_COLORS[risk] || RISK_COLORS.Low;
    return (
        <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}44`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' }}>
            {risk.toUpperCase()}
        </span>
    );
};

// ─── Main Page Component ──────────────────────────────────────────────────────
const AlertFeedPage = () => {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);
    const [alerts, setAlerts] = useState([]);
    const [selectedAlerts, setSelectedAlerts] = useState([]);
    const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
    const bulkRef = useRef(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toast, setToast] = useState(null);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedOfficer, setSelectedOfficer] = useState('');
    const [fieldOfficers, setFieldOfficers]     = useState([]);

    // ── Fetch detections + field officers on mount ────
    useEffect(() => {
        const loadData = async () => {
            try {
                const [detData, officersData] = await Promise.all([
                    fetchDetections({ limit: 50 }),
                    fetchFieldOfficers(),
                ]);
                if (detData) {
                    const mapped = detData.map(mapDetection);
                    setAlerts(mapped);
                    setUnreadCount(mapped.filter(a => a.status === 'Active').length);
                }
                if (officersData) setFieldOfficers(officersData);
            } catch (err) {
                console.error('Failed to load alerts:', err);
            }
        };
        loadData();
    }, []);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleMarkAllRead = async () => {
        try {
            const activeIds = alerts.filter(a => a.status === 'Active').map(a => a.event_id);
            if (activeIds.length > 0) {
                await bulkUpdateDetections(activeIds, 'Resolved');
            }
            setAlerts(prev => prev.map(a => ({ ...a, status: 'Resolved' })));
            setUnreadCount(0);
            showToast("All alerts marked as read");
        } catch (err) {
            console.error('Mark all read failed:', err);
        }
    };

    // Filters
    const [search, setSearch]           = useState('');
    const [riskFilter, setRiskFilter]   = useState('All Levels');
    const [zoneFilter, setZoneFilter]   = useState('All Zones');
    const [typeFilter, setTypeFilter]   = useState('All Types');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [sortOrder, setSortOrder]     = useState('Newest First');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bulkRef.current && !bulkRef.current.contains(event.target)) {
                setBulkActionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBulkAction = async (action) => {
        if (action === 'assign') {
            setAssignModalOpen(true);
            setBulkActionsOpen(false);
            return;
        }

        const newStatus = action === 'dismiss' ? 'Dismissed' : 'Monitoring';
        try {
            const eventIds = alerts
                .filter(a => selectedAlerts.includes(a.id))
                .map(a => a.event_id);
            await bulkUpdateDetections(eventIds, newStatus);
            setAlerts(prev => prev.map(a =>
                selectedAlerts.includes(a.id) ? { ...a, status: newStatus } : a
            ));
            const count = selectedAlerts.length;
            setSelectedAlerts([]);
            setBulkActionsOpen(false);
            if (action === 'dismiss') showToast(`${count} alerts dismissed`);
            if (action === 'monitor') showToast(`${count} alerts updated`);
        } catch (err) {
            console.error('Bulk action failed:', err);
        }
    };

    const handleAssignConfirm = async () => {
        if (!selectedOfficer) return;
        try {
            const officer     = fieldOfficers.find(o => o.user_id === selectedOfficer);
            const officerName = officer?.full_name || selectedOfficer;
            // Assign officer to the zone of the first selected alert
            const firstAlert = alerts.find(a => selectedAlerts.includes(a.id));
            if (officer && firstAlert) {
                const zoneId = firstAlert.zone_id ||
                    `zone_${firstAlert.zone?.toLowerCase().replace(/\s+/g, '_')}`;
                await updateUser(officer.user_id, { assigned_zone: zoneId });
            }
            const count = selectedAlerts.length;
            setSelectedAlerts([]);
            setAssignModalOpen(false);
            showToast(`${count} alerts assigned to ${officerName}`);
            setSelectedOfficer('');
        } catch (err) {
            console.error('Assignment failed:', err);
            showToast('Assignment failed — try again');
        }
    };

    const handleSingleStatusChange = async (id, newStatus) => {
        try {
            const alert = alerts.find(a => a.id === id);
            if (alert?.event_id) {
                await updateDetectionStatus(alert.event_id, newStatus);
            }
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

    const clearFilters = () => {
        setSearch(''); setRiskFilter('All Levels'); setZoneFilter('All Zones');
        setTypeFilter('All Types'); setStatusFilter('All Status'); setSortOrder('Newest First');
    };

    const toggleSelect = (id) => {
        setSelectedAlerts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ── Summary counts ────────────────────────────────
    const totalActive   = alerts.filter(a => a.status === 'Active').length;
    const criticalCount = alerts.filter(a => a.risk === 'Critical').length;
    const highCount     = alerts.filter(a => a.risk === 'High').length;
    const medLowCount   = alerts.filter(a => a.risk === 'Medium' || a.risk === 'Low').length;
    const resolvedCount = alerts.filter(a => a.status === 'Resolved').length;

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
            <Topbar subtitle="Alert Feed" notificationOverride={unreadCount} onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
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
                            <span className="val" style={{ color: '#F5F5F5' }}>{totalActive}</span>
                            <span className="lbl">Total Active</span>
                        </div>
                        <div className="af-summary-div"></div>
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#EF4444' }}>{criticalCount}</span>
                            <span className="lbl">Critical</span>
                        </div>
                        <div className="af-summary-div"></div>
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#F97316' }}>{highCount}</span>
                            <span className="lbl">High</span>
                        </div>
                        <div className="af-summary-div"></div>
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#F59E0B' }}>{medLowCount}</span>
                            <span className="lbl">Medium / Low</span>
                        </div>
                        <div className="af-summary-div"></div>
                        <div className="af-summary-col">
                            <span className="val" style={{ color: '#22C55E' }}>{resolvedCount}</span>
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
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
                                    {fieldOfficers.length > 0
                                        ? fieldOfficers.map(o => (
                                            <option key={o.user_id} value={o.user_id}>{o.full_name}</option>
                                          ))
                                        : [
                                            <option key="fo1" value="fo1">Capt. Tariq Mahmood</option>,
                                            <option key="fo2" value="fo2">Lt. Ali Reza</option>,
                                            <option key="fo3" value="fo3">Sgt. Yasir Khan</option>,
                                            <option key="fo4" value="fo4">Insp. Fatima Bilal</option>,
                                          ]
                                    }
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
