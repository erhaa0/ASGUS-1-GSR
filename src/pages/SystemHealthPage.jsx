import React, { useState, useEffect } from 'react';
import { Server, Database, Cpu, Cloud, Layers } from 'lucide-react';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchHealth, fetchIncidents, fetchResources } from '../api/api';
import './SystemHealthPage.css';

// ─── Static chart data (no time-series in backend) ───────────────────────────
const CHART_DATA = [
    { day: 'Mon', api: 120, db: 35, ai: 850, azure: 300,  postgis: 10 },
    { day: 'Tue', api: 130, db: 38, ai: 880, azure: 450,  postgis: 11 },
    { day: 'Wed', api: 125, db: 36, ai: 860, azure: 800,  postgis: 12 },
    { day: 'Thu', api: 140, db: 40, ai: 900, azure: 1500, postgis: 14 },
    { day: 'Fri', api: 145, db: 41, ai: 890, azure: 2100, postgis: 13 },
    { day: 'Sat', api: 135, db: 37, ai: 870, azure: 2400, postgis: 11 },
    { day: 'Sun', api: 142, db: 38, ai: 891, azure: 2340, postgis: 12 },
];

// ─── Icon map for services ────────────────────────────────────────────────────
const SERVICE_ICONS = {
    'API Server':       Server,
    'SQLite DB':        Database,
    'AI Microservice':  Cpu,
    'Azure App Service':Cloud,
    'PostGIS Extension':Layers,
};

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

    // ── Real data state ───────────────────────────────
    const [services, setServices]   = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [resources, setResources] = useState({ cpu: 34, memory: 61, storage: 78 });
    const [chartData, setChartData] = useState(CHART_DATA);

    // ── Fetch all health data ─────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                const [healthData, incidentsData, resourcesData] = await Promise.all([
                    fetchHealth(),
                    fetchIncidents(),
                    fetchResources()
                ]);

                if (healthData?.history && healthData.history.length > 0) {
                    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const mapped = healthData.history.map(snap => {
                        const label = snap.timestamp
                            ? DAY_LABELS[new Date(snap.timestamp).getDay()]
                            : (snap.day || '--');
                        const svcMap = {};
                        (snap.services || []).forEach(s => { svcMap[s.name] = s.response_ms || 0; });
                        return {
                            day:     label,
                            api:     svcMap['API Server']        || snap.api     || 0,
                            db:      svcMap['SQLite DB']         || snap.db      || 0,
                            ai:      svcMap['AI Microservice']   || snap.ai      || 0,
                            azure:   svcMap['Azure App Service'] || snap.azure   || 0,
                            postgis: svcMap['PostGIS Extension'] || snap.postgis || 0,
                        };
                    });
                    setChartData(mapped);
                }

                if (healthData?.services) {
                    const mapped = healthData.services.map(s => ({
                        name:   s.name,
                        icon:   SERVICE_ICONS[s.name] || Server,
                        status: s.status === 'Online' ? 'ONLINE' : 'DEGRADED',
                        up:     `${s.uptime}%`,
                        res:    `${s.response_ms}ms`,
                        last:   s.last_checked
                            ? new Date(s.last_checked).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : '--:--:--',
                        inc:    String(s.incidents || 0),
                        col:    s.status === 'Online' ? '#22C55E' : '#F59E0B',
                    }));
                    setServices(mapped);
                }

                if (incidentsData?.incidents) {
                    setIncidents(incidentsData.incidents);
                }

                if (resourcesData) {
                    setResources({
                        cpu:     resourcesData.cpu     || 34,
                        memory:  resourcesData.memory  || 61,
                        storage: resourcesData.storage || 78,
                    });
                }
            } catch (err) {
                console.error('Failed to load health data:', err);
            }
        };

        loadData();

        // Refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    // Resource color helper
    const resourceColor = (val) => {
        if (val < 50) return '#22C55E';
        if (val < 75) return '#F59E0B';
        return '#F97316';
    };

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

                    {/* Services Row */}
                    <div className="health-services-row">
                        {services.map((s, i) => (
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
                                <div className="service-uptime" style={{ color: s.col }}>{s.up}</div>
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
                                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#222', borderRadius: 8 }}
                                        itemStyle={{ fontSize: 12, fontFamily: 'Space Mono' }}
                                        labelStyle={{ color: '#888', marginBottom: 4 }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                                    <Line type="monotone" dataKey="api"     name="API Server"         stroke="#3B82F6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="db"      name="SQLite DB"          stroke="#8B5CF6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="ai"      name="AI Microservice"    stroke="#EC4899" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="azure"   name="Azure App Service"  stroke="#F59E0B" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="postgis" name="PostGIS"            stroke="#10B981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bottom Split */}
                    <div className="health-bottom-row">

                        {/* Incidents Table */}
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
                                    {incidents.length > 0 ? incidents.map((inc, i) => (
                                        <tr key={inc.id || i} style={{ background: i % 2 === 0 ? '#0D0D0D' : '#111111' }}>
                                            <td className="mono-td">{inc.time || '--:--'}</td>
                                            <td style={{ fontWeight: 600, color: '#FFF' }}>{inc.service || 'System'}</td>
                                            <td>{inc.description || inc.desc || 'N/A'}</td>
                                            <td><SeverityPill sev={inc.severity || inc.sev || 'Low'} /></td>
                                            <td style={{ color: inc.status === 'Resolved' ? '#22C55E' : '#F59E0B' }}>
                                                {inc.status}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#555', fontSize: 13 }}>
                                                No incidents reported
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Resource Usage */}
                        <div className="health-section-card">
                            <h2 className="health-section-title">Resource Usage</h2>

                            <div className="resource-box">
                                <div className="resource-header">
                                    <span>CPU Usage</span>
                                    <span style={{ color: resourceColor(resources.cpu) }}>
                                        {resources.cpu}% <span style={{ color: '#666', fontWeight: 400 }}>/ 100%</span>
                                    </span>
                                </div>
                                <div className="resource-bar-bg">
                                    <div className="resource-bar-fill" style={{ width: `${resources.cpu}%`, background: resourceColor(resources.cpu) }}></div>
                                </div>
                            </div>

                            <div className="resource-box">
                                <div className="resource-header">
                                    <span>Memory Usage</span>
                                    <span style={{ color: resourceColor(resources.memory) }}>
                                        {resources.memory}% <span style={{ color: '#666', fontWeight: 400 }}>/ 100%</span>
                                    </span>
                                </div>
                                <div className="resource-bar-bg">
                                    <div className="resource-bar-fill" style={{ width: `${resources.memory}%`, background: resourceColor(resources.memory) }}></div>
                                </div>
                            </div>

                            <div className="resource-box">
                                <div className="resource-header">
                                    <span>Storage Usage</span>
                                    <span style={{ color: resourceColor(resources.storage) }}>
                                        {resources.storage}% <span style={{ color: '#666', fontWeight: 400 }}>/ 100%</span>
                                    </span>
                                </div>
                                <div className="resource-bar-bg">
                                    <div className="resource-bar-fill" style={{ width: `${resources.storage}%`, background: resourceColor(resources.storage) }}></div>
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