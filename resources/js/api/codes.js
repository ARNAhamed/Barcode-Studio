import api from './client';

export const getCodes = async (params = {}) => {
  const response = await api.get('/codes', { params });
  return response.data;
};

export const getCode = async (id) => {
  const response = await api.get(`/codes/${id}`);
  return response.data;
};

export const createCode = async (data) => {
  const isFormData = data instanceof FormData;
  const response = await api.post('/codes', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return response.data;
};

export const updateCode = async (id, data) => {
  const isFormData = data instanceof FormData;
  // If FormData, post to /codes/{id} (or use PUT with json)
  const response = isFormData
    ? await api.post(`/codes/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
    : await api.put(`/codes/${id}`, data);
  return response.data;
};

export const deleteCode = async (id) => {
  const response = await api.delete(`/codes/${id}`);
  return response.data;
};
