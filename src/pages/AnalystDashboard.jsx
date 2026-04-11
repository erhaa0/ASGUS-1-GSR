import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
    LayoutDashboard,
    Bell,
    Navigation,
    BarChart3,
    FileText,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Map as MapIcon,
    ChevronDown,
    X,
    User,
    Lock,
    Download
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import './AnalystDashboard.css';

// --- MOCK DATA ---

const _NOW = Date.now();
const _MIN = 60 * 1000;
const _HR = 60 * _MIN;
const _DAY = 24 * _HR;

const RISK_ZONES = [
    { id: 1, name: 'Quetta', pos: [30.18, 67.0], risk: 'Critical', color: '#EF4444', pulse: '1.2s', detectedAt: _NOW - 8 * _HR },
    { id: 2, name: 'Kech', pos: [26.0, 63.5], risk: 'Critical', color: '#EF4444', pulse: '1.2s', detectedAt: _NOW - 2 * _HR },
    { id: 3, name: 'Zhob', pos: [31.34, 69.45], risk: 'High', color: '#F97316', pulse: '2s', detectedAt: _NOW - 30 * _HR },
    { id: 4, name: 'Pishin', pos: [30.58, 66.98], risk: 'Medium', color: '#F59E0B', pulse: '2.5s', detectedAt: _NOW - 4 * _DAY },
    { id: 5, name: 'Swat', pos: [35.22, 72.42], risk: 'Critical', color: '#EF4444', pulse: '1.2s', detectedAt: _NOW - 25 * _MIN },
    { id: 6, name: 'Dir', pos: [35.2, 71.88], risk: 'Low', color: '#22C55E', pulse: '3s', detectedAt: _NOW - 10 * _DAY },
];

const FILTER_WINDOWS = { '1H': _HR, '6H': 6 * _HR, '24H': 24 * _HR, '7D': 7 * _DAY, 'ALL': Infinity };
const FILTER_LABELS = { '1H': '1 hour', '6H': '6 hours', '24H': '24 hours', '7D': '7 days', 'ALL': 'all time' };

const MOCK_ALERTS = [
    { id: 1, zone: 'Swat Valley', risk: 'Critical', time: '14:22:05', desc: 'Large scale locust swarm detected moving North-East. Velocity: 12km/h.', confidence: 98, type: 'Locust Swarm', detectedAt: _NOW - 25 * _MIN },
    { id: 2, zone: 'Kech District', risk: 'Critical', time: '14:15:30', desc: 'Unusual rapid movement detected near Kech crossing. Likely animal herd.', confidence: 94, type: 'Animal Herd', detectedAt: _NOW - 2 * _HR },
    { id: 3, zone: 'Quetta South', risk: 'High', time: '13:45:12', desc: 'Sustained terrain vibration detected. Multiple signatures confirmed.', confidence: 89, type: 'Movement', detectedAt: _NOW - 8 * _HR },
    { id: 4, zone: 'Zhob North', risk: 'High', time: '13:10:00', desc: 'Secondary locust cluster forming in agricultural sector 4.', confidence: 91, type: 'Locust Swarm', detectedAt: _NOW - 30 * _HR },
    { id: 5, zone: 'Pishin Plains', risk: 'Medium', time: '12:55:40', desc: 'Scattered movement patterns detected. Monitoring for convergence.', confidence: 82, type: 'Monitoring', detectedAt: _NOW - 4 * _DAY },
];

const CHART_DATA = [
    { time: '10:00', events: 12 },
    { time: '11:00', events: 18 },
    { time: '12:00', events: 25 },
    { time: '13:00', events: 32 },
    { time: '14:00', events: 45 },
    { time: '15:00', events: 38 },
    { time: '16:00', events: 22 },
    { time: '17:00', events: 15 },
];

// --- SUB-COMPONENTS ---

