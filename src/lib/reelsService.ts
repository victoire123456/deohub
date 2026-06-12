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

export const reelsService = {
  async getReels() {
    const token = localStorage.getItem('token');
    const response = await authFetch('/api/reels', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to fetch reels');
  },

  async createReel(videoUrl: string, caption?: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch('/api/reels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ videoUrl, caption })
    });
    return handleResponse(response, 'Failed to create reel');
  },

  async toggleLike(reelId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/reels/${reelId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to toggle like');
  },

  async getComments(reelId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/reels/${reelId}/comments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to get comments');
  },

  async addComment(reelId: string | number, content: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/reels/${reelId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });
    return handleResponse(response, 'Failed to add comment');
  },

  async toggleCommentLike(commentId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/reels/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to toggle comment like');
  }
};
