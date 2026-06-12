import { authFetch } from './authService';

const API_URL = '/api/notifications';

export const notificationService = {
  async getNotifications() {
    const token = localStorage.getItem('token');
    const response = await authFetch(API_URL, {
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
    if (!response.ok) throw new Error(data.error || 'Failed to fetch notifications');
    return data;
  },

  async markAsRead(id: number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/${id}/read`, {
      method: 'PUT',
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
    if (!response.ok) throw new Error(data.error || 'Failed to mark as read');
    return data;
  }
};
