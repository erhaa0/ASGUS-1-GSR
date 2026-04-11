import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AnalystDashboard from './pages/AnalystDashboard';
import ZoneDetailPage from './pages/ZoneDetailPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ZoneExplorerPage from './pages/ZoneExplorerPage';
import AlertFeedPage from './pages/AlertFeedPage';
import FieldOfficerDashboard from './pages/FieldOfficerDashboard';
import AdminPanel from './pages/AdminPanel';
import SystemHealthPage from './pages/SystemHealthPage';
import SettingsPage from './pages/SettingsPage';
import BackgroundGrid from './components/BackgroundGrid';

export const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('asgus1_user');
        return saved ? JSON.parse(saved) : {
            role: 'analyst',
            name: 'Ahmed Hassan',
            badge: 'AN-1042'
        };
    });

    const updateUser = (userData) => {
        localStorage.setItem('asgus1_user', JSON.stringify(userData));
        setUser(userData);
    };

    return (
        <UserContext.Provider value={{ user, updateUser }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);

function ProtectedRoute({ allowedRoles, children }) {
    const { user } = useUser();
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function App() {
    return (
        <UserProvider>
            <Router>
                <div className="app-main">
                    <BackgroundGrid />

                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/analyst" element={
                            <ProtectedRoute allowedRoles={['analyst']}>
                                <AnalystDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/zone/:zoneName" element={
                            <ProtectedRoute allowedRoles={['analyst', 'field-officer', 'admin']}>
                                <ZoneDetailPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/reports" element={
                            <ProtectedRoute allowedRoles={['analyst', 'admin']}>
                                <ReportsPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/zones" element={
                            <ProtectedRoute allowedRoles={['analyst']}>
                                <ZoneExplorerPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/analytics" element={
                            <ProtectedRoute allowedRoles={['analyst']}>
                                <AnalyticsPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/alerts" element={
                            <ProtectedRoute allowedRoles={['analyst']}>
                                <AlertFeedPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/field-officer" element={
                            <ProtectedRoute allowedRoles={['field-officer']}>
                                <FieldOfficerDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminPanel />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/health" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <SystemHealthPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute allowedRoles={['analyst', 'field-officer', 'admin']}>
                                <SettingsPage />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </div>
            </Router>
        </UserProvider>
    );
}

export default App;
