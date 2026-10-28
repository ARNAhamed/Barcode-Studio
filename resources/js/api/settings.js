import axios from 'axios';

/**
 * Get application settings (public page toggles).
 */
export async function getSettings() {
  const res = await axios.get('/api/settings');
  return res.data;
}

/**
 * Update application settings.
 */
export async function updateSettings(settings) {
  const res = await axios.put('/api/settings', settings);
  return res.data;
}
