const BASE_URL = 'http://localhost:8000';

const getToken = () => {
    const user = localStorage.getItem('asgus1_user');
    if (!user) return null;
    return JSON.parse(user).token;
};

export const apiFetch = async (endpoint, options = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });
    if (response.status === 401) {
        localStorage.removeItem('asgus1_user');
        window.location.href = '/login';
        return;
    }
    return response.json();
};

export const loginUser = async (email, password) => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Login failed');
    }
    return response.json();
};

export const fetchZones = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/zones${query ? '?' + query : ''}`);
};

export const fetchZone = (zoneId) =>
    apiFetch(`/api/zones/${zoneId}`);

export const fetchDetections = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/detections${query ? '?' + query : ''}`);
};

export const updateDetectionStatus = (eventId, status) =>
    apiFetch(`/api/detections/${eventId}`, {
        method: 'PATCH',
        body:   JSON.stringify({ status }),
    });

export const bulkUpdateDetections = (eventIds, status) =>
    apiFetch('/api/detections/bulk', {
        method: 'POST',
        body:   JSON.stringify({ event_ids: eventIds, status }),
    });

export const triggerDetection = (zoneId) =>
    apiFetch('/api/detections/trigger', {
        method: 'POST',
        body:   JSON.stringify({
            zone_id:     zoneId,
            sightings:   [],
            eps:         0.5,
            min_samples: 2
        }),
    });

export const submitObservation = (data) =>
    apiFetch('/api/observations', {
        method: 'POST',
        body:   JSON.stringify(data),
    });

export const fetchObservations = (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/observations${query ? '?' + query : ''}`);
};

export const fetchReports = () =>
    apiFetch('/api/reports');

export const downloadReport = async (zoneId) => {
    const token = getToken();
    const response = await fetch(
        `${BASE_URL}/api/reports/${zoneId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('Report generation failed');
    const blob = await response.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `zone_${zoneId}_report.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
};

export const fetchAnalytics = (range = '7d') =>
    apiFetch(`/api/analytics?range=${range}`);

export const fetchHeatmap = () =>
    apiFetch('/api/analytics/heatmap');

export const fetchUsers = () =>
    apiFetch('/api/users');

export const registerUser = (data) =>
    apiFetch('/api/auth/register', {
        method: 'POST',
        body:   JSON.stringify(data),
    });

export const updateUser = (userId, data) =>
    apiFetch(`/api/users/${userId}`, {
        method: 'PUT',
        body:   JSON.stringify(data),
    });

export const toggleUserStatus = (userId) =>
    apiFetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
    });

export const changePassword = (userId, data) =>
    apiFetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        body:   JSON.stringify(data),
    });

export const fetchLogs = (limit = 30) =>
    apiFetch(`/api/logs?limit=${limit}`);

export const fetchHealth = () =>
    apiFetch('/api/health');

export const fetchIncidents = () =>
    apiFetch('/api/health/incidents');

export const fetchResources = () =>
    apiFetch('/api/health/resources');

export const updateRiskParams = (zoneId, data) =>
    apiFetch(`/api/risk-params/${zoneId}`, {
        method: 'PATCH',
        body:   JSON.stringify(data),
    });

export const fetchFieldOfficers = () =>
    apiFetch('/api/users/field-officers');

export const uploadObservationPhoto = async (observationId, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/api/observations/${observationId}/photo`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
    });
    if (!response.ok) throw new Error('Photo upload failed');
    return response.json();
};

export const fetchPreferences = (userId) =>
    apiFetch(`/api/users/${userId}/preferences`);

export const updatePreferences = (userId, preferencesJson) =>
    apiFetch(`/api/users/${userId}/preferences`, {
        method: 'PUT',
        body:   JSON.stringify({ preferences: preferencesJson }),
    });
   