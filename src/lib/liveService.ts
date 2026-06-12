import { authFetch } from './authService';

async function handleResponse(response: Response, defaultError: string) {
  const text = await response.text();
  if (!response.ok) {
    let err: any;
    try {
      err = JSON.parse(text);
    } catch (e) {
      throw new Error(`Server returned error: ${text.substring(0, 100)}`);
    }
    throw new Error(err?.error || err?.message || defaultError);
  }
  
  if (!text) return null;
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}

export const liveService = {
  async getActiveStreams() {
    const token = localStorage.getItem('token');
    const response = await authFetch('/api/live', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to fetch active live streams');
  },

  async getLiveHistory() {
    const token = localStorage.getItem('token');
    const response = await authFetch('/api/live/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to fetch live history');
  },

  async getStreamDetails(streamId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/live/${streamId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to fetch stream details');
  },

  async startStream(title: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch('/api/live/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title })
    });
    return handleResponse(response, 'Failed to start live stream');
  },

  async stopStream(streamId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/live/${streamId}/end`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to stop live stream');
  },

  async getComments(streamId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/live/${streamId}/comments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to fetch stream comments');
  },

  async addComment(streamId: string | number, content: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/live/${streamId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });
    return handleResponse(response, 'Failed to post comment');
  },

  async addReaction(streamId: string | number, reactionType: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/live/${streamId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reactionType })
    });
    return handleResponse(response, 'Failed to post reaction');
  }
};
