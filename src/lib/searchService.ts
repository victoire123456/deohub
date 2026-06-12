import { authFetch } from './authService';

const API_URL = '/api/search';

export const searchService = {
  async search(query: string, type: 'all' | 'users' | 'posts' = 'all') {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = `${API_URL}?q=${encodeURIComponent(query)}&type=${type}`;
    const response = await authFetch(url, { headers });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to search');
    return data;
  }
};

