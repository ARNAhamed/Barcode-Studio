import api from './client';

export const generateBarcodeNumber = async (format = 'CODE128') => {
  const response = await api.post('/barcodes/generate', { format });
  return response.data;
};

export const validateBarcodeNumber = async (format, number) => {
  const response = await api.post('/barcodes/validate', { format, number });
  return response.data;
};
