import api from './api';

export const getAlerts = () => api.get('/api/alerts').then(res => res.data);
export const markAlertAsRead = (id) => api.put(`/api/alerts/${id}/read`).then(res => res.data);
export const markAllAlertsAsRead = () => api.put('/api/alerts/read-all').then(res => res.data);
