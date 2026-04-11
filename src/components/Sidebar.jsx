import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../App';
import {
    LayoutDashboard, Bell, Compass, BarChart2, FileText,
    Home, PlusCircle, Clock, Shield, Users, Activity,
    Settings, LogOut, ChevronLeft, ChevronRight, Navigation, BarChart3
} from 'lucide-react';

const navItems = {
    analyst: [
        { label: 'Map Dashboard', icon: LayoutDashboard, path: '/analyst' },
        { label: 'Alert Feed', icon: Bell, path: '/alerts' },
        { label: 'Zone Explorer', icon: Navigation, path: '/zones' },
        { label: 'Analytics', icon: BarChart3, path: '/analytics' },
        { label: 'Reports', icon: FileText, path: '/reports' },
    ],
    'field-officer': [
        { label: 'My Dashboard', icon: Home, path: '/field-officer' },
        { label: 'Submit Observation', icon: PlusCircle, path: '/field-officer#submit' },
        { label: 'My History', icon: Clock, path: '/field-officer#history' },
    ],
    admin: [
        { label: 'Admin Panel', icon: Shield, path: '/admin' },
        { label: 'System Health', icon: Activity, path: '/admin/health' },
        { label: 'Reports', icon: FileText, path: '/reports' },
    ]
};

const Sidebar = ({ collapsed, setCollapsed }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const role = user?.role || 'analyst';

    const menuItems = navItems[role] || navItems['analyst'];

    // Determine active color class based on role
    const activeClass = role === 'field-officer' ? 'active-green' : role === 'admin' ? 'active-blue' : 'active';

    return (
        <aside className={`sidebar ${role === 'field-officer' ? 'fo-sidebar' : ''} ${collapsed ? 'collapsed' : 'expanded'}`}>
            <div
                className="sidebar-brand"
                onClick={() => setCollapsed(!collapsed)}
                style={{ padding: '24px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 80, cursor: 'pointer' }}
            >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
                    <line x1="3" y1="14" x2="25" y2="14" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                    <line x1="14" y1="2" x2="14" y2="26" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                    <circle cx="14" cy="14" r="2.5" fill="#F59E0B" />
                    <circle cx="14" cy="14" r="6" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" fill="none" />
                </svg>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path || (location.pathname + location.hash) === item.path || (item.path.split('#')[0] === location.pathname && item.path.includes('#'));
                    return (
                        <div
                            key={item.label}
                            className={`nav-item ${isActive ? activeClass : ''}`}
                            title={collapsed ? item.label : ''}
                            onClick={item.path ? () => {
                                if (item.path.includes('#')) {
                                    const [pathPart, hashPart] = item.path.split('#');
                                    if (location.pathname === pathPart) {
                                        const el = document.getElementById(`${hashPart}-section`) || document.getElementById(hashPart);
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    } else {
                                        navigate(item.path);
                                    }
                                } else {
                                    navigate(item.path);
                                }
                            } : undefined}
                            style={{ cursor: item.path ? 'pointer' : 'default' }}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                        </div>
                    )
                })}
            </nav>

            <div className="sidebar-bottom">
                <div
                    className={`nav-item ${location.pathname.startsWith('/settings') ? activeClass : ''}`}
                    title={collapsed ? 'Settings' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/settings')}
                >
                    <Settings size={20} />
                    {!collapsed && <span>Settings</span>}
                </div>
                <div className="nav-item" title={collapsed ? 'Logout' : ''} style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <LogOut size={20} />
                    {!collapsed && <span>Logout</span>}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
