const API_URL = '/api/auth';

export const authService = {
  async login(email: string, password: string) {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch (e: any) {
      throw new Error('Connection failed: Server is unreachable. Please verify your internet connection.');
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async verify(email: string, code: string) {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
    } catch (e: any) {
      throw new Error('Connection failed: Server is unreachable.');
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid response from server');
    }
    if (!response.ok) throw new Error(data.error || 'Verification failed');
    return data;
  },

  async resendCode(email: string) {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (e: any) {
      throw new Error('Connection failed: Server is unreachable.');
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid response from server');
    }
    if (!response.ok) throw new Error(data.error || 'Resend failed');
    return data;
  },

  async googleLogin(email: string) {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (e: any) {
      throw new Error('Connection failed: Server is unreachable. Please verify your internet connection.');
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Google login failed');
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async register(username: string, email: string, password: string) {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
    } catch (e: any) {
      throw new Error('Connection failed: Server is unreachable. Please verify your internet connection.');
    }
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
    }
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    if (!user) return null;
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser && parsedUser.email) {
        const backupAvatar = localStorage.getItem(`deohub_avatar_backup_${parsedUser.email.toLowerCase()}`);
        if (backupAvatar) {
          parsedUser.avatar_url = backupAvatar;
        }
      }
      return parsedUser;
    } catch (e) {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isTokenExpired() {
    const token = localStorage.getItem('token');
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payloadBase64 = parts[1];
      const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
        return true;
      }
      return false;
    } catch (e) {
      return true; // Malformed token counts as expired
    }
  }
};

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('token');
  const isExpired = authService.isTokenExpired();

  // If token is missing or has expired on any authenticated request, block it client-side
  // to prevent unnecessary 401 errors from triggering on the backend logs.
  if (!token || isExpired) {
    const reason = !token ? "No token provided" : "Token has expired";
    console.warn(`[Client-Guard] Preflight blocked request: ${reason}. Triggering local log out...`);
    
    authService.logout();
    window.dispatchEvent(new CustomEvent('unauthorized_session'));

    // Return a clean synthesized 401 Response
    return new Response(JSON.stringify({ error: !token ? 'Access denied' : 'Invalid token' }), {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let response: Response;
  let attempts = 3;
  let delay = 500; // ms

  while (attempts > 0) {
    try {
      response = await fetch(input, init);
      break; // Success, exit retry loop
    } catch (err: any) {
      attempts--;
      if (attempts === 0) {
        console.warn("[Network-Guard] Fetch failed after all retries due to network / reboot issue. Synthesizing offline fallback response.", err.message);
        return new Response(JSON.stringify({ 
          error: 'DeoHub server connection lost. We are trying to reconnect you in the background! 🔌' 
        }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.warn(`[Network-Guard] Fetch failed, retrying in ${delay}ms... (${attempts} attempts left)`, err.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }

  if (response.status === 401) {
    try {
      const clone = response.clone();
      const text = await clone.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {}
      
      const errMsg = data?.error || data?.message || '';
      if (
        errMsg === 'Invalid token' || 
        errMsg === 'Access denied' || 
        errMsg === 'Authentication required' ||
        errMsg.toLowerCase().includes('token') ||
        errMsg.toLowerCase().includes('expired') ||
        errMsg.toLowerCase().includes('jwt')
      ) {
        authService.logout();
        window.dispatchEvent(new CustomEvent('unauthorized_session'));
      }
    } catch (e) {
      console.error("Error standardizing 401 response:", e);
    }
  }
  return response;
}

