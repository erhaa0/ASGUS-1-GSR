import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Server, Database, Cpu, Cloud, Layers, Plus, Edit2, UserX, UserCheck, Eye, X
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { fetchUsers, registerUser, updateUser,
         toggleUserStatus, fetchLogs,
         triggerDetection, updateRiskParams, fetchRiskParams, fetchHealth } from '../api/api';
import './AnalystDashboard.css';
import './AdminPanel.css';

const LOG_COLOR = {
    LOGIN:               '#3B82F6',
    DETECTION_TRIGGERED: '#EF4444',
    RISK_PARAMS_UPDATED: '#F59E0B',
    REPORT_EXPORTED:     '#22C55E',
    SYSTEM_SEED:         '#3B82F6',
    PASSWORD_CHANGED:    '#F59E0B',
    DEFAULT:             '#6B7280',
};

const RolePill = ({ role }) => {
    const col = role === 'Analyst' || role === 'analyst'
        ? '#F59E0B'
        : role === 'Field Officer' || role === 'field_officer' || role === 'field-officer'
        ? '#22C55E'
        : '#3B82F6';
    const label = role === 'field_officer' || role === 'field-officer'
        ? 'FIELD OFFICER'
        : role.toUpperCase();
    return (
        <span style={{ background: `${col}1A`, color: col, border: `1px solid ${col}4D`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' }}>
            {label}
        </span>
    );
};

const StatusPill = ({ status }) => {
    const col = status === 'Active' ? '#22C55E' : '#666';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: status === 'Active' ? '#FFF' : '#888', fontSize: 12, fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: col }}></div>
            {status}
        </span>
    );
};

