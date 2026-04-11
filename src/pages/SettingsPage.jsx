import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../App';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { Lock, Eye, EyeOff, Check, X, ShieldAlert, AlertTriangle } from 'lucide-react';
import './SettingsPage.css';

const RolePill = ({ role, color }) => (
    <span style={{
        background: `${color}1A`, color: color, border: `1px solid ${color}4D`,
        borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em'
    }}>
        {role.toUpperCase()}
    </span>
);

export default function SettingsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateUser } = useUser();
    const role = user?.role || 'analyst';
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    const isAnalyst = role === 'analyst';
    const isFieldOfficer = role === 'field-officer';
    const isAdmin = role === 'admin';

    let accentColor = '#F59E0B'; // analyst
    if (isFieldOfficer) accentColor = '#22C55E';
    if (isAdmin) accentColor = '#3B82F6';

    const [toast, setToast] = useState(null);
    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // Scroll to hash on mount
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [location.hash]);

    // Section 1: Profile
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profileSaving, setProfileSaving] = useState(false);

    // Section 2: Password
    const [curPass, setCurPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showCur, setShowCur] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConf, setShowConf] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);

    let pwStrength = 0;
    if (newPass.length > 0) pwStrength = 1;
    if (newPass.length >= 8) pwStrength = 2;
    if (newPass.length >= 8 && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass)) pwStrength = 3;
    if (newPass.length >= 10 && /[A-Z]/.test(newPass) && /[0-9]/.test(newPass) && /[^A-Za-z0-9]/.test(newPass)) pwStrength = 4;

    const strengthWords = ['', 'Weak', 'Fair', 'Good', 'Strong'];

    // Section 3: Notifications
    const [notifs, setNotifs] = useState({ crit: true, high: true, med: false, digest: true, maint: true });

    // Section 4: Display
    const [lang, setLang] = useState('en');
    const [tz, setTz] = useState('PKT');
    const [df, setDf] = useState('DD/MM/YYYY');
    const [mapView, setMapView] = useState('Balochistan Focus');

    // Section 5: Thresholds
    const [threshConf, setThreshConf] = useState(60);
    const [threshCrit, setThreshCrit] = useState(85);
    const [threshPoll, setThreshPoll] = useState(30);

    // Section 6: System
    const [sysRet, setSysRet] = useState('90 days');
    const [sysPoll, setSysPoll] = useState('30s');
    const [maintMode, setMaintMode] = useState(false);
    const [pendingMaint, setPendingMaint] = useState(false);

    // Section 7: Danger
    const [showClearModal, setShowClearModal] = useState(false);
    const [showSignoutModal, setShowSignoutModal] = useState(false);

    const handleSaveProfile = () => {
        setProfileSaving(true);
        setTimeout(() => {
            updateUser({ ...user, name: profileName });
            setProfileSaving(false);
            showToast('Profile updated successfully');
        }, 1500);
    };

    const handleSavePassword = () => {
        if (!curPass || !newPass || newPass !== confirmPass || newPass.length < 8) return;
        setPwSaving(true);
        setTimeout(() => {
            setPwSaving(false);
            setCurPass(''); setNewPass(''); setConfirmPass('');
            showToast('Password updated successfully');
        }, 1500);
    };

    const handleClearData = () => {
        localStorage.removeItem('asgus1_user');
        setShowClearModal(false);
        showToast('Local data cleared');
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleSignoutAll = () => {
        setShowSignoutModal(false);
        showToast('All sessions terminated');
        setTimeout(() => {
            localStorage.removeItem('asgus1_user');
            updateUser(null);
            navigate('/');
        }, 2000);
    };

    const Toggle = ({ checked, onChange }) => (
        <div className={`toggle-switch ${checked ? 'on' : ''}`} style={{ background: checked ? accentColor : '' }} onClick={onChange}>
            <div className="toggle-knob"></div>
        </div>
    );

    return (
        <div className="dashboard-container" style={{ '--role-accent': accentColor }}>
            <Topbar subtitle="Settings" />
            <div className="main-wrapper">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

                <div className="settings-page">
                    <div className="settings-container">

                        <div className="settings-header">
                            <h1>Settings</h1>
                            <p>Manage your account preferences and system configuration</p>
                        </div>

                        {/* Section 1: Profile Information */}
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title">Profile Information</h2>
                                <div className="settings-card-desc">Update your personal details and contact information</div>
                                <div className="settings-divider"></div>
                            </div>
                            <div className="settings-form-grid">
                                <div className="settings-input-group">
                                    <label>Full Name</label>
                                    <input className="settings-input" value={profileName} onChange={e => setProfileName(e.target.value)} />
                                </div>
                                <div className="settings-input-group">
                                    <label>Badge Number</label>
                                    <div className="settings-input-wrapper">
                                        <input className="settings-input" value={user?.badge || ''} disabled />
                                        <button className="settings-input-icon"><Lock size={14} /></button>
                                    </div>
                                </div>
                                <div className="settings-input-group">
                                    <label>Email Address</label>
                                    <input className="settings-input" value={user?.email || (user?.name?.split(' ').join('.').toLowerCase() + '@asgus1.gov.pk')} disabled />
                                </div>
                                <div className="settings-input-group">
                                    <label>Role</label>
                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center' }}>
                                        <RolePill role={user?.role || 'Analyst'} color={accentColor} />
                                    </div>
                                    <div className="settings-role-msg">Role changes must be requested from Admin</div>
                                </div>
                            </div>
                            <div className="settings-btn-row">
                                <button className="settings-btn" style={{ background: accentColor }} onClick={handleSaveProfile} disabled={profileSaving || !profileName}>
                                    {profileSaving ? <div className="spinner black" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff white white white' }}></div> : 'Save Profile'}
                                </button>
                            </div>
                        </div>

                        {/* Section 2: Change Password */}
                        <div className="settings-card" id="password">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title">Change Password</h2>
                                <div className="settings-card-desc">Ensure your account uses a strong password</div>
                                <div className="settings-divider"></div>
                            </div>
                            <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                                <div className="settings-input-group">
                                    <label>Current Password</label>
                                    <div className="settings-input-wrapper">
                                        <input type={showCur ? 'text' : 'password'} className="settings-input" value={curPass} onChange={e => setCurPass(e.target.value)} />
                                        <button className="settings-input-icon" onClick={() => setShowCur(!showCur)}>
                                            {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="settings-input-group">
                                    <label>New Password</label>
                                    <div className="settings-input-wrapper">
                                        <input type={showNew ? 'text' : 'password'} className={`settings-input ${newPass.length > 0 && newPass.length < 8 ? 'error' : ''}`} value={newPass} onChange={e => setNewPass(e.target.value)} />
                                        <button className="settings-input-icon" onClick={() => setShowNew(!showNew)}>
                                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {newPass.length > 0 && newPass.length < 8 && <div className="settings-error-msg">Password must be at least 8 characters</div>}
                                    <div className="pw-strength-bar">
                                        {[1, 2, 3, 4].map(s => (
                                            <div key={s} className={`pw-segment ${pwStrength >= s ? 'active' : ''} ${pwStrength === 1 ? 'weak' : pwStrength === 2 ? 'fair' : pwStrength === 3 ? 'good' : 'strong'}`}></div>
                                        ))}
                                    </div>
                                    <div className="pw-strength-label">{strengthWords[pwStrength]}</div>
                                </div>
                                <div className="settings-input-group">
                                    <label>Confirm New Password</label>
                                    <div className="settings-input-wrapper">
                                        <input type={showConf ? 'text' : 'password'} className={`settings-input ${confirmPass.length > 0 && newPass !== confirmPass ? 'error' : ''}`} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
                                        <button className="settings-input-icon" onClick={() => setShowConf(!showConf)}>
                                            {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {confirmPass.length > 0 && (
                                        <div className={`pw-match ${newPass === confirmPass ? 'yes' : 'no'}`}>
                                            {newPass === confirmPass ? <Check size={14} /> : <X size={14} />}
                                            {newPass === confirmPass ? 'Passwords match' : 'Passwords do not match'}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="settings-btn-row">
                                <button className="settings-btn" style={{ background: accentColor }} onClick={handleSavePassword} disabled={pwSaving || !curPass || newPass.length < 8 || newPass !== confirmPass}>
                                    {pwSaving ? <div className="spinner black" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff white white white' }}></div> : 'Update Password'}
                                </button>
                            </div>
                        </div>

                        {/* Section 3: Notification Preferences */}
                        <div className="settings-card" id="preferences">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title">Notification Preferences</h2>
                                <div className="settings-card-desc">Control how and when you receive alerts</div>
                                <div className="settings-divider"></div>
                            </div>
                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">Critical Alerts</div>
                                    <div className="toggle-desc">Receive immediate notifications for critical risk events</div>
                                </div>
                                <Toggle checked={notifs.crit} onChange={() => setNotifs({ ...notifs, crit: !notifs.crit })} />
                            </div>
                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">High Risk Alerts</div>
                                    <div className="toggle-desc">Notifications for high risk detections</div>
                                </div>
                                <Toggle checked={notifs.high} onChange={() => setNotifs({ ...notifs, high: !notifs.high })} />
                            </div>
                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">Medium / Low Alerts</div>
                                    <div className="toggle-desc">Notifications for medium and low risk events</div>
                                </div>
                                <Toggle checked={notifs.med} onChange={() => setNotifs({ ...notifs, med: !notifs.med })} />
                            </div>
                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">Daily Summary Email</div>
                                    <div className="toggle-desc">Receive a daily digest of all detection activity</div>
                                </div>
                                <Toggle checked={notifs.digest} onChange={() => setNotifs({ ...notifs, digest: !notifs.digest })} />
                            </div>
                            <div className="toggle-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">System Maintenance Notices</div>
                                    <div className="toggle-desc">Alerts for scheduled downtime and updates</div>
                                </div>
                                <Toggle checked={notifs.maint} onChange={() => setNotifs({ ...notifs, maint: !notifs.maint })} />
                            </div>
                            <div className="settings-btn-row">
                                <button className="settings-btn" style={{ background: accentColor }} onClick={() => showToast('Preferences saved')}>Save Preferences</button>
                            </div>
                        </div>

                        {/* Section 4: Display Preferences */}
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title">Display Preferences</h2>
                                <div className="settings-card-desc">Customize your interface settings</div>
                                <div className="settings-divider"></div>
                            </div>
                            <div className="settings-form-grid">
                                <div className="settings-input-group">
                                    <label>Language</label>
                                    <select className="settings-input" value={lang} onChange={e => setLang(e.target.value)}>
                                        <option value="en">English</option>
                                        <option value="ur">اردو (Urdu)</option>
                                    </select>
                                </div>
                                <div className="settings-input-group">
                                    <label>Timezone</label>
                                    <select className="settings-input" value={tz} onChange={e => setTz(e.target.value)}>
                                        <option value="PKT">PKT (UTC+5)</option>
                                        <option value="UTC">UTC</option>
                                        <option value="EST">EST</option>
                                        <option value="PST">PST</option>
                                    </select>
                                </div>
                                <div className="settings-input-group">
                                    <label>Date Format</label>
                                    <select className="settings-input" value={df} onChange={e => setDf(e.target.value)}>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>
                                <div className="settings-input-group">
                                    <label>Map Default View</label>
                                    <select className="settings-input" value={mapView} onChange={e => setMapView(e.target.value)}>
                                        <option value="Balochistan Focus">Balochistan Focus</option>
                                        <option value="KPK Focus">KPK Focus</option>
                                        <option value="Full Pakistan View">Full Pakistan View</option>
                                    </select>
                                </div>
                            </div>
                            <div className="settings-btn-row">
                                <button className="settings-btn" style={{ background: accentColor }} onClick={() => showToast('Display settings saved')}>Save Display Settings</button>
                            </div>
                        </div>

                        {/* Section 5: Alert Thresholds */}
                        {!isFieldOfficer && (
                            <div className="settings-card">
                                <div className="settings-card-header">
                                    <h2 className="settings-card-title">Alert Thresholds</h2>
                                    <div className="settings-card-desc">Configure minimum thresholds for AI detection alerts</div>
                                    <div className="settings-divider"></div>
                                </div>
                                <div className="slider-row">
                                    <div className="slider-header">
                                        <div className="slider-label">Minimum Confidence to Alert</div>
                                        <div className="slider-val" style={{ color: accentColor }}>{threshConf}%</div>
                                    </div>
                                    <input type="range" min="0" max="100" step="5" value={threshConf} onChange={e => setThreshConf(e.target.value)} />
                                </div>
                                <div className="slider-row">
                                    <div className="slider-header">
                                        <div className="slider-label">Critical Risk Threshold</div>
                                        <div className="slider-val" style={{ color: accentColor }}>{threshCrit}%</div>
                                    </div>
                                    <input type="range" min="50" max="100" step="5" value={threshCrit} onChange={e => setThreshCrit(e.target.value)} />
                                </div>
                                <div className="slider-row">
                                    <div className="slider-header">
                                        <div className="slider-label">Polling Interval</div>
                                        <div className="slider-val" style={{ color: accentColor }}>Every {threshPoll}s</div>
                                    </div>
                                    <input type="range" min="10" max="120" step="10" value={threshPoll} onChange={e => setThreshPoll(e.target.value)} />
                                </div>
                                <div className="settings-btn-row">
                                    <button className="settings-btn" style={{ background: accentColor }} onClick={() => showToast('Thresholds saved')}>Save Thresholds</button>
                                </div>
                            </div>
                        )}

                        {/* Section 6: System Preferences */}
                        {isAdmin && (
                            <div className="settings-card">
                                <div className="settings-card-header">
                                    <h2 className="settings-card-title"><ShieldAlert size={18} color="#3B82F6" /> System Preferences</h2>
                                    <div className="settings-card-desc">Global system configuration — Admin access only</div>
                                    <div className="settings-divider"></div>
                                </div>
                                <div className="settings-form-grid" style={{ marginBottom: 20 }}>
                                    <div className="settings-input-group">
                                        <label>Data Retention Period</label>
                                        <select className="settings-input" value={sysRet} onChange={e => setSysRet(e.target.value)}>
                                            <option value="30 days">30 days</option>
                                            <option value="60 days">60 days</option>
                                            <option value="90 days">90 days</option>
                                            <option value="1 year">1 year</option>
                                        </select>
                                    </div>
                                    <div className="settings-input-group">
                                        <label>Default Polling Interval</label>
                                        <select className="settings-input" value={sysPoll} onChange={e => setSysPoll(e.target.value)}>
                                            <option value="15s">15s</option>
                                            <option value="30s">30s</option>
                                            <option value="60s">60s</option>
                                            <option value="120s">120s</option>
                                        </select>
                                    </div>
                                    <div className="settings-input-group">
                                        <label>AI Model Version</label>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <input className="settings-input" value="v2.4.1 (stable)" disabled style={{ flex: 1 }} />
                                            <button className="settings-btn-outline-blue">Request Update</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="toggle-row" style={{ borderTop: '1px solid #1A1A1A', borderBottom: 'none' }}>
                                    <div className="toggle-info">
                                        <div className="toggle-label">Maintenance Mode</div>
                                        <div className="toggle-desc">Enable to prevent logins during updates</div>
                                    </div>
                                    <Toggle checked={maintMode || pendingMaint} onChange={() => !maintMode && setPendingMaint(!pendingMaint)} />
                                </div>

                                {pendingMaint && !maintMode && (
                                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: 12, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                                        <div style={{ color: '#F59E0B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <AlertTriangle size={16} /> Enabling maintenance mode will log out all active users. Are you sure?
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, fontWeight: 600 }} onClick={() => setPendingMaint(false)}>Cancel</button>
                                            <button style={{ background: '#F59E0B', border: 'none', color: '#FFF', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }} onClick={() => { setMaintMode(true); setPendingMaint(false); }}>Confirm</button>
                                        </div>
                                    </div>
                                )}

                                <div className="settings-btn-row">
                                    <button className="settings-btn" style={{ background: '#3B82F6' }} onClick={() => showToast('System settings saved')}>Save System Settings</button>
                                </div>
                            </div>
                        )}

                        {/* Section 7: Danger Zone */}
                        <div className="settings-card danger-zone">
                            <div className="settings-card-header">
                                <h2 className="settings-card-title"><ShieldAlert size={18} color="#EF4444" /> Danger Zone</h2>
                                <div className="settings-divider" style={{ background: 'rgba(239, 68, 68, 0.2)', marginTop: 16 }}></div>
                            </div>

                            <div className="action-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">Clear Local Data</div>
                                    <div className="toggle-desc">Clear cached data and reset local preferences</div>
                                </div>
                                <button className="settings-btn-outline-red" onClick={() => setShowClearModal(true)}>Clear Data</button>
                            </div>
                            <div className="action-row">
                                <div className="toggle-info">
                                    <div className="toggle-label">Sign Out All Sessions</div>
                                    <div className="toggle-desc">Log out from all active sessions on all devices</div>
                                </div>
                                <button className="settings-btn-outline-red" onClick={() => setShowSignoutModal(true)}>Sign Out All</button>
                            </div>
                        </div>

                        {/* Modals */}
                        {showClearModal && (
                            <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
                                <div className="modal-card" onClick={e => e.stopPropagation()} style={{ width: 360, textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Clear all local data?</h3>
                                    <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888' }}>This will remove temporary states, local storage preferences, and cache.</p>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                        <button className="btn-ghost" onClick={() => setShowClearModal(false)}>Cancel</button>
                                        <button className="settings-btn" style={{ background: '#EF4444' }} onClick={handleClearData}>Confirm</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showSignoutModal && (
                            <div className="modal-overlay" onClick={() => setShowSignoutModal(false)}>
                                <div className="modal-card" onClick={e => e.stopPropagation()} style={{ width: 360, textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Terminate all sessions?</h3>
                                    <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888' }}>This will immediately log you out everywhere.</p>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                        <button className="btn-ghost" onClick={() => setShowSignoutModal(false)}>Cancel</button>
                                        <button className="settings-btn" style={{ background: '#EF4444' }} onClick={handleSignoutAll}>Sign Out All</button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
            {toast && <div className="success-toast" style={{ zIndex: 9999, borderColor: accentColor, color: accentColor, background: `${accentColor}1A` }}>{toast}</div>}
        </div>
    );
}
