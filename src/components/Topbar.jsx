import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../App';
import { Bell, ChevronDown, User, Lock, Settings, LogOut, Activity } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
    { id: 1, title: 'Critical Alert: Swat Valley', desc: 'Large scale locust swarm detected moving NE.', time: '2m ago', risk: 'Critical', color: '#EF4444', unread: true },
    { id: 2, title: 'New Risk Zone: Kech', desc: 'Rapid movement signature identified near crossing.', time: '12m ago', risk: 'Critical', color: '#EF4444', unread: true },
    { id: 3, title: 'Movement Update: Zhob', desc: 'Vibration signatures confirmed in sector 4.', time: '45m ago', risk: 'High', color: '#F97316', unread: false },
    { id: 4, title: 'System Sync Complete', desc: 'All field sensors successfully re-calibrated.', time: '1h ago', risk: 'Low', color: '#22C55E', unread: false },
    { id: 5, title: 'Report Scheduled', desc: 'Weekly movement summary prepared for export.', time: '3h ago', risk: 'Medium', color: '#F59E0B', unread: false },
];

const Topbar = ({ subtitle = "Dashboard" }) => {
    const navigate = useNavigate();
    const { user, updateUser } = useUser();
    const role = user?.role || 'analyst';
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const [showProfile, setShowProfile] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
    const profileRef = useRef(null);
    const notifRef = useRef(null);

    const notificationCount = notifications.filter(n => n.unread).length;

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfile(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isAnalyst = role === 'analyst';
    const isFieldOfficer = role === 'field-officer';
    const isAdmin = role === 'admin';

    let badgeText = 'ANALYST';
    let badgeColor = '#F59E0B'; // amber
    if (isFieldOfficer) { badgeText = 'FIELD OFFICER'; badgeColor = '#22C55E'; }
    if (isAdmin) { badgeText = 'ADMIN'; badgeColor = '#3B82F6'; }

    return (
        <header className="topbar">
            <div className="topbar-left" style={{ cursor: 'pointer', minWidth: 170, overflow: 'visible' }} onClick={() => navigate('/analyst')}>
                <svg width="160" height="32" viewBox="0 0 160 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="14,2 26,8 26,24 14,30 2,24 2,8" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
                    <line x1="2" y1="16" x2="26" y2="16" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                    <line x1="14" y1="2" x2="14" y2="30" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                    <circle cx="14" cy="16" r="2.5" fill="#F59E0B" />
                    <circle cx="14" cy="16" r="6" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" fill="none" />
                    <text x="36" y="19" fontFamily="Orbitron, sans-serif" fontWeight="700" fontSize="15" fill="#F5F5F5" letterSpacing="1">ASGUS-1</text>
                    <text x="37" y="29" fontFamily="Space Mono, monospace" fontSize="8" fill="#F59E0B" letterSpacing="2">GSR</text>
                </svg>
                <div className="topbar-divider"></div>
                <span className="topbar-subtitle">{subtitle}</span>
            </div>

            <div className="topbar-center">
                <div className="live-dot"></div>
                <span className="live-text mono">LIVE &middot; Syncing every 30s &middot; {time}</span>
            </div>

            <div className="topbar-right">
                {isAnalyst && (
                    <>
                        <div className="stat-pill critical">CRITICAL 3</div>
                        <div className="stat-pill high">HIGH 7</div>
                        <div className="stat-pill zones">ZONES 24</div>
                    </>
                )}

                {isFieldOfficer && (
                    <div className="fo-on-duty-pill" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, fontSize: 11, fontWeight: 'bold' }}>
                        <div className="live-dot" style={{ background: '#22C55E' }}></div> ON DUTY
                    </div>
                )}

                {isAdmin && (
                    <div className="admin-health-pill" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 20, fontSize: 11, fontWeight: 'bold' }}>
                        <Activity size={12} /> SYSTEM OPTIMAL
                    </div>
                )}

                <div className="topbar-divider"></div>

                <div style={{ position: 'relative' }} ref={notifRef}>
                    <div style={{ cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
                        <Bell size={20} className="text-muted" />
                        {notificationCount > 0 && (
                            <div style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: '#fff', fontSize: 8, width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {notificationCount}
                            </div>
                        )}
                    </div>
                    {showNotifications && (
                        <div className="notification-dropdown">
                            <div className="notif-header">
                                <span>Notifications</span>
                                <button className="mark-read-btn" onClick={markAllRead}>Mark all read</button>
                            </div>
                            <div className="notif-list">
                                {notifications.map(n => (
                                    <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                                        <div className="notif-dot" style={{ background: n.color }}></div>
                                        <div className="notif-content">
                                            <div className="notif-title">{n.title}</div>
                                            <div className="notif-desc">{n.desc}</div>
                                        </div>
                                        <div className="notif-time mono">{n.time}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="topbar-divider"></div>

                <div className="role-badge" style={{ color: badgeColor, border: `1px solid ${badgeColor}` }}>{badgeText}</div>

                {/* Profile Avatar */}
                <div style={{ position: 'relative' }} ref={profileRef}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                        onClick={() => setShowProfile(p => !p)}
                    >
                        <div style={{ width: 28, height: 28, background: badgeColor, color: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' }}>
                            {user?.name?.substring(0, 2).toUpperCase() || 'AH'}
                        </div>
                        <ChevronDown size={14} className="text-muted" style={{ transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>

                    {showProfile && (
                        <div className="profile-dropdown" style={{
                            position: 'fixed',
                            top: 52,
                            right: 16,
                            width: 260,
                            background: '#0F0F0F',
                            border: '1px solid #2A2A2A',
                            borderRadius: 8,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                            zIndex: 9999,
                            padding: 8
                        }}>
                            <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px' }}>
                                <div style={{ width: 40, height: 40, background: badgeColor, color: '#000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold', flexShrink: 0 }}>
                                    {user?.name?.substring(0, 2).toUpperCase() || 'AH'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#F5F5F5' }}>{user?.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        <span style={{ background: `${badgeColor}1A`, color: badgeColor, border: `1px solid ${badgeColor}4D`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em' }}>{badgeText}</span>
                                        <span style={{ fontSize: 11, color: '#666' }}>{user?.email || (user?.name?.split(' ').join('.').toLowerCase() + '@asgus1.gov.pk')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="profile-divider" style={{ height: 1, background: '#1E1E1E', margin: '8px 0' }}></div>
                            <div className="profile-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', fontSize: 13, color: '#CCC', cursor: 'pointer', borderRadius: 6 }} onClick={() => { setShowProfile(false); navigate('/settings'); }}>
                                <User size={14} /><span>Profile & Settings</span>
                            </div>
                            <div className="profile-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', fontSize: 13, color: '#CCC', cursor: 'pointer', borderRadius: 6 }} onClick={() => { setShowProfile(false); navigate('/settings#password'); }}>
                                <Lock size={14} /><span>Change Password</span>
                            </div>
                            <div className="profile-divider" style={{ height: 1, background: '#1E1E1E', margin: '8px 0' }}></div>
                            <div className="profile-menu-item danger" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', fontSize: 13, color: '#EF4444', cursor: 'pointer', borderRadius: 6 }} onClick={() => {
                                setShowProfile(false);
                                localStorage.removeItem('asgus1_user');
                                updateUser(null);
                                navigate('/');
                            }}>
                                <LogOut size={14} /><span>Logout</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Topbar;
