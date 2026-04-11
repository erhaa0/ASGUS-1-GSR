import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import './LandingPage.css';

// ─── Three.js Terrain Canvas ─────────────────────────────────────────────────
function TerrainCanvas({ canvasRef }) {
    const mountRef = useRef(null);

    useEffect(() => {
        const el = mountRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const h = el.clientHeight;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x080808, 0.015);

        const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
        camera.position.set(0, 18, 35);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x080808, 1);
        el.appendChild(renderer.domElement);

        const geo = new THREE.PlaneGeometry(80, 80, 80, 80);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const y =
                Math.sin(x * 0.15) * Math.cos(z * 0.15) * 4 +
                Math.sin(x * 0.3 + 1.2) * Math.cos(z * 0.25) * 2.5 +
                Math.sin(x * 0.6 + 0.5) * Math.cos(z * 0.5 + 0.8) * 1.2 +
                Math.sin(x * 1.1) * Math.cos(z * 0.9) * 0.6;
            pos.setY(i, y);
        }
        geo.computeVertexNormals();

        const wireMat = new THREE.MeshBasicMaterial({ color: 0xF59E0B, wireframe: true, opacity: 0.18, transparent: true });
        const solidMat = new THREE.MeshLambertMaterial({ color: 0x0D0D0D, side: THREE.DoubleSide });
        scene.add(new THREE.Mesh(geo, solidMat));
        scene.add(new THREE.Mesh(geo, wireMat));

        scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const dirLight = new THREE.DirectionalLight(0xF59E0B, 0.8);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        let frameId;
        let t = 0;
        const animate = () => {
            frameId = requestAnimationFrame(animate);
            t += 0.003;
            camera.position.x = Math.sin(t * 0.3) * 8;
            camera.position.z = 35 + Math.sin(t * 0.15) * 5;
            camera.lookAt(0, 2, 0);
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            const nw = el.clientWidth;
            const nh = el.clientHeight;
            if (!nw || !nh) return;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', handleResize);
            wireMat.dispose();
            solidMat.dispose();
            geo.dispose();
            renderer.dispose();
            if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={(node) => { mountRef.current = node; if (canvasRef) canvasRef.current = node; }} className="lp-hero-canvas" />;
}

// ─── Text Decrypt Effect ─────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';
function useDecryptText(ref, finalText, shouldRun) {
    useEffect(() => {
        if (!shouldRun || !ref.current) return;
        const el = ref.current;
        let iteration = 0;
        const interval = setInterval(() => {
            el.innerText = finalText
                .split('')
                .map((char, i) => {
                    if (i < iteration) return char;
                    if (char === ' ') return ' ';
                    return CHARS[Math.floor(Math.random() * CHARS.length)];
                })
                .join('');
            iteration += finalText.length / (1200 / 50);
            if (iteration >= finalText.length) {
                el.innerText = finalText;
                clearInterval(interval);
            }
        }, 50);
        return () => clearInterval(interval);
    }, [shouldRun, finalText, ref]);
}

