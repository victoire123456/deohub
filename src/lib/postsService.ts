import { authFetch } from './authService';

const API_URL = '/api/posts';

export const postsService = {
  async createPost(content: string, imageUrl?: string, videoUrl?: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, imageUrl, videoUrl }),
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to create post');
    return data;
  },

  async getPosts() {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await authFetch(API_URL, { headers });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
       throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to fetch posts');
    return data;
  },

  async toggleLike(postId: string | number) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please login to like posts');

    const response = await authFetch(`${API_URL}/${postId}/like`, {
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
    if (!response.ok) throw new Error(data.error || 'Failed to toggle like');
    return data;
  },

  async getComments(postId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`${API_URL}/${postId}/comments`, {
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
    if (!response.ok) throw new Error(data.error || 'Failed to fetch comments');
    return data;
  },

  async addComment(postId: string | number, content: string) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please login to comment');

    const response = await authFetch(`${API_URL}/${postId}/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content }),
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to add comment');
    return data;
  },

  async deletePost(postId: string | number) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please login to delete your post');

    const response = await authFetch(`${API_URL}/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Failed to delete post');
    return data;
  }
};