export default function AdminPanel() {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));

    const [users, setUsers]             = useState([]);
    const [logs, setLogs]               = useState([]);
    const [fullLogs, setFullLogs]       = useState([]);
    const [liveHealthData, setLiveHealthData] = useState([]);

    const [modalMode, setModalMode]           = useState(null);
    const [editingUser, setEditingUser]       = useState(null);
    const [deactivateUser, setDeactivateUser] = useState(null);
    const [showFullLog, setShowFullLog]       = useState(false);
    const [filterFrom, setFilterFrom]         = useState('');
    const [filterTo, setFilterTo]             = useState('');

    const [formName, setFormName]     = useState('');
    const [formEmail, setFormEmail]   = useState('');
    const [formRole, setFormRole]     = useState('Analyst');
    const [formZones, setFormZones]   = useState([]);
    const [formPass, setFormPass]     = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast]           = useState(null);

    // ── AI Detection + Risk Params ────────────────────
    const [selectedDetectZone, setSelectedDetectZone] = useState('quetta');
    const [detectLoading, setDetectLoading]           = useState(false);
    const [riskZoneId, setRiskZoneId]                 = useState('quetta');
    const [minCluster, setMinCluster]                 = useState(2);
    const [sensitivity, setSensitivity]               = useState(1.0);
    const [riskParamsLoading, setRiskParamsLoading]   = useState(false);

    // Load real DB values whenever zone selector changes
    useEffect(() => {
        const load = async () => {
            setRiskParamsLoading(true);
            try {
                const data = await fetchRiskParams(riskZoneId);
                setMinCluster(data.min_cluster_size ?? 2);
                setSensitivity(data.sensitivity_weight ?? 1.0);
            } catch (err) {
                console.error('fetchRiskParams failed:', err);
            } finally {
                setRiskParamsLoading(false);
            }
        };
        load();
    }, [riskZoneId]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [usersData, logsData, healthData] = await Promise.all([
                    fetchUsers(),
                    fetchLogs(15),
                    fetchHealth(),
                ]);
                if (usersData) setUsers(usersData);
                if (logsData)  setLogs(logsData);
                if (healthData?.services) {
                    const ICONS = { 'API Server': Server, 'SQLite DB': Database, 'AI Microservice': Cpu, 'Azure App Service': Cloud, 'PostGIS Extension': Layers };
                    setLiveHealthData(healthData.services.map(s => ({
                        title: s.name,
                        icon:  ICONS[s.name] || Server,
                        code:  s.status === 'Online' ? 'online' : 'degraded',
                        color: s.status === 'Online' ? '#22C55E' : '#F59E0B',
                        up:    `${s.uptime}%`,
                    })));
                }
            } catch (err) {
                console.error('Failed to load admin data:', err);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
        return () => clearInterval(t);
    }, []);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    const openAddModal = () => {
        setFormName(''); setFormEmail(''); setFormRole('Analyst');
        setFormZones([]); setFormPass('');
        setEditingUser(null);
        setModalMode('add');
    };

    const openEditModal = (u) => {
        setEditingUser(u);
        setFormName(u.full_name || '');
        setFormEmail(u.email || '');
        setFormRole(u.role === 'field_officer' ? 'Field Officer' : u.role === 'analyst' ? 'Analyst' : 'Admin');
        setFormZones([]);
        setFormPass('');
        setModalMode('edit');
    };

    const handleZoneToggle = (zoneName) => {
        setFormZones(prev => prev.includes(zoneName) ? prev.filter(z => z !== zoneName) : [...prev, zoneName]);
    };

    const genPassword = () => setFormPass(Math.random().toString(36).slice(-10) + 'X!');

    const saveUser = async () => {
        setSubmitting(true);
        try {
            const roleMap = { 'Analyst': 'analyst', 'Field Officer': 'field_officer', 'Admin': 'admin' };
            if (modalMode === 'add') {
                await registerUser({
                    full_name: formName,
                    email:     formEmail,
                    password:  formPass || 'temp1234',
                    role:      roleMap[formRole] || 'analyst',
                    badge:     `USR-${Date.now().toString().slice(-4)}`,
                });
                showToast('User created successfully');
            } else {
                await updateUser(editingUser.user_id, { full_name: formName });
                showToast('User updated successfully');
            }
            const data = await fetchUsers();
            if (data) setUsers(data);
            setModalMode(null);
        } catch (err) {
            showToast('Operation failed — check details');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (u) => {
        try {
            await toggleUserStatus(u.user_id);
            const data = await fetchUsers();
            if (data) setUsers(data);
            showToast(`User ${u.status === 'Active' ? 'deactivated' : 'activated'}`);
            setDeactivateUser(null);
        } catch (err) {
            console.error('Toggle status failed:', err);
        }
    };

    const handleViewFullLog = async () => {
        try {
            const data = await fetchLogs(30);
            if (data) setFullLogs(data);
        } catch (err) { console.error('Failed to load full logs:', err); }
        setShowFullLog(true);
    };

    const handleTriggerDetection = async () => {
        setDetectLoading(true);
        try {
            const result = await triggerDetection(selectedDetectZone);
            showToast(`Detection complete — Risk: ${result.current_risk}`);
        } catch (err) {
            showToast('Detection failed');
        } finally {
            setDetectLoading(false);
        }
    };

    const handleUpdateRiskParams = async () => {
        try {
            const result = await updateRiskParams(riskZoneId, {
                min_cluster_size:   minCluster,
                sensitivity_weight: sensitivity,
                updated_by:         'admin01'
            });
            setMinCluster(result.min_cluster_size ?? minCluster);
            setSensitivity(result.sensitivity_weight ?? sensitivity);
            showToast('Saved to Supabase — Zone: ' + riskZoneId);
        } catch (err) {
            showToast('FAILED: ' + err.message);
            console.error('handleUpdateRiskParams error:', err);
        }
    };

    const filteredLog = fullLogs.filter(entry => {
        const dateStr = entry.timestamp ? entry.timestamp.substring(0, 10) : '';
        if (filterFrom && dateStr < filterFrom) return false;
        if (filterTo   && dateStr > filterTo)   return false;
        return true;
    });

    const healthWidgets = [
        { title: 'API Server',          icon: Server,   code: 'online',   color: '#22C55E', up: '99.8%' },
        { title: 'PostgreSQL Database', icon: Database, code: 'online',   color: '#22C55E', up: '99.5%' },
        { title: 'AI Microservice',     icon: Cpu,      code: 'online',   color: '#22C55E', up: '98.2%' },
        { title: 'Supabase App Service',   icon: Cloud,    code: 'degraded', color: '#F59E0B', up: 'High latency detected' },
        { title: 'PostGIS Extension',   icon: Layers,   code: 'online',   color: '#22C55E', up: '99.9%' }
    ];

    return (
        <div className="dashboard-container">
            <Topbar subtitle="Admin Panel" onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div className="main-wrapper">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

                <div className="admin-page">
                    <div className="admin-header">
                        <div>
                            <h1>Admin Panel</h1>
                            <p>System management and user administration</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span className="mono" style={{ color: '#888', fontSize: 13 }}>{new Date().toISOString().substring(0, 10)} &middot; {time} PKT</span>
                            <div className="admin-live-pill">
                                <div className="live-dot" style={{ background: '#22C55E' }}></div> SYSTEM ONLINE
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Health Strip */}
                    <div className="admin-card health-strip">
                        {(liveHealthData.length > 0 ? liveHealthData : healthWidgets).map((w, i) => (
                            <div className="health-item" key={i}>
                                <div className="health-icon-wrapper" style={{ background: `${w.color}1A`, color: w.color }}>
                                    <w.icon size={18} />
                                </div>
                                <div>
                                    <div className="health-title">{w.title}</div>
                                    <div className="health-status" style={{ color: w.color }}>
                                        <div className="live-dot" style={{ background: w.color, width: 6, height: 6 }}></div>
                                        {w.code.toUpperCase()}
                                    </div>
                                    <div className="health-uptime">{w.up} {w.code === 'online' ? 'uptime' : ''}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Section 2: Stats Row */}
                    <div className="admin-stats-row">
                        <div className="admin-card admin-stat-card">
                            <div className="admin-stat-val" style={{ color: '#3B82F6' }}>{users.length}</div>
                            <div className="admin-stat-lbl">Total Users</div>
                        </div>
                        <div className="admin-card admin-stat-card">
                            <div className="admin-stat-val" style={{ color: '#22C55E' }}>
                                {users.filter(u => u.status === 'Active').length}
                            </div>
                            <div className="admin-stat-lbl">Active Sessions</div>
                        </div>
                        <div className="admin-card admin-stat-card">
                            <div className="admin-stat-val" style={{ color: '#F59E0B' }}>
                                {logs.filter(l => l.action_type === 'REPORT_EXPORTED').length}
                            </div>
                            <div className="admin-stat-lbl">Reports Generated Today</div>
                        </div>
                        <div className="admin-card admin-stat-card">
                            <div className="admin-stat-val" style={{ color: '#F97316' }}>
                                {logs.filter(l => l.action_type === 'DETECTION_TRIGGERED').length}
                            </div>
                            <div className="admin-stat-lbl">System Alerts</div>
                        </div>
                    </div>

                    {/* Section 3: AI Detection + Risk Params */}
                    <div className="admin-two-col" style={{ marginBottom: 16 }}>

                        {/* Trigger Detection */}
                        <div className="admin-card" style={{ padding: 20 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#FFF' }}>Trigger AI Detection</h3>
                            <div className="admin-input-group">
                                <label>Select Zone</label>
                                <select className="admin-input" value={selectedDetectZone} onChange={e => setSelectedDetectZone(e.target.value)}>
                                    <option value="quetta">Quetta</option>
                                    <option value="kech">Kech</option>
                                    <option value="zhob">Zhob</option>
                                    <option value="pishin">Pishin</option>
                                    <option value="swat">Swat</option>
                                    <option value="dir">Dir</option>
                                </select>
                            </div>
                            <button className="btn-blue" style={{ width: '100%', marginTop: 8 }}
                                onClick={handleTriggerDetection} disabled={detectLoading}>
                                {detectLoading
                                    ? <div className="spinner black" style={{ width: 14, height: 14, borderWidth: 2 }}></div>
                                    : 'Run Detection →'}
                            </button>
                        </div>

                        {/* Update Risk Params */}
                        <div className="admin-card" style={{ padding: 20 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#FFF' }}>Update Risk Parameters</h3>
                            <div className="admin-input-group">
                                <label>Zone</label>
                                <select className="admin-input" value={riskZoneId} onChange={e => setRiskZoneId(e.target.value)}>
                                    <option value="quetta">Quetta</option>
                                    <option value="kech">Kech</option>
                                    <option value="zhob">Zhob</option>
                                    <option value="pishin">Pishin</option>
                                    <option value="swat">Swat</option>
                                    <option value="dir">Dir</option>
                                </select>
                            </div>
                            <div className="admin-input-group">
                                <label>Min Cluster Size</label>
                                <input type="number" className="admin-input" value={minCluster} min={1} max={10}
                                    onChange={e => setMinCluster(Number(e.target.value))} />
                            </div>
                            <div className="admin-input-group">
                                <label>Sensitivity Weight</label>
                                <input type="number" className="admin-input" value={sensitivity} min={0.1} max={2.0} step={0.1}
                                    onChange={e => setSensitivity(Number(e.target.value))} />
                            </div>
                            <button className="btn-blue" style={{ width: '100%', marginTop: 8 }} onClick={handleUpdateRiskParams}>
                                Update Parameters →
                            </button>
                        </div>
                    </div>

                    {/* Section 4: User Management + Activity Log */}
                    <div className="admin-two-col">
                        <div className="admin-card" style={{ padding: 0 }}>
                            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E1E1E' }}>
                                <h3 style={{ margin: 0, fontSize: 16, color: '#FFF' }}>User Management</h3>
                                <button className="btn-blue" onClick={openAddModal}><Plus size={16} /> Add User</button>
                            </div>
                            <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th><th>Role</th><th>Email</th>
                                        <th>Status</th><th>Last Login</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.user_id} className="admin-row">
                                            <td style={{ fontWeight: 700, color: '#F5F5F5' }}>{u.full_name}</td>
                                            <td><RolePill role={u.role} /></td>
                                            <td style={{ color: '#999' }}>{u.email}</td>
                                            <td><StatusPill status={u.status} /></td>
                                            <td style={{ color: '#666', fontFamily: 'Space Mono', fontSize: 12 }}>
                                                {u.last_login
                                                    ? new Date(u.last_login).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                    : 'Never'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="icon-btn" onClick={() => openEditModal(u)} title="Edit"><Edit2 size={14} /></button>
                                                    {u.status === 'Active'
                                                        ? <button className="icon-btn danger" onClick={() => setDeactivateUser(u)} title="Deactivate"><UserX size={14} /></button>
                                                        : <button className="icon-btn success" onClick={() => handleToggleStatus(u)} title="Activate"><UserCheck size={14} /></button>
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        <div className="admin-card activity-log-card" style={{ height: '100%', padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: 16, color: '#FFF' }}>Activity Log</h3>
                                <span style={{ color: '#666', fontSize: 12 }}>Today</span>
                            </div>
                            <div className="activity-list">
                                {logs.map((a, i) => (
                                    <div key={a.log_id || i} className="activity-item">
                                        <div className="activity-dot" style={{ background: LOG_COLOR[a.action_type] || LOG_COLOR.DEFAULT }}></div>
                                        <div className="activity-time">
                                            {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </div>
                                        <div>{a.detail || a.action_type}</div>
                                    </div>
                                ))}
                                <div style={{ textAlign: 'center', marginTop: 16 }}>
                                    <button onClick={handleViewFullLog} style={{ background: 'transparent', border: 'none', color: '#3B82F6', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>View Full Log</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add / Edit Modal */}
                {modalMode && (
                    <div className="modal-overlay" onClick={() => !submitting && setModalMode(null)}>
                        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 440 }}>
                            <div className="modal-header">
                                <h3>{modalMode === 'add' ? 'Add New User' : 'Edit User'}</h3>
                                <button className="close-btn" onClick={() => setModalMode(null)} disabled={submitting}><X size={18} /></button>
                            </div>
                            <div className="topbar-divider" style={{ width: '100%', margin: '16px 0' }}></div>
                            <div className="admin-input-group">
                                <label>Full Name</label>
                                <input type="text" className="admin-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. John Doe" />
                            </div>
                            <div className="admin-input-group">
                                <label>Email Address</label>
                                <input type="text" className="admin-input" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="name@asgus1.gov.pk" />
                                {formEmail.length > 0 && !formEmail.includes('@') && (
                                    <div style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>Email must contain @</div>
                                )}
                            </div>
                            <div className="admin-input-group">
                                <label>Role</label>
                                <select className="admin-input" value={formRole} onChange={e => setFormRole(e.target.value)}>
                                    <option value="Analyst">Analyst</option>
                                    <option value="Field Officer">Field Officer</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            {formRole === 'Field Officer' && (
                                <div className="admin-input-group">
                                    <label>Assigned Zones</label>
                                    <div className="admin-zones-grid">
                                        {['Quetta', 'Kech', 'Zhob', 'Pishin', 'Swat', 'Dir'].map(z => (
                                            <label key={z} className="admin-checkbox-lbl">
                                                <input type="checkbox" checked={formZones.includes(z)} onChange={() => handleZoneToggle(z)} />
                                                {z}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="admin-input-group">
                                <label>Temporary Password</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input type="text" className="admin-input" value={formPass} onChange={e => setFormPass(e.target.value)} style={{ flex: 1, fontFamily: 'Space Mono' }} />
                                    <button className="icon-btn" style={{ width: 40, height: 40 }} onClick={genPassword} title="Generate Password"><Eye size={18} /></button>
                                </div>
                            </div>
                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button className="btn-ghost" onClick={() => setModalMode(null)} disabled={submitting}>Cancel</button>
                                <button className="btn-blue" onClick={saveUser} disabled={submitting || !formName || !formEmail || !formEmail.includes('@')}>
                                    {submitting ? <div className="spinner black" style={{ width: 14, height: 14, borderWidth: 2 }}></div> : modalMode === 'add' ? 'Create User' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Deactivate Confirm Modal */}
                {deactivateUser && (
                    <div className="modal-overlay" onClick={() => setDeactivateUser(null)}>
                        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 360, textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                                    <UserX size={24} />
                                </div>
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Deactivate {deactivateUser.full_name}?</h3>
                            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888' }}>This will prevent the user from logging in. You can reactivate them later at any time.</p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button className="btn-ghost" onClick={() => setDeactivateUser(null)}>Cancel</button>
                                <button className="btn-danger" onClick={() => handleToggleStatus(deactivateUser)}>Deactivate User</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Full Log Modal */}
                {showFullLog && (
                    <div className="modal-overlay" onClick={() => setShowFullLog(false)}>
                        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 800 }}>
                            <div className="modal-header">
                                <h3>Full Activity Log</h3>
                                <button className="close-btn" onClick={() => setShowFullLog(false)}><X size={18} /></button>
                            </div>
                            <div className="topbar-divider" style={{ width: '100%', margin: '16px 0' }}></div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
                                <div className="admin-input-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label>From Date</label>
                                    <input type="date" className="admin-input" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                                </div>
                                <div className="admin-input-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label>To Date</label>
                                    <input type="date" className="admin-input" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <button className="btn-blue" style={{ height: 38 }} onClick={() => {}}>Filter</button>
                                </div>
                            </div>
                            <div className="activity-list" style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 10 }}>
                                {filteredLog.map((a, i) => (
                                    <div key={a.log_id || i} className="activity-item">
                                        <div className="activity-dot" style={{ background: LOG_COLOR[a.action_type] || LOG_COLOR.DEFAULT }}></div>
                                        <div className="activity-time" style={{ width: 120 }}>
                                            {a.timestamp ? a.timestamp.substring(0, 16).replace('T', ' ') : '--'}
                                        </div>
                                        <div>{a.detail || a.action_type}</div>
                                    </div>
                                ))}
                                {filteredLog.length === 0 && (
                                    <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>No activity found in selected date range.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {toast && (
                <div className="success-toast" style={{ zIndex: 9999, borderColor: '#3B82F6', color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)' }}>
                    {toast}
                </div>
            )}
        </div>
    );
}

