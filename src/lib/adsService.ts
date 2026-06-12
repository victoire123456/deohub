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

export const adsService = {
  async getAds() {
    const token = localStorage.getItem('token');
    const response = await authFetch('/api/ads', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to fetch ads');
  },

  async createAd(titleOrData: any, imageUrl?: string, videoUrl?: string, linkUrl?: string, budget?: number) {
    const token = localStorage.getItem('token');
    let requestBody: any;
    if (typeof titleOrData === 'object' && titleOrData !== null) {
      requestBody = titleOrData;
    } else {
      requestBody = { title: titleOrData, imageUrl, videoUrl, linkUrl, budget };
    }
    const response = await authFetch('/api/ads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });
    return handleResponse(response, 'Failed to create ad');
  },

  async recordInteraction(adId: string | number, type: 'click' | 'impression') {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/ads/${adId}/interact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ type })
    });
    return handleResponse(response, 'Failed to record interaction');
  },

  async getPromotedPosts() {
    const token = localStorage.getItem('token');
    const response = await authFetch('/api/ads/promoted', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to fetch promoted posts');
  },

  async promotePost(postId: string | number, budget: number) {
    const token = localStorage.getItem('token');
    const response = await authFetch('/api/ads/promote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ postId, budget })
    });
    return handleResponse(response, 'Failed to promote post');
  },

  async updateAdStatus(adId: string | number, status: 'active' | 'paused') {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/ads/${adId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    return handleResponse(response, 'Failed to update ad status');
  },

  async deleteAd(adId: string | number) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/ads/${adId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response, 'Failed to delete ad');
  },

  async updateAd(adId: string | number, adData: any) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/ads/${adId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(adData)
    });
    return handleResponse(response, 'Failed to update ad');
  },

  async adminModerateAd(adId: string | number, status: string, remarks?: string) {
    const token = localStorage.getItem('token');
    const response = await authFetch(`/api/ads/${adId}/moderate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, remarks })
    });
    return handleResponse(response, 'Failed to moderate ad');
  }
};
