import { authFetch } from './authService';

const API_URL = '/api/users';

export const userService = {
  async getProfile(username: string) {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await authFetch(`${API_URL}/${username}`, { headers });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to fetch profile');
    return data;
  },

  async updateProfile(bio: string, avatarUrl: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/update`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bio, avatarUrl }),
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to update profile');
    return data;
  },

  async updateE2EKey(e2eePublicKey: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/update-e2ee-key`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ e2eePublicKey })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to update E2E key');
    return data;
  },

  async toggleFollow(userId: number | string) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please login to follow users');

    const response = await authFetch(`${API_URL}/${userId}/follow`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      },
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to toggle follow');
    return data;
  },

  async getUserPosts(userId: number | string) {
    const response = await authFetch(`${API_URL}/${userId}/posts`);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to fetch user posts');
    return data;
  },

  async verifyUser(userId: number | string, isVerified: boolean) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication required');

    const response = await authFetch(`${API_URL}/${userId}/verify`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_verified: isVerified })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to update user verification');
    return data;
  }
};

