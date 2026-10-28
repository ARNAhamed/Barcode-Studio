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

export const bulkCreateCodes = async (payload) => {
  const isFormData = payload instanceof FormData;
  const response = await api.post('/codes/bulk', payload, {
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

export const getTrashedCodes = async (params = {}) => {
  const response = await api.get('/codes/trash', { params });
  return response.data;
};

export const restoreCode = async (id) => {
  const response = await api.post(`/codes/${id}/restore`);
  return response.data;
};

export const forceDeleteCode = async (id) => {
  const response = await api.delete(`/codes/${id}/force`);
  return response.data;
};

export const restoreAllCodes = async () => {
  const response = await api.post('/codes/trash/restore-all');
  return response.data;
};

export const emptyCodesTrash = async () => {
  const response = await api.delete('/codes/trash/empty');
  return response.data;
};
