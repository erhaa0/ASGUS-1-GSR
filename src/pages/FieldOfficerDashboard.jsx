import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import {
    Home, PlusCircle, Clock, Settings, LogOut, ChevronLeft, ChevronRight,
    MapPin, Camera, X, Check, Upload, AlertTriangle, ChevronDown, FileText,
    Maximize2, Minimize2
} from 'lucide-react';
import { UserContext } from '../App';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { fetchZones, submitObservation, fetchObservations, downloadReport, uploadObservationPhoto } from '../api/api';
import './AnalystDashboard.css';
import './FieldOfficerDashboard.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const RISK_COLOR_MAP = {
    Critical: '#EF4444',
    High:     '#F97316',
    Medium:   '#F59E0B',
    Low:      '#22C55E',
};
const RISK_PULSE_MAP = {
    Critical: '1.2s',
    High:     '1.7s',
    Medium:   '2.2s',
    Low:      '2.8s',
};

const STATUS_COLORS = {
    Submitted: '#F59E0B',
    Reviewed:  '#22C55E',
    Flagged:   '#EF4444'
};

// ─── Shared Components ────────────────────────────────────────────────────────
const RiskPill = ({ risk, color }) => (
    <span style={{ background: `${color}1A`, color: color, border: `1px solid ${color}4D`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' }}>
        {risk.toUpperCase()}
    </span>
);

// ─── Report Modal ─────────────────────────────────────────────────────────────
const FOReportModal = ({ onClose, onShowToast, assignedZones }) => {
    const [reportType, setReportType]     = useState('Observation Summary');
    const [includeCharts, setIncludeCharts] = useState(true);
    const [fromDate, setFromDate]         = useState('2026-02-21');
    const [toDate, setToDate]             = useState('2026-02-28');
    const [generating, setGenerating]     = useState(false);
    const [selectedZone, setSelectedZone] = useState(assignedZones[0]?.zone_id || '');

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            if (selectedZone) {
                await downloadReport(selectedZone);
                onClose();
                onShowToast('Report downloaded successfully');
            } else {
                // Fallback text blob
                const content = `ASGUS-1 GSR FIELD OFFICER REPORT\n======================\nReport Type: ${reportType}\nDate Range: ${fromDate} to ${toDate}\nGenerated: ${new Date().toISOString()}`;
                const blob = new Blob([content], { type: 'text/plain' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href = url; a.download = `asgus1-fo-report-${Date.now()}.txt`;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                onClose();
                onShowToast('Report downloaded successfully');
            }
        } catch (err) {
            console.error('Report failed:', err);
            onShowToast('Report generation failed');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Generate Field Report</h3>
                    <button className="close-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="topbar-divider" style={{ width: '100%', margin: '16px 0' }}></div>
                <div className="modal-body">
                    <div className="input-group">
                        <label>Zone</label>
                        <select className="modal-input" value={selectedZone} onChange={e => setSelectedZone(e.target.value)} style={{ cursor: 'pointer' }}>
                            {assignedZones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                        <div className="input-group" style={{ flex: '1 1 200px' }}><label>From</label><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="modal-input" /></div>
                        <div className="input-group" style={{ flex: '1 1 200px' }}><label>To</label><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="modal-input" /></div>
                    </div>
                    <div className="input-group">
                        <label>Report Type</label>
                        <div className="pill-group">
                            {['Observation Summary', 'Zone Activity Log', 'Field Report'].map(t => (
                                <button key={t} className={`pill-btn ${reportType === t ? 'active' : ''}`}
                                    style={reportType === t ? { background: '#22C55E', color: '#000', borderColor: '#22C55E' } : {}}
                                    onClick={() => setReportType(t)}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="toggle-group">
                        <span>Include Charts</span>
                        <label className="switch">
                            <input type="checkbox" checked={includeCharts} onChange={() => setIncludeCharts(!includeCharts)} />
                            <span className="slider round" style={includeCharts ? { background: '#22C55E' } : {}}></span>
                        </label>
                    </div>
                    <button className="generate-btn" disabled={generating} onClick={handleGenerate} style={{ background: '#22C55E', color: '#000' }}>
                        {generating ? <div className="spinner black"></div> : 'GENERATE PDF →'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FieldOfficerDashboard = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { user }  = useContext(UserContext);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth <= 768);

    const mapRef         = useRef(null);
    const mapInstanceRef = useRef(null);

    // ── Real data state ───────────────────────────────
    const [assignedZones, setAssignedZones] = useState([]);
    const [history, setHistory]             = useState([]);
    const [selectedZone, setSelectedZone]   = useState('');
    const [isMapMaximized, setIsMapMaximized] = useState(false);

    // ── Fetch assigned zones and observations ─────────
    useEffect(() => {
        const loadData = async () => {
            try {
                const [zonesData, obsData] = await Promise.all([
                    fetchZones(),
                    fetchObservations({ user_id: user?.user_id })
                ]);

                if (zonesData) {
                    // Field officer sees all zones (filter by assigned_zone if needed)
                    const zones = zonesData.slice(0, 3); // Show first 3 as assigned
                    setAssignedZones(zones);
                    if (zones.length > 0) setSelectedZone(zones[0].zone_name);
                }

                if (obsData) {
                    const mapped = obsData.map(o => ({
                        id:         o.observation_id,
                        zone:       o.zone_name,
                        type:       o.event_type,
                        status:     o.status || 'Submitted',
                        severity:   o.severity || 'Low',
                        scale:      o.estimated_scale || 'Small',
                        desc:       o.notes || '',
                        time:       o.submitted_at
                            ? new Date(o.submitted_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' PKT'
                            : '',
                        riskColor:  RISK_COLOR_MAP[o.severity] || '#22C55E',
                    }));
                    setHistory(mapped);
                }
            } catch (err) {
                console.error('Failed to load field officer data:', err);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (location.hash) {
            const hash = location.hash.replace('#', '');
            const id   = hash + '-section';
            const el   = document.getElementById(id) || document.getElementById(hash);
            if (el) {
                setTimeout(() => {
                    const mainEl = document.querySelector('main');
                    if (mainEl) {
                        mainEl.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
                    } else {
                        el.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 50);
            }
        }
    }, [location.hash]);

    // Form state
    const [formZone, setFormZone]       = useState('');
    const [formType, setFormType]       = useState('Locust Activity');
    const [formDesc, setFormDesc]       = useState('');
    const [formLat, setFormLat]         = useState('');
    const [formLng, setFormLng]         = useState('');
    const [formSeverity, setFormSeverity] = useState('');
    const [formScale, setFormScale]     = useState('Small (< 1 sq km)');
    const [formNotes, setFormNotes]     = useState('');
    const [formFile, setFormFile]       = useState(null);
    const [errors, setErrors]           = useState({});
    const [submitting, setSubmitting]   = useState(false);
    const [toast, setToast]             = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [expandedCard, setExpandedCard] = useState(null);

    // ── Map init ──────────────────────────────────────
    useEffect(() => {
        if (mapInstanceRef.current || !mapRef.current || assignedZones.length === 0) return;

        const map = L.map(mapRef.current, {
            center: [30.5, 67.5], zoom: 8,
            zoomControl: true, attributionControl: false,
            backgroundColor: '#080808'
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO'
        }).addTo(map);

        assignedZones.forEach(zone => {
            const color = RISK_COLOR_MAP[zone.risk_level] || '#F59E0B';
            const pulse = RISK_PULSE_MAP[zone.risk_level] || '2s';
            const icon  = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="marker-pulse-wrapper">
                         <div class="marker-ring" style="border-color:${color}; animation-duration:${pulse}"></div>
                         <div class="marker-core" style="background-color:${color}; box-shadow: 0 0 10px ${color}"></div>
                       </div>`,
                iconSize: [24, 24], iconAnchor: [12, 12]
            });

            L.marker([zone.lat, zone.lon], { icon })
                .bindPopup(`
                    <div style="background:#111; padding:8px; border-radius:4px; border:1px solid #222; color:#fff; font-family:'Space Grotesk',sans-serif;">
                        <div style="font-weight:700; margin-bottom:4px; font-size:14px;">${zone.zone_name}</div>
                        <div style="font-size:10px; color:${color}; border:1px solid ${color}44; border-radius:3px; padding:1px 4px; display:inline-block; margin-bottom:6px;">${zone.risk_level.toUpperCase()}</div>
                        <div style="font-family:'Space Mono',monospace; font-size:10px; color:#888;">Confidence: ${Math.round(zone.confidence * 100)}%</div>
                    </div>
                `, { className: 'custom-dark-popup' })
                .addTo(map);
        });

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [assignedZones]);

    const handleAutoFillGPS = () => {
        if (!formZone) { setErrors({ ...errors, zone: true }); return; }
        const z = assignedZones.find(x => x.zone_name === formZone);
        if (z) {
            setFormLat((z.lat + (Math.random() * 0.02 - 0.01)).toFixed(5));
            setFormLng((z.lon + (Math.random() * 0.02 - 0.01)).toFixed(5));
            setErrors({ ...errors, zone: false });
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) setFormFile(e.target.files[0]);
    };

    const handleSubmitObservation = async () => {
        const newErrors = {};
        if (!formZone) newErrors.zone = true;
        if (!formDesc) newErrors.desc = true;
        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        setSubmitting(true);
        setErrors({});

        try {
            const zone    = assignedZones.find(z => z.zone_name === formZone);
            const result  = await submitObservation({
                user_id:         user?.user_id || 'field01',
                zone_id:         zone?.zone_id || 'quetta',
                event_type:      formType,
                severity:        formSeverity || 'Low',
                estimated_scale: formScale,
                latitude:        parseFloat(formLat) || zone?.lat || 0,
                longitude:       parseFloat(formLng) || zone?.lon || 0,
                notes:           formDesc + (formNotes ? '\n' + formNotes : ''),
            });

            // Upload photo if one was selected
            if (formFile && result.observation_id) {
                try {
                    await uploadObservationPhoto(result.observation_id, formFile);
                } catch (photoErr) {
                    console.warn('Photo upload failed but observation was saved:', photoErr);
                }
            }

            const newEntry = {
                id:        result.observation_id,
                zone:      formZone,
                type:      formType,
                status:    'Submitted',
                severity:  formSeverity || 'Low',
                scale:     formScale,
                desc:      formDesc,
                time:      new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' PKT',
                riskColor: RISK_COLOR_MAP[formSeverity] || '#22C55E',
            };

            setHistory([newEntry, ...history]);
            setToast(`Observation submitted successfully · ID: ${result.observation_id}`);
            setTimeout(() => setToast(null), 4000);

            // Reset form
            setFormZone(''); setFormDesc(''); setFormLat('');
            setFormLng(''); setFormSeverity(''); setFormNotes('');
            setFormFile(null);
        } catch (err) {
            console.error('Submission failed:', err);
            setToast('Submission failed — please try again');
            setTimeout(() => setToast(null), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`dashboard-container ${sidebarCollapsed ? 'sidebar-collapsed-global' : ''}`}>
            <Topbar subtitle="Field Officer Portal" onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div className="main-wrapper">
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

                <main style={{ flex: 1, overflowY: 'auto', background: '#080808' }}>
                    <div className="fo-content-area">

                        {/* Section 1 — Assignment Card */}
                        <div className="fo-card" style={{ marginBottom: 16, position: 'relative' }}>
                            <div className="fo-assignment-layout" style={{ marginTop: 12 }}>
                                <div className="fo-assignment-left">
                                    <div className="fo-muted-caps">Today's Assignment</div>
                                    <div className="fo-officer-name">{user?.name || 'Field Officer'}</div>
                                    <div className="fo-officer-sub">Senior Field Officer &middot; Badge #{user?.badge || 'FO-0001'}</div>
                                    <div className="fo-shift">
                                        <Clock size={14} /> <span>Shift: 08:00 &mdash; 20:00 PKT</span>
                                    </div>
                                    <div className="fo-duty-pill-inline">
                                        <div className="live-dot" style={{ background: '#22C55E' }}></div> ON DUTY
                                    </div>
                                </div>
                                <div className="fo-assignment-right">
                                    <div className="fo-stat-box">
                                        <div className="fo-stat-val" style={{ color: '#22C55E' }}>{assignedZones.length}</div>
                                        <div className="fo-stat-lbl">Assigned Zones</div>
                                    </div>
                                    <div className="fo-stat-divider"></div>
                                    <div className="fo-stat-box">
                                        <div className="fo-stat-val" style={{ color: '#FFF' }}>{history.length}</div>
                                        <div className="fo-stat-lbl">Observations Today</div>
                                    </div>
                                    <div className="fo-stat-divider"></div>
                                    <div className="fo-stat-box">
                                        <div className="fo-stat-val" style={{ color: '#F97316' }}>
                                            {history.filter(h => h.status === 'Submitted').length}
                                        </div>
                                        <div className="fo-stat-lbl">Pending Reviews</div>
                                    </div>
                                </div>
                            </div>
                            <button className="fo-generate-btn" onClick={() => setShowReportModal(true)}>
                                <FileText size={16} /> Generate Report
                            </button>
                        </div>

                        {/* Section 2 — Map + Zone List */}
                        <div className="fo-two-col-layout" style={{ marginBottom: 16 }}>
                            <div className={`fo-card fo-map-card ${isMapMaximized ? 'maximized' : ''}`}>
                                <div className="fo-card-header">
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 16, color: '#FFF' }}>Assigned Zones</h3>
                                        <div style={{ fontSize: 13, color: '#666' }}>{assignedZones.length} zones under monitoring</div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setIsMapMaximized(!isMapMaximized);
                                            setTimeout(() => {
                                                if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
                                            }, 300);
                                        }} 
                                        style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}
                                    >
                                        {isMapMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                    </button>
                                </div>
                                <div style={{ flex: 1, minHeight: 320, width: '100%', position: 'relative', isolation: 'isolate', zIndex: 0 }} ref={mapRef}></div>
                            </div>

                            <div className="fo-card fo-zones-card">
                                <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#FFF' }}>My Zones</h3>
                                <div className="fo-zone-list">
                                    {assignedZones.map(z => {
                                        const color = RISK_COLOR_MAP[z.risk_level] || '#F59E0B';
                                        return (
                                            <div
                                                key={z.zone_id}
                                                className={`fo-zone-row ${selectedZone === z.zone_name ? 'active' : ''}`}
                                                onClick={() => setSelectedZone(z.zone_name)}
                                            >
                                                <div className="fo-zone-row-top">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, color: '#FFF', fontSize: 14 }}>{z.zone_name}</div>
                                                            <div style={{ fontSize: 11, color: '#666' }}>{z.province}</div>
                                                        </div>
                                                    </div>
                                                    <RiskPill risk={z.risk_level} color={color} />
                                                </div>
                                                <div style={{ paddingLeft: 18, marginTop: 4, fontFamily: 'Space Mono', fontSize: 10, color: '#666' }}>
                                                    Confidence: {Math.round(z.confidence * 100)}%
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <button
                                    className={`fo-view-btn ${!selectedZone ? 'disabled' : ''}`}
                                    onClick={() => selectedZone && navigate(`/zone/${selectedZone}`)}
                                    disabled={!selectedZone}
                                >
                                    View Zone Details &rarr;
                                </button>
                            </div>
                        </div>

                        {/* Section 3 — Submit Observation */}
                        <div className="fo-card" id="submit-section" style={{ marginBottom: 16 }}>
                            <div className="fo-card-header" style={{ padding: '0 0 16px', borderBottom: '1px solid #1A1A1A' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 20, color: '#FFF' }}>Submit Field Observation</h3>
                                    <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Report ground-level findings to supplement AI detection data</div>
                                </div>
                                <div className="fo-live-form-pill">
                                    <div className="live-dot" style={{ background: '#22C55E' }}></div> LIVE FORM
                                </div>
                            </div>

                            <div className="fo-form-grid">
                                <div className="fo-form-group">
                                    <label className="fo-muted-caps">Zone <span style={{ color: '#EF4444' }}>*</span></label>
                                    <select
                                        className={`fo-input ${errors.zone ? 'error' : ''}`}
                                        value={formZone} onChange={e => { setFormZone(e.target.value); setErrors({ ...errors, zone: false }); }}
                                    >
                                        <option value="" disabled>Select assigned zone...</option>
                                        {assignedZones.map(z => (
                                            <option key={z.zone_id} value={z.zone_name}>{z.zone_name}</option>
                                        ))}
                                    </select>
                                    {errors.zone && <div className="fo-error-text">This field is required</div>}
                                </div>
                                <div className="fo-form-group">
                                    <label className="fo-muted-caps">Type</label>
                                    <select className="fo-input" value={formType} onChange={e => setFormType(e.target.value)}>
                                        <option value="Locust Activity">Locust Activity</option>
                                        <option value="Animal Herd">Animal Herd</option>
                                        <option value="Unusual Movement">Unusual Movement</option>
                                        <option value="No Activity">No Activity</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="fo-form-group full-width">
                                    <label className="fo-muted-caps">Observation Details <span style={{ color: '#EF4444' }}>*</span></label>
                                    <textarea
                                        className={`fo-input ${errors.desc ? 'error' : ''}`}
                                        placeholder="Describe what you observed — movement direction, approximate scale, affected area..."
                                        style={{ height: 120, resize: 'vertical' }}
                                        value={formDesc} onChange={e => { setFormDesc(e.target.value); setErrors({ ...errors, desc: false }); }}
                                    />
                                    {errors.desc && <div className="fo-error-text">This field is required</div>}
                                </div>

                                <div className="fo-form-group">
                                    <label className="fo-muted-caps" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>GPS Coordinates</span>
                                        <button className="fo-autofill-btn" onClick={handleAutoFillGPS}><MapPin size={12} /> Auto-fill</button>
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                        <input type="text" className="fo-input" placeholder="Lat" value={formLat} onChange={e => setFormLat(e.target.value)} style={{ flex: '1 1 120px', fontFamily: 'Space Mono' }} />
                                        <input type="text" className="fo-input" placeholder="Long" value={formLng} onChange={e => setFormLng(e.target.value)} style={{ flex: '1 1 120px', fontFamily: 'Space Mono' }} />
                                    </div>
                                </div>
                                <div className="fo-form-group">
                                    <label className="fo-muted-caps">Severity</label>
                                    <div className="fo-severity-pill-group">
                                        {[
                                            { lbl: 'LOW',      val: 'LOW',      col: '#22C55E' },
                                            { lbl: 'MEDIUM',   val: 'MEDIUM',   col: '#F59E0B' },
                                            { lbl: 'HIGH',     val: 'HIGH',     col: '#F97316' },
                                            { lbl: 'CRITICAL', val: 'CRITICAL', col: '#EF4444' }
                                        ].map(s => (
                                            <button
                                                key={s.val}
                                                className={`fo-severity-btn ${formSeverity === s.val ? 'active' : ''}`}
                                                style={{ '--c': s.col, '--bg': formSeverity === s.val ? s.col : 'transparent' }}
                                                onClick={() => setFormSeverity(s.val)}
                                            >
                                                {s.lbl}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="fo-form-group">
                                    <label className="fo-muted-caps">Attach Photo Evidence</label>
                                    <div className="fo-upload-area">
                                        {!formFile ? (
                                            <>
                                                <Camera size={24} color="#555" style={{ marginBottom: 8 }} />
                                                <div style={{ fontSize: 13, color: '#888' }}>Click to upload or drag &amp; drop</div>
                                                <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>JPG, PNG up to 10MB</div>
                                                <input type="file" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={handleFileChange} />
                                            </>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ background: '#16A34A22', color: '#22C55E', padding: 6, borderRadius: 4 }}><Check size={16} /></div>
                                                    <div style={{ textAlign: 'left' }}>
                                                        <div style={{ fontSize: 13, color: '#FFF' }}>{formFile.name}</div>
                                                        <div style={{ fontSize: 11, color: '#666' }}>{(formFile.size / 1024 / 1024).toFixed(2)} MB</div>
                                                    </div>
                                                </div>
                                                <button style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }} onClick={() => setFormFile(null)}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="fo-form-group">
                                    <label className="fo-muted-caps">Estimated Scale</label>
                                    <select className="fo-input" value={formScale} onChange={e => setFormScale(e.target.value)} style={{ marginBottom: 16 }}>
                                        <option value="Small (< 1 sq km)">Small (&lt; 1 sq km)</option>
                                        <option value="Medium (1-10 sq km)">Medium (1-10 sq km)</option>
                                        <option value="Large (10-100 sq km)">Large (10-100 sq km)</option>
                                        <option value="Massive (> 100 sq km)">Massive (&gt; 100 sq km)</option>
                                    </select>
                                    <label className="fo-muted-caps">Additional Notes</label>
                                    <textarea className="fo-input" style={{ height: 80, resize: 'vertical' }} value={formNotes} onChange={e => setFormNotes(e.target.value)} />
                                </div>
                            </div>

                            <button className="fo-submit-btn" disabled={submitting} onClick={handleSubmitObservation} style={{ marginTop: 24 }}>
                                {submitting ? <div className="spinner black"></div> : 'SUBMIT OBSERVATION →'}
                            </button>
                        </div>

                        {/* Section 4 — Observation History */}
                        <div className="fo-card" id="history-section" style={{ marginBottom: 16 }}>
                            <div className="fo-card-header" style={{ marginBottom: 16 }}>
                                <h3 style={{ margin: 0, fontSize: 20, color: '#FFF' }}>My Observation History</h3>
                                <div style={{ fontSize: 13, color: '#666' }}>{history.length} submissions</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {history.map(h => (
                                    <div
                                        key={h.id}
                                        className={`fo-history-card ${expandedCard === h.id ? 'expanded' : ''}`}
                                        onClick={() => setExpandedCard(expandedCard === h.id ? null : h.id)}
                                    >
                                        <div className="fo-history-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span className="mono" style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700 }}>{h.id}</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[h.status] || '#666'}1A`, color: STATUS_COLORS[h.status] || '#666', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' }}>
                                                    {h.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div>
                                                    <span style={{ fontWeight: 700, color: '#FFF', marginRight: 8, fontSize: 14 }}>{h.zone}</span>
                                                    <span style={{ fontSize: 12, color: '#888' }}>{h.type}</span>
                                                </div>
                                                <span className="mono" style={{ fontSize: 11, color: '#666' }}>{h.time}</span>
                                                <ChevronDown size={16} color="#666" className={`fo-history-chevron ${expandedCard === h.id ? 'rotated' : ''}`} />
                                            </div>
                                        </div>
                                        <div className="fo-history-content">
                                            <div className="fo-history-inner">
                                                <p style={{ margin: '12px 0 16px', fontSize: 13, color: '#AAA', lineHeight: 1.5 }}>
                                                    {h.desc}
                                                    {h.flagged && (
                                                        <span style={{ display: 'block', color: '#EF4444', marginTop: 8, fontWeight: 600, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 4 }}>
                                                            <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> FLAGGED FOR URGENT REVIEW
                                                        </span>
                                                    )}
                                                </p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1E1E1E', paddingTop: 12 }}>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <RiskPill risk={h.severity} color={h.riskColor} />
                                                        <span style={{ background: '#1A1A1A', color: '#999', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{h.scale}</span>
                                                    </div>
                                                    {h.reviewer && (
                                                        <span style={{ fontSize: 11, color: '#555' }}>Reviewed by: <span style={{ color: '#888' }}>{h.reviewer}</span></span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: 40, color: '#666', fontSize: 14 }}>
                                        No observations submitted yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div style={{ height: 60 }}></div>
                </main>
            </div>

            {showReportModal && (
                <FOReportModal
                    onClose={() => setShowReportModal(false)}
                    onShowToast={msg => { setToast(msg); setTimeout(() => setToast(null), 3000); }}
                    assignedZones={assignedZones}
                />
            )}

            {toast && (
                <div className="success-toast" style={{ zIndex: 9999, borderColor: '#22C55E', color: '#22C55E', background: 'rgba(34,197,94,0.1)' }}>
                    {toast}
                </div>
            )}
        </div>
    );
};

export default FieldOfficerDashboard;

