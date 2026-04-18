import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../App';
import TopoAnimation from '../components/TopoAnimation';
import './LoginPage.css';
import { loginUser } from '../api/api';

const LoginPage = () => {
    const navigate = useNavigate();
    const { updateUser } = useUser();
    const [selectedRole, setSelectedRole] = useState('analyst');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [dateTime, setDateTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDateTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulate authentication delay
        try {
            const data = await loginUser(email, password);
            updateUser({
                token:   data.access_token,
                role:    data.role,
                name:    data.name,
                badge:   data.badge,
                user_id: data.user_id,
            });
            if (data.role === 'admin') navigate('/admin');
            else if (data.role === 'field-officer') navigate('/field-officer');
            else navigate('/analyst');
        } catch (err) {
            setError(err.message || 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        const y = date.getFullYear();
        const h = date.getHours().toString().padStart(2, '0');
        const min = date.getMinutes().toString().padStart(2, '0');
        const s = date.getSeconds().toString().padStart(2, '0');
        return `${d} ${m} ${y} | ${h}:${min}:${s}`;
    };

    return (
        <div className="app-container">
            {/* Top Bar */}
            <header className="top-bar">
                <div className="top-bar-left">
                    <svg className="gov-emblem" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="gov-text">Government of Pakistan — Ministry of National Food Security</span>
                </div>
                <div className="top-bar-center">AUTHORIZED ACCESS ONLY</div>
                <div className="top-bar-right mono">{formatDate(dateTime)}</div>
            </header>

            <main className="split-layout">
                {/* Left Section: Map */}
                <section className="map-section">
                    <TopoAnimation />

                    {/* Top-left corner overlay */}
                    <div className="topo-overlay top-left">
                        <div className="topo-badge">A</div>
                        <span className="topo-title">ASGUS-1 GSR SENTINEL</span>
                    </div>

                    {/* Bottom-left corner overlay */}
                    <div className="topo-overlay bottom-left">
                        <div className="topo-line-decor"></div>
                        <div className="topo-status">TERRAIN MOVEMENT DETECTION</div>
                        <div className="topo-substatus">BALOCHISTAN · KPK · PAKISTAN</div>
                    </div>
                </section>

                {/* Right Section: Login Form */}
                <section className="login-section">
                    <div className="login-content">
                        <div className="brand-header">
                            <svg width="48" height="48" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 16 }}>
                                <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
                                <line x1="3" y1="14" x2="25" y2="14" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                                <line x1="14" y1="2" x2="14" y2="26" stroke="#F59E0B" strokeWidth="1" opacity="0.9" />
                                <circle cx="14" cy="14" r="2.5" fill="#F59E0B" />
                                <circle cx="14" cy="14" r="6" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" fill="none" />
                            </svg>
                            <h1 className="logo-text">ASGUS-1 GSR</h1>
                            <p className="subtitle">Intelligent Terrain Movement Detection System</p>
                        </div>

                        <div className="divider"></div>

                        <form className="login-form" onSubmit={handleLogin}>
                            <div className="input-group">
                                <label className="stat-label" style={{ marginBottom: 12, display: 'block', fontSize: '10px', color: '#555', fontWeight: '600', letterSpacing: '0.1em' }}>SELECT ACCESS ROLE</label>
                                <div className="role-selector">
                                    {[
                                        { id: 'analyst', label: 'Analyst' },
                                        { id: 'field-officer', label: 'Field Officer' },
                                        { id: 'admin', label: 'Admin' }
                                    ].map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            className={`role-btn ${selectedRole === r.id ? 'active' : ''}`}
                                            onClick={() => setSelectedRole(r.id)}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="input-field">
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-field">
                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-visibility"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? 'HIDE' : 'SHOW'}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="login-error" style={{ color: '#EF4444', fontSize: '11px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" className="submit-btn" disabled={isLoading}>
                                {isLoading ? <div className="spinner"></div> : 'LOGIN →'}
                            </button>
                        </form>

                        <footer className="security-footer">
                            <span className="mono">Version 1.0.0</span>
                            <span className="divider-dot">•</span>
                            <span className="mono">Secure Connection</span>
                            <div className="status-dot"></div>
                        </footer>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default LoginPage;
