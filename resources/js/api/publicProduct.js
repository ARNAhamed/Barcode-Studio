import axios from 'axios';

/**
 * Fetch public product details by token.
 * Uses /api/public/products/{token}
 */
export async function getPublicProduct(token) {
  const res = await axios.get(`/api/public/products/${token}`);
  return res.data;
}
