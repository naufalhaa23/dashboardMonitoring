import api from './api';

export const getDevices = () => api.get('/api/devices').then(res => res.data);
export const createDevice = (data) => api.post('/api/devices', data).then(res => res.data);
export const updateDevice = (id, data) => api.put(`/api/devices/${id}`, data).then(res => res.data);
export const deleteDevice = (id) => api.delete(`/api/devices/${id}`).then(res => res.data);
