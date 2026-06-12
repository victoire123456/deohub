import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, MessageCircle, UserPlus, Loader2, Sparkles, MessageSquare, 
  Send, Eye, Award, CheckCircle2, Globe, Bell, Radio
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket';
import { notificationService } from '../lib/notificationService';
import { authService } from '../lib/authService';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow' | 'message' | 'reply' | 'story_reaction' | 'live';
  sender_username: string;
  sender_avatar?: string;
  is_read: boolean;
  created_at: string;
  content?: string | null;
  post_id?: number | null;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    loadNotifications();

    const socket = getSocket();
    socketRef.current = socket;

    if (currentUser?.id) {
      socket.emit('join_room', { roomId: `user_${currentUser.id}`, userId: currentUser.id });
    }

    const handleNewNotification = (data: any) => {
      // Append the live notification instantly with entry animation
      setNotifications(prev => {
        if (prev.some(n => n.id.toString() === data.id.toString())) return prev;
        return [data, ...prev];
      });
      toast.info(`New interaction from @${data.sender_username}!`, {
        description: data.content || 'Check your activities center.',
        icon: '🔔'
      });
    };

    const handleStreamStopped = ({ streamId }: { streamId: number }) => {
      setNotifications(prev => prev.filter(note => !(note.type === 'live' && note.post_id === streamId)));
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('live_stream_stopped_global', handleStreamStopped);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('live_stream_stopped_global', handleStreamStopped);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(note => note.id === id ? { ...note, is_read: true } : note));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) {
      toast.info('Everything is up-to-date!');
      return;
    }
    try {
      await Promise.all(unread.map(n => notificationService.markAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read!');
    } catch (err) {
      toast.error('Could not mark all items as read');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="px-4 text-white"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black font-sans tracking-tight text-white flex items-center gap-2">
            <Bell className="text-[#cb3dfc]" size={24} /> Notifications
          </h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Real-time alerts & interactions</p>
        </div>
        <button 
          onClick={markAllAsRead}
          className="py-2 px-4 rounded-full bg-zinc-900 border border-zinc-800 hover:border-[#7c3aed]/50 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          Mark all read
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex-grow flex flex-col items-center justify-center p-24 gap-3">
          <Loader2 size={32} className="animate-spin text-[#cb3dfc]" />
          <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Querying database...</span>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2 pb-20">
          <AnimatePresence initial={false}>
            {notifications.map(note => {
              const avatarUrl = note.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${note.sender_username}`;
              
              let actionLabel = '';
              let badgeColor = 'bg-[#7c3aed]';
              let badgeIcon = <Heart size={12} className="text-white" fill="white" />;

              if (note.type === 'like') {
                actionLabel = 'liked your post';
                badgeColor = 'bg-[#7c3aed]';
                badgeIcon = <Heart size={12} className="text-white" fill="white" />;
              } else if (note.type === 'comment') {
                actionLabel = 'commented on your post';
                badgeColor = 'bg-[#3b82f6]';
                badgeIcon = <MessageCircle size={12} className="text-white" fill="white" />;
              } else if (note.type === 'follow') {
                actionLabel = 'started following you';
                badgeColor = 'bg-emerald-500';
                badgeIcon = <UserPlus size={12} className="text-white" />;
              } else if (note.type === 'message') {
                actionLabel = 'sent you a message';
                badgeColor = 'bg-[#cb3dfc]';
                badgeIcon = <MessageSquare size={12} className="text-white" />;
              } else if (note.type === 'reply') {
                actionLabel = 'replied to your message';
                badgeColor = 'bg-pink-500';
                badgeIcon = <Send size={12} className="text-white" />;
              } else if (note.type === 'story_reaction') {
                actionLabel = `reacted ${note.content || '❤️'} to your story`;
                badgeColor = 'bg-amber-500';
                badgeIcon = <Eye size={12} className="text-white" />;
              } else if (note.type === 'live') {
                actionLabel = 'started a live stream 🔴';
                badgeColor = 'bg-red-500 animate-pulse';
                badgeIcon = <Radio size={12} className="text-white" />;
              } else {
                actionLabel = 'interacted with your profile';
                badgeColor = 'bg-zinc-700';
                badgeIcon = <Sparkles size={12} className="text-white" />;
              }

              return (
                <motion.div 
                  key={note.id}
                  initial={{ opacity: 0, x: -10, y: 5 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => !note.is_read && markAsRead(note.id)}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl p-4 transition-all cursor-pointer border",
                    !note.is_read 
                      ? 'bg-zinc-900 border-[#7c3aed]/20 hover:border-[#7c3aed]/40' 
                      : 'bg-[#09090b]/40 border-[#09090b] hover:bg-zinc-900/40 hover:border-zinc-850'
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 p-0.5">
                      <img 
                        src={avatarUrl} 
                        alt="@username" 
                        referrerPolicy="no-referrer"
                        className="h-full w-full rounded-full object-cover" 
                      />
                    </div>
                    <div className={cn(
                      "absolute -right-1.5 -bottom-1.5 flex h-6.5 w-6.5 items-center justify-center rounded-full border-2 border-zinc-950 shadow-sm",
                      badgeColor
                    )}>
                      {badgeIcon}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 font-medium">
                      <span className="font-extrabold text-white">@{note.sender_username}</span> {actionLabel}
                    </p>
                    
                    {/* Inline Content Preview context (very Telegram style!) */}
                    {note.content && (note.type !== 'story_reaction') && (
                      <p className="text-[11px] text-zinc-500 font-semibold truncate mt-1 pl-2 border-l-2 border-zinc-800 max-w-sm">
                        {note.content}
                      </p>
                    )}

                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-640 mt-1.5 block">
                      {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}  •  DeoHub activity
                    </span>
                  </div>
                  
                  {!note.is_read && (
                    <div className="h-2 w-2 rounded-full bg-[#cb3dfc] drop-shadow-[0_0_4px_rgba(203,61,252,0.8)]" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-[#09090b] border border-dashed border-zinc-900 rounded-3xl">
          <Globe size={40} className="text-zinc-700 mx-auto mb-3.5" />
          <p className="font-extrabold text-sm text-zinc-300">Quiet for now</p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed mt-1">There are no dynamic alerts logged inside your DeoHub channel. Check back soon for activities.</p>
        </div>
      )}
    </motion.div>
  );
}
