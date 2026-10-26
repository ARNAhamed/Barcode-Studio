import api from './client';

export const getBinSummary = async () => {
  const response = await api.get('/bin/summary');
  return response.data;
};
