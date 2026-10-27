import api from './client';

export const getPrintPresets = async () => {
  const response = await api.get('/print-presets');
  return response.data;
};

export const createPrintPreset = async (data) => {
  const response = await api.post('/print-presets', data);
  return response.data;
};

export const deletePrintPreset = async (id) => {
  const response = await api.delete(`/print-presets/${id}`);
  return response.data;
};
