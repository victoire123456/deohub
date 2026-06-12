import { authFetch } from './authService';

const API_URL = '/api/messages';

export const messageService = {
  async getConversations() {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/conversations`, {
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
    if (!response.ok) throw new Error(data.error || 'Failed to fetch conversations');
    return data;
  },

  async getMessages(userId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/${userId}`, {
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
    if (!response.ok) throw new Error(data.error || 'Failed to fetch messages');
    return data;
  },

  async sendMessage(receiverId: string | number, message: string, type = 'text', attachmentUrl: string | null = null, replyToId: number | null = null) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ receiverId, message, type, attachmentUrl, replyToId })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to send message');
    return data;
  },

  async editMessage(messageId: string | number, text: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/${messageId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    const bodyText = await response.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      throw new Error(`Invalid response from server: ${bodyText.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to edit message');
    return data;
  },

  async deleteMessage(messageId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const bodyText = await response.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      throw new Error(`Invalid response from server: ${bodyText.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to delete message');
    return data;
  },

  async markAsSeen(userId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/${userId}/seen`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const bodyText = await response.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      throw new Error(`Invalid response from server: ${bodyText.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to mark messages as seen');
    return data;
  },

  async toggleReaction(messageId: string | number, emoji: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/${messageId}/react`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emoji })
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to toggle reaction');
    return data;
  }
};