const NativeMap = ({ onMarkerClick, selectedZone, setMouseCoords, activeLayer, mapInstanceRef, timeFilter }) => {
    const mapRef = useRef(null);
    const markersGroupRef = useRef(null);
    const tileLayerRef = useRef(null);
    const overlayGroupRef = useRef(null);
    const markerEls = useRef([]);   // { el: HTMLElement, detectedAt: number }
    const [mapReady, setMapReady] = useState(false);

    const TILE_URLS = {
        Terrain: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        Heatmap: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        Satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        Vegetation: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    };

    // 1. Initialize the map
    useEffect(() => {
        if (mapInstanceRef.current || !mapRef.current) return;

        const map = L.map(mapRef.current, {
            center: [30.0, 68.5],
            zoom: 7,
            zoomControl: false,
            backgroundColor: '#080808'
        });

        // Initialize groups
        markersGroupRef.current = L.layerGroup().addTo(map);

        // Define base tile layer
        const baseTile = L.tileLayer(TILE_URLS.Terrain, { attribution: '© OpenStreetMap contributors © CARTO' });
        baseTile.addTo(map);
        tileLayerRef.current = baseTile;

        // Build markers — store DOM element refs for opacity-based time filtering
        markerEls.current = [];
        RISK_ZONES.forEach(z => {
            const icon = L.divIcon({
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                html: `
                    <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;transition:opacity 0.3s ease;">
                        <div style="
                            position:absolute;
                            width:40px;height:40px;
                            border-radius:50%;
                            border:2px solid ${z.color};
                            animation:zone-pulse ${z.pulse} ease-out infinite;
                            opacity:0;
                        "></div>
                        <div style="
                            width:20px;height:20px;
                            border-radius:50%;
                            background:${z.color};
                            border:2px solid rgba(0,0,0,0.4);
                            cursor:pointer;
                            box-shadow:0 0 6px ${z.color}88;
                        "></div>
                    </div>`,
            });
            const marker = L.marker(z.pos, { icon }).addTo(markersGroupRef.current);
            marker.on('click', () => onMarkerClick(z));
            markerEls.current.push({ el: marker.getElement(), detectedAt: z.detectedAt, marker });
        });

        // Pointer event interceptors
        const disableDrag = () => { if (map.dragging) map.dragging.disable(); };
        const enableDrag = () => { if (map.dragging) map.dragging.enable(); };
        const container = map.getContainer();
        container.addEventListener('mouseleave', disableDrag);
        container.addEventListener('mouseenter', enableDrag);

        // Mouse coordinates
        map.on('mousemove', (e) => {
            setMouseCoords({
                lat: e.latlng.lat.toFixed(4),
                lng: e.latlng.lng.toFixed(4)
            });
        });

        mapInstanceRef.current = map;
        setMapReady(true);

        return () => {
            if (mapInstanceRef.current) {
                container.removeEventListener('mouseleave', disableDrag);
                container.removeEventListener('mouseenter', enableDrag);
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // 2. React to layer changes (also depends on mapReady so it fires once the map is initialized)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // Swap base tiles — always remove old one first
        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
            tileLayerRef.current = null;
        }
        const newTile = L.tileLayer(TILE_URLS[activeLayer] || TILE_URLS.Terrain, {
            attribution: activeLayer === 'Satellite' ? 'Esri World Imagery' : '© OpenStreetMap contributors © CARTO',
        });
        newTile.addTo(map);
        tileLayerRef.current = newTile;

        // Overlay layers — always remove old one first
        if (overlayGroupRef.current) {
            map.removeLayer(overlayGroupRef.current);
            overlayGroupRef.current = null;
        }

        if (activeLayer === 'Heatmap') {
            const group = L.layerGroup();
            RISK_ZONES.forEach(z => {
                L.circle(z.pos, { radius: 35000, fillColor: z.color, fillOpacity: 0.15, stroke: false }).addTo(group);
            });
            group.addTo(map);
            overlayGroupRef.current = group;
        } else if (activeLayer === 'Vegetation') {
            const group = L.layerGroup();
            RISK_ZONES.forEach(z => {
                L.circle(z.pos, { radius: 25000, fillColor: '#22C55E', fillOpacity: 0.12, stroke: false }).addTo(group);
            });
            group.addTo(map);
            overlayGroupRef.current = group;
        }
    }, [activeLayer, mapReady]);

    // 4. React to time filter — toggle marker visibility via opacity
    useEffect(() => {
        const window = FILTER_WINDOWS[timeFilter] ?? Infinity;
        markerEls.current.forEach(({ el, detectedAt }) => {
            if (!el) return;
            const age = Date.now() - detectedAt;
            const visible = age <= window;
            el.style.opacity = visible ? '1' : '0.1';
            el.style.pointerEvents = visible ? '' : 'none';
        });
    }, [timeFilter, mapReady]);

    // 3. React to target selection (flyTo)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (map && selectedZone?.pos) {
            map.flyTo(selectedZone.pos, 10, { duration: 1.5 });
        }
    }, [selectedZone]);

    return (
        <div className="map-wrapper" style={{ height: '100%', width: '100%', isolation: 'isolate', zIndex: 0, position: 'relative' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
        </div>
    );
};



const MapArea = ({ onMarkerClick, selectedZone, setMouseCoords, activeLayer, setActiveLayer, timeFilter, setTimeFilter }) => {
    const mapInstanceRef = useRef(null);

    return (
        <div className="map-area">
            <style>{`
                @keyframes zone-pulse {
                    0% { transform: scale(1); opacity: 0.7; }
                    100% { transform: scale(2.2); opacity: 0; }
                }
            `}</style>
            <NativeMap
                onMarkerClick={onMarkerClick}
                selectedZone={selectedZone}
                setMouseCoords={setMouseCoords}
                activeLayer={activeLayer}
                mapInstanceRef={mapInstanceRef}
                timeFilter={timeFilter}
            />

            {/* Layer Toggles — top left */}
            <div className="map-overlay-top-left">
                {['Terrain', 'Heatmap', 'Satellite', 'Vegetation'].map(layer => (
                    <button
                        key={layer}
                        className={`layer-btn ${activeLayer === layer ? 'active' : ''}`}
                        onClick={() => setActiveLayer(layer)}
                    >
                        {layer}
                    </button>
                ))}
            </div>

            {/* Time Filter Strip — top right */}
            <div style={{
                position: 'absolute', top: 12, right: 12, zIndex: 1000,
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
            }}>
                <div style={{
                    display: 'flex', gap: 4, padding: 4,
                    background: 'rgba(13,13,13,0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #1E1E1E',
                    borderRadius: 6,
                }}>
                    {['1H', '6H', '24H', '7D', 'ALL'].map(f => (
                        <button
                            key={f}
                            onClick={() => setTimeFilter(f)}
                            style={{
                                padding: '4px 10px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontFamily: 'Space Mono, monospace',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                background: timeFilter === f ? '#F59E0B' : 'rgba(20,20,20,0.9)',
                                color: timeFilter === f ? '#000' : '#555555',
                                border: timeFilter === f ? 'none' : '1px solid #2A2A2A',
                                fontWeight: timeFilter === f ? 700 : 400,
                            }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#444', paddingRight: 2 }}>
                    Showing detections from last {FILTER_LABELS[timeFilter]}
                </span>
            </div>

            {/* Control Buttons — bottom right */}
            <div className="map-overlay-bottom-right">
                <button className="map-ctrl-btn"><Maximize2 size={16} /></button>
                <button className="map-ctrl-btn" onClick={() => mapInstanceRef.current?.zoomIn()}>+</button>
                <button className="map-ctrl-btn" onClick={() => mapInstanceRef.current?.zoomOut()}>-</button>
                <button className="map-ctrl-btn" onClick={() => mapInstanceRef.current?.flyTo([30.0, 68.5], 7, { duration: 1.2 })}><MapIcon size={16} /></button>
            </div>

            {/* Legend */}
            <div className="map-overlay-bottom-left">
                <div className="legend-card">
                    <div className="legend-item"><div className="dot" style={{ background: '#EF4444' }}></div> Critical Risk</div>
                    <div className="legend-item"><div className="dot" style={{ background: '#F97316' }}></div> High Risk</div>
                    <div className="legend-item"><div className="dot" style={{ background: '#F59E0B' }}></div> Medium Risk</div>
                    <div className="legend-item"><div className="dot" style={{ background: '#22C55E' }}></div> Low Risk</div>
                </div>
            </div>
        </div>
    );
};

const RightPanel = ({ onZoneClick, selectedAlertId, selectedZoneId, timeFilter }) => {
    const [activeTab, setActiveTab] = useState('Alerts');
    const window_ms = FILTER_WINDOWS[timeFilter] ?? Infinity;
    const visibleAlerts = MOCK_ALERTS.filter(a => (Date.now() - a.detectedAt) <= window_ms);
    const criticalCount = visibleAlerts.filter(a => a.risk === 'Critical').length;

    return (
        <aside className="right-panel">
            <div className="panel-tabs">
                {['Alerts', 'Zones', 'Stats'].map(t => (
                    <div
                        key={t}
                        className={`tab ${activeTab === t ? 'active' : ''}`}
                        onClick={() => setActiveTab(t)}
                    >
                        {t}
                    </div>
                ))}
            </div>

            <div className="tab-content">
                {activeTab === 'Alerts' && (
                    <>
                        <div className="alert-banner">
                            <span>⚠️ {criticalCount} critical alert{criticalCount !== 1 ? 's' : ''} in window</span>
                            <span className="mono" style={{ fontSize: 10 }}>last {FILTER_LABELS[timeFilter]}</span>
                        </div>
                        {visibleAlerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`alert-card ${selectedAlertId === alert.id ? 'selected' : ''}`}
                                onClick={() => onZoneClick(RISK_ZONES.find(z => z.name.includes(alert.zone.split(' ')[0])))}
                                style={{ borderLeftColor: alert.risk === 'Critical' ? '#EF4444' : '#F97316' }}
                            >
                                <div className="alert-header">
                                    <span className="risk-pill" style={{
                                        background: alert.risk === 'Critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                        color: alert.risk === 'Critical' ? '#EF4444' : '#F97316'
                                    }}>{alert.risk.toUpperCase()}</span>
                                    <span className="alert-time mono">{alert.time}</span>
                                </div>
                                <div className="alert-title">{alert.zone}</div>
                                <p className="alert-desc">{alert.desc}</p>
                                <div className="alert-chips">
                                    <span className="chip">{alert.confidence}% Confidence</span>
                                    <span className="chip">{alert.type}</span>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {activeTab === 'Zones' && (
                    <>
                        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div className="stat-card">
                                <div className="stat-val" style={{ color: '#F59E0B' }}>24</div>
                                <div className="stat-label">ACTIVE ZONES</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-val" style={{ color: '#EF4444' }}>3</div>
                                <div className="stat-label">CRITICAL</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-val" style={{ color: '#F97316' }}>7</div>
                                <div className="stat-label">HIGH RISK</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-val" style={{ color: '#22C55E' }}>14</div>
                                <div className="stat-label">CLEARED</div>
                            </div>
                        </div>
                        <div style={{ paddingBottom: 20 }}>
                            {RISK_ZONES.map(z => (
                                <div
                                    key={z.id}
                                    className={`zone-row ${selectedZoneId === z.id ? 'active-row' : ''}`}
                                    onClick={() => onZoneClick(z)}
                                >
                                    <div className="dot" style={{ background: z.color }}></div>
                                    <div className="zone-info">
                                        <div className="zone-name">{z.name}</div>
                                        <div className="zone-bar-bg">
                                            <div className="zone-bar-fill" style={{
                                                width: z.risk === 'Critical' ? '95%' : (z.risk === 'High' ? '70%' : '40%'),
                                                background: z.color
                                            }}></div>
                                        </div>
                                    </div>
                                    <span className="mono" style={{ fontSize: 11, color: z.color }}>
                                        {z.risk === 'Critical' ? '95' : (z.risk === 'High' ? '70' : '40')}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'Stats' && (
                    <div style={{ animation: 'slideIn 0.3s ease-out' }}>
                        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                            <div className="stat-card">
                                <div className="stat-val" style={{ color: '#F59E0B' }}>1.2k</div>
                                <div className="stat-label">EVENTS DETECTED</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-val" style={{ color: '#22C55E' }}>89%</div>
                                <div className="stat-label">AVG CONFIDENCE</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-val" style={{ color: '#EF4444' }}>10</div>
                                <div className="stat-label">CRITICAL + HIGH</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-val" style={{ color: '#F5F5F5' }}>3</div>
                                <div className="stat-label">REPORTS GENERATED</div>
                            </div>
                        </div>

                        <h4 style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>HOURLY DETECTION COUNT</h4>
                        <div style={{ height: 180, width: '100%', marginBottom: 24 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={CHART_DATA}>
                                    <Bar dataKey="events" radius={[2, 2, 0, 0]}>
                                        {CHART_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 4 ? '#F59E0B' : '#333'} />
                                        ))}
                                    </Bar>
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#555' }} />
                                    <Tooltip
                                        contentStyle={{ background: '#0D0D0D', border: '1px solid #1E1E1E', borderRadius: 4, fontSize: 11 }}
                                        itemStyle={{ color: '#F59E0B' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <h4 style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>EVENT TYPE BREAKDOWN</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Locust Swarm', val: 52, color: '#F59E0B' },
                                { label: 'Animal Herd', val: 30, color: '#F97316' },
                                { label: 'Unknown', val: 18, color: '#555' }
                            ].map(type => (
                                <div key={type.label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                        <span>{type.label}</span>
                                        <span className="mono">{type.val}%</span>
                                    </div>
                                    <div className="zone-bar-bg"><div className="zone-bar-fill" style={{ width: `${type.val}%`, background: type.color }}></div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

const ZoneDrawer = ({ zone, onClose, onGenerateReport, onViewDetails }) => {
    return (
        <div className={`zone-drawer ${zone ? 'visible' : ''}`}>
            <div className="drawer-main">
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{zone?.name}</h2>
                    <span className="risk-pill" style={{ background: 'rgba(255,255,255,0.05)', color: zone?.color, display: 'inline-block', marginTop: 4 }}>
                        {zone?.risk.toUpperCase()} RISK
                    </span>
                </div>

                <div className="topbar-divider" style={{ height: 40, margin: '0 20px' }}></div>

                <div className="drawer-grid">
                    <div>
                        <div className="stat-label">CONFIDENCE</div>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>98.2%</div>
                    </div>
                    <div>
                        <div className="stat-label">EVENT TYPE</div>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>Locust Swarm</div>
                    </div>
                    <div>
                        <div className="stat-label">DETECTED TIME</div>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>14:22:05 UTC</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <button className="drawer-btn btn-outline" onClick={() => onViewDetails(zone)}>VIEW FULL DETAIL</button>
                <button className="drawer-btn btn-filled" onClick={() => onGenerateReport(zone)}>GENERATE REPORT</button>
                <div className="sidebar-toggle" style={{ position: 'static', marginLeft: 10, cursor: 'pointer' }} onClick={onClose}>
                    <X size={20} />
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const AnalystDashboard = () => {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedZone, setSelectedZone] = useState(null);
    const [mouseCoords, setMouseCoords] = useState({ lat: '30.1800', lng: '67.0000' });

    // New States
    const [activeLayer, setActiveLayer] = useState('Terrain');
    const [timeFilter, setTimeFilter] = useState('24H');
    const [showModal, setShowModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [toast, setToast] = useState(null);
    const [reportType, setReportType] = useState('Full Report');
    const [includeCharts, setIncludeCharts] = useState(true);

    const showSuccessToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleGeneratePDF = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const zoneName = selectedZone?.name || 'Unknown Zone';
            const content = `ASGUS-1 GSR SYSTEM REPORT\n======================\nZone: ${zoneName}\nReport Type: ${reportType}\nDate Range: 2026-02-21 to 2026-02-28\nGenerated: ${new Date().toISOString()}\nConfidence: 94%\nRisk Level: ${selectedZone?.risk || 'Medium'}\n\nThis report was generated by the ASGUS-1 GSR Intelligent Terrain Movement Detection System.`;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asgus1-report-${zoneName}-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setIsGenerating(false);
            setShowModal(false);
            showSuccessToast('Report downloaded successfully');
        }, 2000);
    };

    return (
        <div className="dashboard-container">
            <Topbar subtitle="Dashboard" />

            <div className="main-wrapper">
                <Sidebar
                    collapsed={sidebarCollapsed}
                    setCollapsed={setSidebarCollapsed}
                    activeItem="dashboard"
                />

                <main className="dashboard-content">
                    <div className="map-area-container" style={{ flex: 1, position: 'relative' }}>
                        <MapArea
                            onMarkerClick={(z) => setSelectedZone(z)}
                            selectedZone={selectedZone}
                            setMouseCoords={setMouseCoords}
                            activeLayer={activeLayer}
                            setActiveLayer={setActiveLayer}
                            timeFilter={timeFilter}
                            setTimeFilter={setTimeFilter}
                        />

                        {/* Coordinate Overlay */}
                        <div className="map-overlay-bottom-center mono">
                            {mouseCoords.lat} N &nbsp;&middot;&nbsp; {mouseCoords.lng} E
                        </div>

                        <ZoneDrawer
                            zone={selectedZone}
                            onClose={() => setSelectedZone(null)}
                            onGenerateReport={() => setShowModal(true)}
                            onViewDetails={(z) => navigate(`/zone/${z.name}`, { state: { zone: z } })}
                        />
                    </div>

                    <RightPanel
                        onZoneClick={(z) => setSelectedZone(z)}
                        selectedZoneId={selectedZone?.id}
                        timeFilter={timeFilter}
                    />
                </main>
            </div>

            {/* Generate Report Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Generate Zone Report</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="topbar-divider" style={{ width: '100%', margin: '16px 0' }}></div>

                        <div className="modal-body">
                            <div className="input-group">
                                <label>Zone Name</label>
                                <input type="text" value={selectedZone?.name || ''} readOnly className="modal-input read-only" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="input-group">
                                    <label>From</label>
                                    <input type="date" defaultValue="2026-02-21" className="modal-input" />
                                </div>
                                <div className="input-group">
                                    <label>To</label>
                                    <input type="date" defaultValue="2026-02-28" className="modal-input" />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Report Type</label>
                                <div className="pill-group">
                                    {['Risk Analysis', 'Movement Summary', 'Full Report'].map(t => (
                                        <button
                                            key={t}
                                            className={`pill-btn ${reportType === t ? 'active' : ''}`}
                                            onClick={() => setReportType(t)}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="toggle-group">
                                <span>Include Charts</span>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={includeCharts}
                                        onChange={() => setIncludeCharts(!includeCharts)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <button
                                className="generate-btn"
                                disabled={isGenerating}
                                onClick={handleGeneratePDF}
                            >
                                {isGenerating ? <div className="spinner"></div> : 'GENERATE PDF →'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {toast && (
                <div className="success-toast">
                    <span className="toast-text">
                        {toast.split(' · ')[0]} &nbsp;&middot;&nbsp;
                        <a href="#" className="download-link">Download</a>
                    </span>
                </div>
            )}

        </div>
    );
};

export default AnalystDashboard;
