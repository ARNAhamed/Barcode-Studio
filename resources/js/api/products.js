import api from './client';

export const getProducts = async (params = {}) => {
  const response = await api.get('/products', { params });
  return response.data;
};

export const getProductSummary = async () => {
  const response = await api.get('/products/summary');
  return response.data;
};

export const lookupProducts = async (query = '') => {
  const response = await api.get('/products/lookup', { params: { q: query } });
  return response.data;
};

export const getProduct = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await api.post('/products', data);
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await api.put(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

// Recycle Bin API
export const getTrashedProducts = async (params = {}) => {
  const response = await api.get('/products/trash', { params });
  return response.data;
};

export const restoreProduct = async (id) => {
  const response = await api.post(`/products/${id}/restore`);
  return response.data;
};

export const forceDeleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}/force`);
  return response.data;
};

export const restoreAllProducts = async () => {
  const response = await api.post('/products/trash/restore-all');
  return response.data;
};

export const emptyProductTrash = async () => {
  const response = await api.delete('/products/trash/empty');
  return response.data;
};
