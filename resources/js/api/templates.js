import api from './client';

export const getTemplates = async (params = {}) => {
  const response = await api.get('/templates', { params });
  return response.data;
};

export const getTemplate = async (id) => {
  const response = await api.get(`/templates/${id}`);
  return response.data;
};

export const createTemplate = async (data) => {
  const isFormData = data instanceof FormData;
  const response = await api.post('/templates', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return response.data;
};

export const updateTemplate = async (id, data) => {
  const isFormData = data instanceof FormData;
  const response = isFormData
    ? await api.post(`/templates/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
    : await api.put(`/templates/${id}`, data);
  return response.data;
};

export const deleteTemplate = async (id) => {
  const response = await api.delete(`/templates/${id}`);
  return response.data;
};

export const duplicateTemplate = async (id) => {
  const response = await api.post(`/templates/${id}/duplicate`);
  return response.data;
};

export const setDefaultTemplate = async (id) => {
  const response = await api.post(`/templates/${id}/set-default`);
  return response.data;
};
