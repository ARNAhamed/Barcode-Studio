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

export const bulkGenerateBarcodes = async (data = {}) => {
  const response = await api.post('/products/bulk-generate-barcodes', data);
  return response.data;
};

// CSV Export & Import API
export const exportProducts = async (payload = {}) => {
  const response = await api.post('/products/export', payload, {
    responseType: 'blob',
  });

  const today = new Date().toISOString().split('T')[0];
  let filename = `products-selected-${payload.all_matching ? 'all' : payload.ids?.length || 0}-${today}.csv`;

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

export const downloadImportTemplate = async () => {
  const response = await api.get('/products/import/template', {
    responseType: 'blob',
  });
  const filename = 'products_import_template.csv';
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

export const previewProductImport = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/products/import/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const commitProductImport = async ({
  file,
  mode = 'update_existing',
  autoGenerateBarcodes = false,
  createMissingSuppliers = false,
}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  formData.append('auto_generate_barcodes', autoGenerateBarcodes ? '1' : '0');
  formData.append('create_missing_suppliers', createMissingSuppliers ? '1' : '0');
  const response = await api.post('/products/import/commit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

