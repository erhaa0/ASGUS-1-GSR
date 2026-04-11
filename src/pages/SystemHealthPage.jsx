import React, { useState } from 'react';
import { Server, Database, Cpu, Cloud, Layers } from 'lucide-react';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './SystemHealthPage.css';

const SERVICES = [
    { name: 'API Server', icon: Server, status: 'ONLINE', up: '99.8%', res: '142ms', last: '22:40:01', inc: '0', col: '#22C55E' },
    { name: 'PostgreSQL DB', icon: Database, status: 'ONLINE', up: '99.5%', res: '38ms', last: '22:40:01', inc: '1', col: '#22C55E' },
    { name: 'AI Microservice', icon: Cpu, status: 'ONLINE', up: '98.2%', res: '891ms', last: '22:40:01', inc: '2', col: '#22C55E' },
    { name: 'Azure App Service', icon: Cloud, status: 'DEGRADED', up: '97.1%', res: '2340ms', last: '22:40:01', inc: '3', col: '#F59E0B' },
    { name: 'PostGIS Extension', icon: Layers, status: 'ONLINE', up: '99.9%', res: '12ms', last: '22:40:01', inc: '0', col: '#22C55E' }
];

const CHART_DATA = [
    { day: 'Mon', api: 120, db: 35, ai: 850, azure: 300, postgis: 10 },
    { day: 'Tue', api: 130, db: 38, ai: 880, azure: 450, postgis: 11 },
    { day: 'Wed', api: 125, db: 36, ai: 860, azure: 800, postgis: 12 },
    { day: 'Thu', api: 140, db: 40, ai: 900, azure: 1500, postgis: 14 },
    { day: 'Fri', api: 145, db: 41, ai: 890, azure: 2100, postgis: 13 },
    { day: 'Sat', api: 135, db: 37, ai: 870, azure: 2400, postgis: 11 },
    { day: 'Sun', api: 142, db: 38, ai: 891, azure: 2340, postgis: 12 },
];

const INCIDENTS = [
    { id: 'INC-901', time: '18:42', bg: '#0D0D0D', svc: 'Azure App Service', desc: 'Latency spiked to 2500ms in Southeast Asia', sev: 'High', status: 'Investigating' },
    { id: 'INC-900', time: '14:10', bg: '#111111', svc: 'AI Microservice', desc: 'Model inference timeout on stream payload', sev: 'Medium', status: 'Resolved' },
    { id: 'INC-899', time: '11:05', bg: '#0D0D0D', svc: 'Azure App Service', desc: 'Intermittent connection resets', sev: 'High', status: 'Resolved' },
    { id: 'INC-898', time: '09:30', bg: '#111111', svc: 'PostgreSQL DB', desc: 'Slow query execution on zone aggregation', sev: 'Low', status: 'Resolved' },
    { id: 'INC-897', time: '08:15', bg: '#0D0D0D', svc: 'AI Microservice', desc: 'GPU memory thrashing detected', sev: 'Medium', status: 'Resolved' }
];