// ─── Terrain Feed Canvas ───────────────────────────────────────────────────
function TerrainFeedCanvas() {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const startTimeRef = useRef(Date.now());

    // Blip data with ultra-slow velocities
    const blips = useRef([
        { id: 1, label: 'CRITICAL', color: '#EF4444', x: 0.35, y: 0.45, vx: 0.00004, vy: -0.00002 },
        { id: 2, label: 'HIGH', color: '#F97316', x: 0.75, y: 0.65, vx: -0.00003, vy: -0.00002 },
        { id: 3, label: 'MONITORING', color: '#F59E0B', x: 0.55, y: 0.25, vx: 0.00005, vy: 0.00001 }
    ]);

    // Contour line config
    const contourCount = 22;
    const contourOffsets = useRef([...Array(contourCount)].map(() => Math.random() * Math.PI * 2));

    const draw = (ctx, w, h) => {
        const elapsed = Date.now() - startTimeRef.current;

        // 1. Clear background
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, w, h);

        // 2. Dot grid (Static 18px interval)
        ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
        for (let x = 9; x < w; x += 18) {
            for (let y = 9; y < h; y += 18) {
                ctx.beginPath();
                ctx.arc(x, y, 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 3. Topographic contour lines
        ctx.lineWidth = 0.6;
        for (let i = 0; i < contourCount; i++) {
            const baseY = (h / contourCount) * i + (h / contourCount) / 2;
            const isBrighter = i % 5 === 0;
            ctx.strokeStyle = isBrighter ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.12)';

            ctx.beginPath();
            for (let x = 0; x < w; x += 5) {
                const animOffset = elapsed * 0.0002;
                const offset = contourOffsets.current[i] + animOffset;
                // Combinations of sine waves for natural wave profile
                const y = baseY +
                    Math.sin(x * 0.01 + offset) * 12 +
                    Math.sin(x * 0.025 + offset * 0.6) * 6;

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // 4. Scan sweep line (4s cycle, 80px trail)
        const sweepDuration = 4000;
        const sweepProgress = (elapsed % sweepDuration) / sweepDuration;
        const sweepY = h * sweepProgress;

        const gradient = ctx.createLinearGradient(0, sweepY - 80, 0, sweepY);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0.08)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, sweepY - 80, w, 80);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, sweepY);
        ctx.lineTo(w, sweepY);
        ctx.stroke();

        // 5. Radar Targets
        blips.current.forEach(blip => {
            // Update position
            blip.x = (blip.x + blip.vx) % 1;
            if (blip.x < 0) blip.x += 1;
            blip.y = (blip.y + blip.vy) % 1;
            if (blip.y < 0) blip.y += 1;

            const bx = blip.x * w;
            const by = blip.y * h;

            // Static inner ring
            ctx.strokeStyle = blip.color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(bx, by, 10, 0, Math.PI * 2);
            ctx.stroke();

            // Pulsing outer ring (2.5s loop, 18-28px)
            const pulseDuration = 2500;
            const pulseProgress = (elapsed % pulseDuration) / pulseDuration;
            const ringRadius = 18 + pulseProgress * 10;

            ctx.globalAlpha = 0.4 * (1 - pulseProgress);
            ctx.beginPath();
            ctx.arc(bx, by, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Center circle (4px)
            ctx.fillStyle = blip.color;
            ctx.beginPath();
            ctx.arc(bx, by, 4, 0, Math.PI * 2);
            ctx.fill();

            // Label text
            ctx.font = '9px "Space Mono"';
            ctx.textAlign = 'center';
            ctx.fillText(blip.label, bx, by + 40);
        });

        // 7. Scanline overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for (let i = 0; i < h; i += 2) {
            ctx.fillRect(0, i, w, 1);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };

        const animate = () => {
            draw(ctx, canvas.width, canvas.height);
            requestRef.current = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(requestRef.current);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
}

// ─── Counter Animation Hook ──────────────────────────────────────────────────
function useCounter(end, decimals = 0, duration = 2000, shouldRun) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!shouldRun) return;
        const start = performance.now();
        const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setValue(parseFloat((eased * end).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [shouldRun, end, decimals, duration]);
    return value;
}

// ─── Main Landing Page ───────────────────────────────────────────────────────
const LandingPage = () => {
    const navigate = useNavigate();
    const [scrollY, setScrollY] = useState(0);
    const [time, setTime] = useState('');
    const [capVisible, setCapVisible] = useState(false);
    const [mapVisible, setMapVisible] = useState(false);
    const [metricsVisible, setMetricsVisible] = useState(false);

    const heroContentRef = useRef(null);
    const heroCanvasRef = useRef(null);
    const headlineRef1 = useRef(null);
    const headlineRef2 = useRef(null);
    const capSectionRef = useRef(null);
    const mapSectionRef = useRef(null);
    const metricsSectionRef = useRef(null);

    // Scanline class on body
    useEffect(() => {
        document.body.classList.add('landing-active');
        return () => document.body.classList.remove('landing-active');
    }, []);

    // Clock
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Karachi' }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Scroll handler — parallax + topbar
    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            setScrollY(y);
            if (heroContentRef.current) heroContentRef.current.style.transform = `translateY(${y * 0.4}px)`;
            if (heroCanvasRef.current) heroCanvasRef.current.style.transform = `translateY(${y * 0.2}px)`;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Intersection Observers
    useEffect(() => {
        const createObs = (ref, setter) => {
            if (!ref.current) return null;
            const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setter(true); obs.disconnect(); } }, { threshold: 0.15 });
            obs.observe(ref.current);
            return obs;
        };
        const o1 = createObs(capSectionRef, setCapVisible);
        const o2 = createObs(mapSectionRef, setMapVisible);
        const o3 = createObs(metricsSectionRef, setMetricsVisible);
        return () => { o1?.disconnect(); o2?.disconnect(); o3?.disconnect(); };
    }, []);

    // Scroll-based animate-on-scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }),
            { threshold: 0.15 }
        );
        document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // Decrypt text
    useDecryptText(headlineRef1, 'Precision Detection.', capVisible);
    useDecryptText(headlineRef2, 'Zero Compromise.', capVisible);

    // Counter values
    const c1 = useCounter(24, 0, 2000, metricsVisible);
    const c2 = useCounter(98.2, 1, 2000, metricsVisible);
    const c3 = useCounter(30, 0, 2000, metricsVisible);
    const c4 = useCounter(3, 0, 2000, metricsVisible);

    const scrollToCapabilities = () => capSectionRef.current?.scrollIntoView({ behavior: 'smooth' });

    return (
        <div className="landing-page">

            {/* ─── FIXED TOPBAR ─── */}
            <nav className={`lp-topbar ${scrollY > 50 ? 'scrolled' : ''}`}>
                <div className="lp-topbar-left">
                    <svg width="120" height="32" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <polygon points="14,2 26,8 26,24 14,30 2,24 2,8" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
                        <line x1="2" y1="16" x2="26" y2="16" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                        <line x1="14" y1="2" x2="14" y2="30" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                        <circle cx="14" cy="16" r="2.5" fill="#F59E0B" />
                        <circle cx="14" cy="16" r="6" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" fill="none" />
                        <text x="36" y="20" fontFamily="Orbitron, sans-serif" fontWeight="700" fontSize="16" fill="#F5F5F5" letterSpacing="1">ASGUS-1</text>
                        <text x="37" y="30" fontFamily="Space Mono, monospace" fontSize="8" fill="#F59E0B" letterSpacing="2">GSR</text>
                    </svg>
                </div>
                <div className="lp-topbar-center">
                    <span className="lp-classified-pill">◆ CLASSIFIED</span>
                </div>
                <div className="lp-topbar-right">
                    <span className="lp-version">v2.4.1</span>
                    <button className="lp-access-btn" onClick={() => navigate('/login')}>REQUEST ACCESS →</button>
                </div>
            </nav>

            {/* ─── HERO SECTION ─── */}
            <section className="lp-hero">
                <TerrainCanvas canvasRef={heroCanvasRef} />

                <div className="lp-hero-content" ref={heroContentRef}>
                    <div className="lp-gov-label">GOVERNMENT OF PAKISTAN — MINISTRY OF NATIONAL FOOD SECURITY</div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                        <svg width="64" height="64" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
                            <line x1="3" y1="14" x2="25" y2="14" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                            <line x1="14" y1="2" x2="14" y2="26" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                            <circle cx="14" cy="14" r="2.5" fill="#F59E0B" />
                            <circle cx="14" cy="14" r="6" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" fill="none" />
                        </svg>
                    </div>
                    <div className="lp-hero-title-line white">ASGUS-1</div>
                    <div className="lp-hero-title-line amber">GSR</div>
                    <div className="lp-hero-subtitle">GROUND SURVEILLANCE RADAR</div>
                    <div className="lp-hero-desc">Intelligent Terrain Movement Detection · Balochistan & KPK</div>

                    <div className="lp-hero-buttons">
                        <button className="lp-btn-primary" onClick={() => navigate('/login')}>ACCESS SYSTEM →</button>
                        <button className="lp-btn-secondary" onClick={scrollToCapabilities}>VIEW DOCUMENTATION</button>
                    </div>
                </div>

                {/* Coordinate strip */}
                <div className="lp-coord-strip">
                    <div className="lp-coord-live">
                        <div className="pulse-dot" />
                        ◆ LIVE MONITORING ACTIVE
                    </div>
                    <div className="lp-coord-center">30.18°N 67.00°E · QUETTA SECTOR</div>
                    <div className="lp-coord-right">{time} PKT UTC+5</div>
                </div>
            </section>

            {/* ─── SECTION 2 — CAPABILITIES ─── */}
            <section className="lp-capabilities" ref={capSectionRef}>
                <div className="lp-section-label animate-on-scroll">01 — SYSTEM CAPABILITIES</div>
                <div className="lp-section-line animate-on-scroll" />
                <div className="lp-headline">
                    <div ref={headlineRef1} className="white" style={{ marginBottom: 4 }}>Precision Detection.</div>
                    <div ref={headlineRef2} className="amber">Zero Compromise.</div>
                </div>

                <div className="lp-cap-grid">
                    {[
                        {
                            accent: '#F59E0B', label: 'AI DETECTION', title: 'Satellite Image Analysis',
                            desc: 'DBSCAN clustering algorithms process multi-temporal satellite image pairs to identify terrain movement signatures with 98.2% accuracy.',
                            chip: '↑ 98.2% CONFIDENCE', chipBg: 'rgba(245,158,11,0.12)', chipBorder: 'rgba(245,158,11,0.3)',
                        },
                        {
                            accent: '#3B82F6', label: 'REAL-TIME SYNC', title: '30-Second Intelligence',
                            desc: 'Continuous polling infrastructure delivers detection alerts to field analysts within 30 seconds of satellite pass completion.',
                            chip: '⟳ 30s INTERVAL', chipBg: 'rgba(59,130,246,0.12)', chipBorder: 'rgba(59,130,246,0.3)',
                        },
                        {
                            accent: '#22C55E', label: 'FIELD INTEGRATION', title: 'Ground Truth Verification',
                            desc: 'Field officers submit geo-tagged observations that supplement AI detections with on-ground intelligence, closing the sensor-to-shooter loop.',
                            chip: '✓ MULTI-ROLE', chipBg: 'rgba(34,197,94,0.12)', chipBorder: 'rgba(34,197,94,0.3)',
                        },
                    ].map((c, i) => (
                        <div key={i} className={`lp-cap-card animate-on-scroll stagger-${i + 1}`} style={{ borderTopColor: c.accent }}>
                            <div className="lp-cap-label" style={{ color: c.accent }}>{c.label}</div>
                            <div className="lp-cap-title">{c.title}</div>
                            <div className="lp-cap-desc">{c.desc}</div>
                            <span className="lp-cap-chip" style={{ background: c.chipBg, color: c.accent, border: `1px solid ${c.chipBorder}` }}>{c.chip}</span>
                        </div>
                    ))}
                </div>
            </section >

            {/* ─── SECTION 3 — COVERAGE MAP ─── */}
            < section className="lp-coverage" ref={mapSectionRef} >
                <div className="lp-coverage-bg">
                    <TerrainFeedCanvas />
                </div>
                <div className="lp-coverage-overlay" style={{ background: 'linear-gradient(to right, #080808 0%, #080808 15%, rgba(8,8,8,0.85) 35%, rgba(8,8,8,0.4) 55%, transparent 75%)' }} />

                <div className="lp-coverage-left">
                    <div className="lp-section-label animate-on-scroll">02 — COVERAGE AREA</div>
                    <div className="lp-section-line animate-on-scroll" />
                    <h2 className="lp-headline animate-on-scroll">
                        <span className="white">Balochistan & KPK</span><span className="amber">.</span>
                    </h2>
                    <p className="lp-coverage-desc animate-on-scroll">
                        ASGUS-1 GSR provides continuous terrain movement monitoring across 24 designated zones spanning the Balochistan and Khyber Pakhtunkhwa provinces of Pakistan. Coverage extends from the Afghan border to the Punjab plains.
                    </p>
                    <div className="lp-stat-row animate-on-scroll">
                        <div>
                            <div className="lp-stat-value">24</div>
                            <div className="lp-stat-label-sm">ACTIVE ZONES</div>
                        </div>
                        <div>
                            <div className="lp-stat-value">847,000 km²</div>
                            <div className="lp-stat-label-sm">COVERAGE AREA</div>
                        </div>
                    </div>
                    <button className="lp-btn-secondary animate-on-scroll" onClick={() => navigate('/login')}>ENTER SYSTEM →</button>
                </div>
            </section >

            {/* ─── SECTION 4 — METRICS ─── */}
            < section className="lp-metrics" ref={metricsSectionRef} >
                <div className="lp-section-label animate-on-scroll">03 — SYSTEM PERFORMANCE</div>
                <div className="lp-section-line animate-on-scroll" />
                <div className="lp-metrics-grid">
                    {[
                        { value: c1, suffix: ' ZONES', label: 'Active Monitoring Zones' },
                        { value: c2, suffix: '%', label: 'AI Detection Accuracy' },
                        { value: c3, suffix: 's', label: 'Sync Interval' },
                        { value: c4, suffix: ' ROLES', label: 'Access Levels' },
                    ].map((m, i) => (
                        <div key={i} className="lp-metric-block animate-on-scroll">
                            <span className="lp-metric-number">{m.value}</span>
                            <span className="lp-metric-suffix">{m.suffix}</span>
                            <div className="lp-metric-label">{m.label}</div>
                        </div>
                    ))}
                </div>
            </section >

            {/* ─── SECTION 5 — ROLES ─── */}
            < section className="lp-roles" >
                <div className="lp-section-label animate-on-scroll">04 — ACCESS PROTOCOL</div>
                <div className="lp-section-line animate-on-scroll" />
                <h2 className="lp-headline animate-on-scroll">
                    <span className="white">Three Clearance Levels</span><span className="amber">.</span>
                </h2>

                <div className="lp-roles-grid">
                    {[
                        {
                            accent: '#F59E0B', badge: 'LEVEL 2', title: 'INTELLIGENCE ANALYST',
                            desc: 'Full dashboard access. Terrain map, alert feed, zone explorer, analytics, and report generation across all monitored zones.',
                            features: ['Map Dashboard', 'Alert Feed', 'Analytics', 'Zone Explorer', 'Reports'],
                            clearance: 'AMBER CLEARANCE',
                        },
                        {
                            accent: '#22C55E', badge: 'LEVEL 1', title: 'FIELD OFFICER',
                            desc: 'Restricted to assigned zones only. Submit and review ground observations that supplement satellite AI detections.',
                            features: ['Zone Observations', 'GPS Reporting', 'Assigned Zones'],
                            clearance: 'GREEN CLEARANCE',
                        },
                        {
                            accent: '#3B82F6', badge: 'LEVEL 3', title: 'SYSTEM ADMIN',
                            desc: 'Full system access including user management, AI job triggering, risk parameter configuration, and system health monitoring.',
                            features: ['User Management', 'System Health', 'AI Config', 'Risk Parameters', 'Activity Logs', 'All Dashboards'],
                            clearance: 'BLUE CLEARANCE',
                        },
                    ].map((r, i) => (
                        <div key={i} className={`lp-role-card animate-on-scroll stagger-${i + 1}`} style={{ borderTopColor: r.accent }}>
                            <span className="lp-role-badge" style={{ background: `${r.accent}1A`, color: r.accent, border: `1px solid ${r.accent}4D` }}>{r.badge}</span>
                            <div className="lp-role-icon">
                                {[0, 1, 2, 3].map(j => <div key={j} className="lp-role-icon-sq" style={{ background: j < 2 ? r.accent : `${r.accent}33` }} />)}
                            </div>
                            <div className="lp-role-title">{r.title}</div>
                            <div className="lp-role-desc">{r.desc}</div>
                            <div className="lp-role-features">
                                {r.features.map(f => <div key={f} className="lp-role-feature"><span className="check" style={{ color: r.accent }}>✓</span> {f}</div>)}
                            </div>
                            <div className="lp-role-clearance" style={{ color: r.accent }}>{r.clearance}</div>
                        </div>
                    ))}
                </div>
            </section >

            {/* ─── SECTION 5 — USE CASES ─── */}
            < section className="lp-tech" >
                <div className="lp-section-label animate-on-scroll">05 — OPERATIONAL USE</div>
                <div className="lp-section-line animate-on-scroll" />
                <h2 className="lp-headline animate-on-scroll">
                    <span className="white">Government-Grade</span> <span className="amber">Agricultural Defense.</span>
                </h2>

                <div className="lp-tech-grid" style={{ marginTop: 48 }}>
                    {[
                        {
                            category: 'AI DETECTION', title: 'Locust Swarm Detection',
                            desc: 'DBSCAN clustering on multi-temporal satellite image pairs identifies swarm formation signatures across agricultural zones with sub-30 second latency.',
                            tags: ['DBSCAN', '98.2% ACCURACY']
                        },
                        {
                            category: 'FIELD OPERATIONS', title: 'Ground Truth Verification',
                            desc: 'Field officers submit geo-tagged photo observations that cross-validate AI detections, closing the intelligence loop from satellite to boots on ground.',
                            tags: ['GPS TAGGED', 'MULTI-ROLE']
                        },
                        {
                            category: 'COMMAND INTEGRATION', title: 'Provincial Response Centers',
                            desc: 'Detection alerts are routed directly to Balochistan and KPK provincial command centers enabling coordinated agricultural emergency response within minutes.',
                            tags: ['BALOCHISTAN', 'KPK']
                        },
                        {
                            category: 'REPORTING', title: 'Automated Report Generation',
                            desc: 'Risk analysis, movement summaries and full zone reports are generated on-demand and exported as PDF documents for ministry briefings and field deployment orders.',
                            tags: ['PDF EXPORT', 'AUDIT TRAIL']
                        },
                        {
                            category: 'ACCESS CONTROL', title: 'Multi-Role Secure Access',
                            desc: 'Three-tier RBAC system enforces separation of duties between Intelligence Analysts, Field Officers, and System Administrators with JWT-authenticated sessions.',
                            tags: ['JWT AUTH', 'RBAC']
                        },
                        {
                            category: 'COMPLIANCE', title: 'Audit & Compliance Logging',
                            desc: 'Every user action, detection job, report export and parameter change is logged with timestamp and user ID to maintain a complete immutable audit trail.',
                            tags: ['IMMUTABLE LOG', 'DR-06']
                        },
                    ].map((u, i) => (
                        <div key={i} className={`lp-tech-card animate-on-scroll stagger-${(i % 3) + 1}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ fontFamily: 'Share Tech Mono', fontSize: '10px', color: '#F59E0B', letterSpacing: '0.1em' }}>{u.category}</div>
                            <div className="lp-tech-name" style={{ fontSize: '15px' }}>{u.title}</div>
                            <div className="lp-tech-desc" style={{ marginBottom: 8 }}>{u.desc}</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
                                {u.tags.map(tag => (
                                    <span key={tag} style={{
                                        fontFamily: 'Share Tech Mono',
                                        fontSize: '9px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        color: '#F59E0B',
                                        border: '1px solid rgba(245, 158, 11, 0.2)',
                                        borderRadius: '3px',
                                        padding: '2px 7px',
                                        display: 'inline-flex'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section >

            {/* ─── FOOTER ─── */}
            < footer className="lp-footer" >
                <div className="lp-footer-left">
                    <svg width="160" height="40" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="14,2 26,8 26,24 14,30 2,24 2,8" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
                        <line x1="2" y1="16" x2="26" y2="16" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                        <line x1="14" y1="2" x2="14" y2="30" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                        <circle cx="14" cy="16" r="2.5" fill="#F59E0B" />
                        <circle cx="14" cy="16" r="6" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" fill="none" />
                        <text x="36" y="20" fontFamily="Orbitron, sans-serif" fontWeight="700" fontSize="16" fill="#F5F5F5" letterSpacing="1">ASGUS-1</text>
                        <text x="37" y="30" fontFamily="Space Mono, monospace" fontSize="8" fill="#F59E0B" letterSpacing="2">GSR</text>
                    </svg>
                </div>
                <div className="lp-footer-center">
                    <div className="lp-footer-gov">GOVERNMENT OF PAKISTAN · MINISTRY OF NATIONAL FOOD SECURITY</div>
                    <div className="lp-footer-class">FOR AUTHORIZED PERSONNEL ONLY · CLASSIFICATION: RESTRICTED</div>
                </div>
                <div className="lp-footer-right">
                    v2.4.1 · © 2026 · Bahria University Project
                </div>
            </footer >
        </div >
    );
};

export default LandingPage;
