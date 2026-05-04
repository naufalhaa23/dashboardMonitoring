import api from './api';

export const getTariffs = () => api.get('/api/tariffs').then(res => res.data);
export const updateTariff = (id, data) => api.put(`/api/tariffs/${id}`, data).then(res => res.data);