const SeverityPill = ({ sev }) => {
    const col = sev === 'High' ? '#EF4444' : sev === 'Medium' ? '#F59E0B' : '#3B82F6';
    return (
        <span style={{ background: `${col}1A`, color: col, border: `1px solid ${col}4D`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' }}>
            {sev.toUpperCase()}
        </span>
    );
};

export default function SystemHealthPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    return (
        <div className="dashboard-container">
            <Topbar subtitle="System Health" />
            <div className="main-wrapper">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

                <div className="health-page">
                    <div className="health-header">
                        <h1>System Health</h1>
                        <p>Infrastructure monitoring and service status</p>
                    </div>

                    {/* Stats Row */}
                    <div className="health-services-row">
                        {SERVICES.map((s, i) => (
                            <div className="health-service-card" key={i}>
                                <div className="service-top-row">
                                    <div className="service-title-wrap">
                                        <div className="service-icon-box" style={{ background: `${s.col}1A`, color: s.col }}>
                                            <s.icon size={16} />
                                        </div>
                                        <div className="service-name">{s.name}</div>
                                    </div>
                                    <div className="service-status-pill" style={{ background: `${s.col}1A`, color: s.col, border: `1px solid ${s.col}4D` }}>
                                        <div className="live-dot" style={{ background: s.col }}></div>
                                        {s.status}
                                    </div>
                                </div>
                                <div className="service-uptime" style={{ color: s.col }}>
                                    {s.up}
                                </div>
                                <div className="service-metrics-box">
                                    <div className="service-metric-row">
                                        <span className="metric-key">Response Time</span>
                                        <span className="metric-val">{s.res}</span>
                                    </div>
                                    <div className="service-metric-row">
                                        <span className="metric-key">Last Checked</span>
                                        <span className="metric-val">{s.last} PKT</span>
                                    </div>
                                    <div className="service-metric-row">
                                        <span className="metric-key">Incidents Today</span>
                                        <span className="metric-val">{s.inc}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Section */}
                    <div className="health-section-card">
                        <h2 className="health-section-title">Response Time Trend</h2>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={CHART_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: 8 }}
                                        itemStyle={{ fontSize: 12, fontFamily: 'Space Mono' }}
                                        labelStyle={{ color: '#888', marginBottom: 4 }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                                    <Line type="monotone" dataKey="api" name="API Server" stroke="#3B82F6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="db" name="PostgreSQL" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="ai" name="AI Microservice" stroke="#EC4899" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="azure" name="Azure App Service" stroke="#F59E0B" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="postgis" name="PostGIS" stroke="#10B981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bottom Split */}
                    <div className="health-bottom-row">
                        <div className="health-section-card">
                            <h2 className="health-section-title">Recent Incidents</h2>
                            <table className="incidents-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Service</th>
                                        <th>Description</th>
                                        <th>Severity</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {INCIDENTS.map((inc) => (
                                        <tr key={inc.id} style={{ background: inc.bg }}>
                                            <td className="mono-td">{inc.time}</td>
                                            <td style={{ fontWeight: 600, color: '#FFF' }}>{inc.svc}</td>
                                            <td>{inc.desc}</td>
                                            <td><SeverityPill sev={inc.sev} /></td>
                                            <td style={{ color: inc.status === 'Resolved' ? '#22C55E' : '#F59E0B' }}>
                                                {inc.status}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="health-section-card">
                            <h2 className="health-section-title">Resource Usage</h2>

                            <div className="resource-box">
                                <div className="resource-header">
                                    <span>CPU Usage</span>
                                    <span style={{ color: '#22C55E' }}>34% <span style={{ color: '#666', fontWeight: 400 }}>/ 100%</span></span>
                                </div>
                                <div className="resource-bar-bg">
                                    <div className="resource-bar-fill" style={{ width: '34%', background: '#22C55E' }}></div>
                                </div>
                            </div>

                            <div className="resource-box">
                                <div className="resource-header">
                                    <span>Memory Usage</span>
                                    <span style={{ color: '#F59E0B' }}>61% <span style={{ color: '#666', fontWeight: 400 }}>/ 100%</span></span>
                                </div>
                                <div className="resource-bar-bg">
                                    <div className="resource-bar-fill" style={{ width: '61%', background: '#F59E0B' }}></div>
                                </div>
                            </div>

                            <div className="resource-box">
                                <div className="resource-header">
                                    <span>Storage Usage</span>
                                    <span style={{ color: '#F97316' }}>78% <span style={{ color: '#666', fontWeight: 400 }}>/ 100%</span></span>
                                </div>
                                <div className="resource-bar-bg">
                                    <div className="resource-bar-fill" style={{ width: '78%', background: '#F97316' }}></div>
                                </div>
                            </div>

                            <div className="resource-meta">
                                <div>Azure Region: Southeast Asia</div>
                                <div>Last deployment: 27 Feb 2026 03:00 UTC</div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
