import api from './client';

export const getSuppliers = async (params = {}) => {
  const response = await api.get('/suppliers', { params });
  return response.data;
};

export const getSupplierSummary = async () => {
  const response = await api.get('/suppliers/summary');
  return response.data;
};

export const lookupSuppliers = async (query = '') => {
  const response = await api.get('/suppliers/lookup', { params: { q: query } });
  return response.data;
};

export const getSupplier = async (id) => {
  const response = await api.get(`/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (data) => {
  const response = await api.post('/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id, data) => {
  const response = await api.put(`/suppliers/${id}`, data);
  return response.data;
};

export const deleteSupplier = async (id) => {
  const response = await api.delete(`/suppliers/${id}`);
  return response.data;
};

// Recycle Bin API for Suppliers
export const getTrashedSuppliers = async (params = {}) => {
  const response = await api.get('/suppliers/trash', { params });
  return response.data;
};

export const restoreSupplier = async (id) => {
  const response = await api.post(`/suppliers/${id}/restore`);
  return response.data;
};

export const forceDeleteSupplier = async (id) => {
  const response = await api.delete(`/suppliers/${id}/force`);
  return response.data;
};

export const restoreAllSuppliers = async () => {
  const response = await api.post('/suppliers/trash/restore-all');
  return response.data;
};

export const emptySupplierTrash = async () => {
  const response = await api.delete('/suppliers/trash/empty');
  return response.data;
};

// CSV Export API for Suppliers
export const exportSuppliers = async (payload = {}) => {
  const response = await api.post('/suppliers/export', payload, {
    responseType: 'blob',
  });

  const today = new Date().toISOString().split('T')[0];
  let filename = `suppliers-selected-${payload.all_matching ? 'all' : payload.ids?.length || 0}-${today}.csv`;

  const disposition = response.headers && response.headers['content-disposition'];
  if (disposition && disposition.includes('filename=')) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
