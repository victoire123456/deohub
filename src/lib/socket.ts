import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      timeout: 10000,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('Global socket connected:', socketInstance?.id);
      
      // Auto join room if there is a logged in user
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user && user.id) {
            socketInstance?.emit('join_room', { 
              roomId: `user_${user.id}`, 
              userId: user.id 
            });
          }
        } catch (e) {
          console.error('Failed to parse user on socket connect:', e);
        }
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('Socket connection warning:', error.message);
    });
  }
  
  return socketInstance;
};
