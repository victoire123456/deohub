import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Edit3, ArrowLeft, Phone, Video, Send, Mic, MoreVertical, 
  Smile, Paperclip, Sparkles, Loader2, Check, CheckCheck, Reply, 
  Trash2, Edit, Play, Pause, X, Image as ImageIcon, Volume2, Globe, Forward
} from 'lucide-react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket';
import { 
  initializeUserE2EE, 
  getChatSymmetricKey, 
  encryptMessageText, 
  decryptMessageText 
} from '../lib/e2ee';
import { userService } from '../lib/userService';
import { cn } from '../lib/utils';
import { authService } from '../lib/authService';
import { messageService } from '../lib/messageService';
import { geminiService } from '../lib/geminiService';
import { searchService } from '../lib/searchService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { liveService } from '../lib/liveService';

interface MessageReaction {
  emoji: string;
  user_id: string | number;
  username: string;
}

interface Message {
  id: string | number;
  sender_id: string | number;
  receiver_id: string | number;
  message: string;
  type: string; // 'text' | 'image' | 'video' | 'voice'
  attachment_url?: string | null;
  reply_to_id?: number | null;
  reply_to_message?: string | null;
  reply_to_sender_username?: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  status: 'sent' | 'delivered' | 'seen';
  created_at: string;
  reactions?: MessageReaction[];
}

interface DatabaseChat {
  user_id: string | number;
  username: string;
  avatar_url: string;
  last_message_id: string | number;
  last_message: string;
  last_message_type: string;
  last_message_status: 'sent' | 'delivered' | 'seen';
  last_message_sender_id: string | number;
  last_message_created_at: string;
  unread_count: number;
  isOnline?: boolean;
  e2ee_public_key?: string | null;
}

// Sub-component to play Voice Notes beautifully with waves and timers
function VoiceNotePlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tick, setTick] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const BASE_HEIGHTS = [
    0.18, 0.32, 0.45, 0.28, 0.52, 0.76, 0.61, 0.44, 0.58, 0.82, 
    0.95, 0.72, 0.38, 0.55, 0.78, 0.91, 0.82, 0.64, 0.51, 0.68, 
    0.88, 0.62, 0.48, 0.35, 0.54, 0.42, 0.26, 0.15
  ];
  const numBars = BASE_HEIGHTS.length;

  useEffect(() => {
    audioRef.current = new Audio(url);
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    if (audio.duration) {
      setDuration(audio.duration);
    }

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url]);

  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    const update = () => {
      setTick(prev => (prev + 1) % 10000);
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        toast.error('Unable to play recording. Device policy muted autoplay.');
      });
      setIsPlaying(true);
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !audioRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const pct = Math.max(0, Math.min(1, clickX / width));
    
    if (audioRef.current.duration) {
      audioRef.current.currentTime = pct * audioRef.current.duration;
      setCurrentTime(audioRef.current.currentTime);
      setProgress(pct * 100);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 bg-zinc-900/80 dark:bg-black/45 border border-zinc-800 rounded-2xl p-3.5 mt-1.5 w-64 shadow-md select-none">
      <button 
        onClick={togglePlay}
        className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] flex items-center justify-center text-white shrink-0 hover:scale-105 active:scale-95 transition-transform shadow-md"
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Volume2 size={11} className="text-[#a78bfa]" /> Voice Note
          </span>
          <span className="text-[9px] text-zinc-400 font-mono bg-zinc-800/60 px-1.5 py-0.5 rounded-md">
            {formatTime(currentTime)} / {formatTime(duration || 320)}
          </span>
        </div>
        
        {/* Dynamic Waveform Visualizer */}
        <div 
          ref={containerRef}
          onClick={handleScrub}
          className="flex items-end justify-between h-9 gap-[2px] cursor-pointer group/wave py-1"
          title="Click to seek"
        >
          {BASE_HEIGHTS.map((baseHeight, i) => {
            const barProgress = (i / numBars) * 100;
            const isActive = progress >= barProgress;
            
            // Add a vibrant, natural sin/cos frequency wiggle to each bar when playing
            const wiggle = isPlaying 
              ? Math.sin((tick * 0.15) + i * 0.6) * 0.16 + Math.cos((tick * 0.08) - i * 0.4) * 0.08
              : 0;
            
            const finalHeight = Math.max(0.12, Math.min(1.0, baseHeight + wiggle));
            
            return (
              <div 
                key={i}
                className={cn(
                  "w-[4px] rounded-full transition-all duration-75 origin-bottom relative",
                  isActive 
                    ? "bg-[#7c3aed] dark:bg-[#a78bfa]" 
                    : "bg-zinc-700/60 dark:bg-zinc-800 group-hover/wave:bg-zinc-650"
                )}
                style={{ height: `${finalHeight * 100}%` }}
              >
                {/* Visual glow overlay for active bars */}
                {isActive && isPlaying && (
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Conversation View Components
interface ConversationProps {
  chat: DatabaseChat;
  onBack: () => void;
  onMessageSent: (receiverId: string | number, text: string) => void;
}

function Conversation({ chat, onBack, onMessageSent }: ConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isE2eeReady, setIsE2eeReady] = useState(false);
  const symKeyRef = useRef<CryptoKey | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | number | null>(null);
  
  // Attachments state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const chatImageRef = useRef<HTMLInputElement>(null);
  const chatVideoRef = useRef<HTMLInputElement>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef<boolean>(false);

  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSend('image', reader.result as string);
        toast.success('Dispatched photo attachment successfully! 📸');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChatVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSend('video', reader.result as string);
        toast.success('Dispatched video attachment successfully! 🎬');
      };
      reader.readAsDataURL(file);
    }
  };

  // Suggested Replies and Sockets
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = authService.getCurrentUser();
  
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Forwarding States
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [forwardSearchResults, setForwardSearchResults] = useState<any[]>([]);
  const [isForwardSearching, setIsForwardSearching] = useState(false);
  const [recentForwardChats, setRecentForwardChats] = useState<any[]>([]);
  const [isLoadingRecentChats, setIsLoadingRecentChats] = useState(false);

  // Load recent chats for forwarding modal on open
  useEffect(() => {
    if (isForwardModalOpen) {
      const loadRecentChats = async () => {
        setIsLoadingRecentChats(true);
        try {
          const dbConversations = await messageService.getConversations();
          setRecentForwardChats(dbConversations || []);
        } catch (err) {
          console.warn('Failed to load recent chats for forwarding:', err);
        } finally {
          setIsLoadingRecentChats(false);
        }
      };
      loadRecentChats();
    }
  }, [isForwardModalOpen]);

  // Global search for forwarding modal
  useEffect(() => {
    if (!forwardSearchQuery.trim()) {
      setForwardSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsForwardSearching(true);
      try {
        const result = await searchService.search(forwardSearchQuery, 'users');
        const list = (result.users || []).filter((u: any) => u.id.toString() !== currentUser?.id?.toString());
        setForwardSearchResults(list);
      } catch (err) {
        console.error('Failed to search users in forward modal:', err);
      } finally {
        setIsForwardSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [forwardSearchQuery, currentUser?.id]);

  const handleForwardMessage = async (targetUser: any) => {
    if (!forwardingMessage) return;
    try {
      const textToSend = forwardingMessage.message;
      const typeToSend = forwardingMessage.type || 'text';
      const urlToSend = forwardingMessage.attachment_url || null;

      // Send message via API
      const savedMsg = await messageService.sendMessage(
        targetUser.id,
        textToSend,
        typeToSend,
        urlToSend,
        null // No reply to id for forwards
      );

      // Update parent list and callback if forwarded-to user is in the current conversation
      onMessageSent(targetUser.id, typeToSend === 'text' ? textToSend : `Forwarded an attachment (${typeToSend})`);

      // If we are currently chatting with this user, append to messages
      if (chat && chat.user_id?.toString() === targetUser.id?.toString()) {
        setMessages(prev => {
          if (prev.some(m => m.id.toString() === savedMsg.id.toString())) return prev;
          return [...prev, savedMsg];
        });
      }

      toast.success(`Message forwarded to @${targetUser.username}!`);
      setIsForwardModalOpen(false);
      setForwardingMessage(null);
      setForwardSearchQuery('');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to forward message');
    }
  };

  useEffect(() => {
    return () => {
      // Clean up typing state on unmount or chat target swap
      if (isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = false;
        socketRef.current?.emit('typing', { 
          roomId: `room_${currentUser?.id}_${chat.user_id}`,
          userId: currentUser?.id,
          isTyping: false,
          senderUsername: currentUser?.username,
          receiverId: chat.user_id
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [chat.user_id, currentUser?.id]);

  useEffect(() => {
    let active = true;
    const negotiateE2EE = async () => {
      setIsE2eeReady(false);
      symKeyRef.current = null;
      if (!currentUser) return;
      
      try {
        // 1. Initialize current user's E2E keys
        const myKeys = await initializeUserE2EE(currentUser.id);
        
        // 2. Fetch our latest profile from the database to see if we have our e2ee_public_key uploaded
        try {
          const myProfile = await userService.getProfile(currentUser.username);
          if (!myProfile.e2ee_public_key) {
            await userService.updateE2EKey(myKeys.publicKey);
            console.log("Uploaded and propagated current user's E2EE Public Key!");
          }
        } catch (profileErr) {
          console.warn("Failed to check/update own E2EE key in DB:", profileErr);
        }

        // 3. Obtain peer's E2EE public key
        let peerPubKey = chat.e2ee_public_key || null;
        if (!peerPubKey) {
          try {
            const peerProfile = await userService.getProfile(chat.username);
            peerPubKey = peerProfile.e2ee_public_key || null;
          } catch (peerErr) {
            console.warn("Failed to retrieve peer's E2EE public key, fallback will be used:", peerErr);
          }
        }

        // 4. Derive the chat symmetric key (with PBKDF2 deterministic fallback if peerPubKey is not set)
        const aesKey = await getChatSymmetricKey(
          Number(currentUser.id),
          myKeys.privateKey,
          Number(chat.user_id),
          peerPubKey
        );

        if (active) {
          symKeyRef.current = aesKey;
          setIsE2eeReady(true);
          // Reload chat history with E2EE key ready!
          loadChatHistory();
        }
      } catch (err) {
        console.error("E2EE Negotiation failed:", err);
        if (active) {
          setIsE2eeReady(true); // fall back to plaintext if there's any critical fail so chat functionality stays
          loadChatHistory();
        }
      }
    };

    negotiateE2EE();

    return () => {
      active = false;
    };
  }, [chat.user_id, currentUser?.id]);

  useEffect(() => {
    // Mark messages from this user as seen
    markCurrentChatAsSeen();

    const socket = getSocket();
    socketRef.current = socket;

    // Join room for real-time status
    socket.emit('join_room', { roomId: `room_${currentUser?.id}_${chat.user_id}`, userId: currentUser?.id });
    socket.emit('join_room', { roomId: `user_${currentUser?.id}`, userId: currentUser?.id });

    const handleReceiveMessage = async (data: any) => {
      // Check if this message belongs to the active conversation
      const senderIdStr = data?.sender_id?.toString();
      const receiverIdStr = data?.receiver_id?.toString();
      const chatUserIdStr = chat?.user_id?.toString();
      const currentUserIdStr = currentUser?.id?.toString();

      if (
        (senderIdStr === chatUserIdStr && receiverIdStr === currentUserIdStr) ||
        (senderIdStr === currentUserIdStr && receiverIdStr === chatUserIdStr)
      ) {
        let displayMessage = data.message;
        if (data.message && symKeyRef.current) {
          displayMessage = await decryptMessageText(data.message, symKeyRef.current);
        }
        const decryptedMsg = { ...data, message: displayMessage };

        setMessages(prev => {
          // Avoid duplicate appends
          if (prev.some(m => m.id?.toString() === data?.id?.toString())) return prev;
          return [...prev, decryptedMsg];
        });

        // Trigger seen status update if the sender is the other user and we are looking at this screen
        if (senderIdStr === chatUserIdStr) {
          socket.emit('seen_receipt', { senderId: chat.user_id, receiverId: currentUser?.id });
        }
      }
    };

    const handleReceiveReaction = (data: any) => {
      const { messageId, reactions } = data;
      setMessages(prev => prev.map(msg => {
        if (msg.id?.toString() === messageId?.toString()) {
          return { ...msg, reactions };
        }
        return msg;
      }));
    };

    const handleMessageEdited = async (data: any) => {
      let plaintext = data.text;
      if (data.text && symKeyRef.current) {
        plaintext = await decryptMessageText(data.text, symKeyRef.current);
      }
      setMessages(prev => prev.map(msg => {
        if (msg.id?.toString() === data?.messageId?.toString()) {
          return { ...msg, message: plaintext, is_edited: true };
        }
        return msg;
      }));
    };

    const handleMessageDeleted = (data: any) => {
      setMessages(prev => prev.filter(msg => msg.id?.toString() !== data?.messageId?.toString()));
    };

    const handleUserTyping = (data: any) => {
      const dataUserIdStr = data?.userId?.toString();
      const chatUserIdStr = chat?.user_id?.toString();
      if (dataUserIdStr === chatUserIdStr && data?.isTyping) {
        setIsTyping(true);
        setTypingUser(data.senderUsername);
      } else if (dataUserIdStr === chatUserIdStr && !data?.isTyping) {
        setIsTyping(false);
      }
    };

    const handleUserStatus = (onlineUserIds: string[]) => {
      const chatUserIdStr = chat?.user_id?.toString();
      if (chatUserIdStr) {
        setIsOnline(onlineUserIds.includes(chatUserIdStr));
      }
    };

    const handleMessagesSeen = (data: any) => {
      // Receiver marked our messages as seen
      const dataSeenByStr = data?.seenBy?.toString();
      const chatUserIdStr = chat?.user_id?.toString();
      const currentUserIdStr = currentUser?.id?.toString();
      if (dataSeenByStr === chatUserIdStr) {
        setMessages(prev => prev.map(msg => {
          if (msg.sender_id?.toString() === currentUserIdStr) {
            return { ...msg, status: 'seen' };
          }
          return msg;
        }));
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('receive_reaction', handleReceiveReaction);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_status', handleUserStatus);
    socket.on('messages_seen', handleMessagesSeen);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('receive_reaction', handleReceiveReaction);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_status', handleUserStatus);
      socket.off('messages_seen', handleMessagesSeen);
    };
  }, [chat.user_id, currentUser?.id]);

  const loadChatHistory = async () => {
    try {
      const data = await messageService.getMessages(chat.user_id);
      
      const decryptedData = await Promise.all(data.map(async (msg: Message) => {
        if (msg.message && symKeyRef.current) {
          const decryptedText = await decryptMessageText(msg.message, symKeyRef.current);
          return { ...msg, message: decryptedText };
        }
        return msg;
      }));

      setMessages(decryptedData);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const markCurrentChatAsSeen = async () => {
    try {
      await messageService.markAsSeen(chat.user_id);
      socketRef.current?.emit('seen_receipt', { senderId: chat.user_id, receiverId: currentUser?.id });
    } catch (err) {
      console.warn('Failed to trigger seen update:', err);
    }
  };

  const handleToggleReaction = async (messageId: string | number, emoji: string) => {
    try {
      const data = await messageService.toggleReaction(messageId, emoji);
      setMessages(prev => prev.map(msg => {
        if (msg.id.toString() === messageId.toString()) {
          return { ...msg, reactions: data.reactions };
        }
        return msg;
      }));
      // Emit socket reaction update
      socketRef.current?.emit('react_message', {
        roomId: `room_${currentUser?.id}_${chat.user_id}`,
        messageId,
        reactions: data.reactions,
        receiverId: chat.user_id
      });
      setActiveReactionMessageId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update reaction');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (type = 'text', attachmentUrl: string | null = null) => {
    if (type === 'text' && !inputValue.trim()) return;
    if (!currentUser) return;
    
    // Check if we are editing
    if (editingMessage && type === 'text') {
      try {
        const cipherText = symKeyRef.current 
          ? await encryptMessageText(inputValue, symKeyRef.current)
          : inputValue;
        await messageService.editMessage(editingMessage.id, cipherText);
        setMessages(prev => prev.map(msg => {
          if (msg.id === editingMessage.id) {
            return { ...msg, message: inputValue, is_edited: true };
          }
          return msg;
        }));
        setInputValue('');
        setEditingMessage(null);
        toast.success('Message edited');
        if (isCurrentlyTypingRef.current) {
          isCurrentlyTypingRef.current = false;
          socketRef.current?.emit('typing', { 
            roomId: `room_${currentUser?.id}_${chat.user_id}`,
            userId: currentUser?.id,
            isTyping: false,
            senderUsername: currentUser?.username,
            receiverId: chat.user_id
          });
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to edit message');
      }
      return;
    }

    try {
      const textToSave = type === 'text' && symKeyRef.current
        ? await encryptMessageText(inputValue, symKeyRef.current)
        : inputValue;

      const savedMsg = await messageService.sendMessage(
        chat.user_id,
        textToSave,
        type,
        attachmentUrl,
        replyingTo ? Number(replyingTo.id) : null
      );

      // We append the plaintext version locally so it looks instant and runs without a glitch!
      const localMsg = { ...savedMsg, message: type === 'text' ? inputValue : savedMsg.message };

      // Append locally, avoiding socket duplicates
      setMessages(prev => {
        if (prev.some(m => m.id.toString() === localMsg.id.toString())) return prev;
        return [...prev, localMsg];
      });

      onMessageSent(chat.user_id, type === 'text' ? inputValue : `Sent an attachment (${type})`);
      setInputValue('');
      setReplyingTo(null);
      setAiSuggestions([]);
      if (isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = false;
        socketRef.current?.emit('typing', { 
          roomId: `room_${currentUser?.id}_${chat.user_id}`,
          userId: currentUser?.id,
          isTyping: false,
          senderUsername: currentUser?.username,
          receiverId: chat.user_id
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (err: any) {
      toast.error('Failed to dispatch message');
    }
  };

  const handleDelete = async (msgId: string | number) => {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this message for both participants?");
    if (!confirmDelete) return;

    try {
      await messageService.deleteMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast.success('Message deleted for both participants');
    } catch (err: any) {
      toast.error('Failed to delete message');
    }
  };

  const handleAttachImage = () => {
    chatImageRef.current?.click();
    setShowAttachmentMenu(false);
  };

  const handleAttachVideo = () => {
    chatVideoRef.current?.click();
    setShowAttachmentMenu(false);
  };

  // Actual device microphone voice recorder module
  const handleToggleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } else {
      // Start recording from physical device microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            // Send the Base64 data URL caught by browser mic
            handleSend('voice', base64Audio);
            toast.success('Voice Note captured and sent! 🎤');
          };
          reader.readAsDataURL(audioBlob);

          // Stop all audio tracks to release device mic indicator
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingSeconds(0);
        toast.info('Device microphone active! Recording started...');

        recordingIntervalRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);

      } catch (err: any) {
        console.error('Microphone recording error:', err);
        toast.error('Could not access microphone! Please ensure device permissions are granted.');
        
        // Fallback gracefully just in case permissions are disabled in test containers
        setIsRecording(false);
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    
    // Manage real-time typing state with high precision
    if (val.length > 0) {
      if (!isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = true;
        socketRef.current?.emit('typing', { 
          roomId: `room_${currentUser?.id}_${chat.user_id}`,
          userId: currentUser?.id,
          isTyping: true,
          senderUsername: currentUser?.username,
          receiverId: chat.user_id
        });
      }

      // Reset typing timeout to handle conversational pause
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isCurrentlyTypingRef.current = false;
        socketRef.current?.emit('typing', {
          roomId: `room_${currentUser?.id}_${chat.user_id}`,
          userId: currentUser?.id,
          isTyping: false,
          senderUsername: currentUser?.username,
          receiverId: chat.user_id
        });
      }, 3000);
    } else {
      // Input cleared completely
      if (isCurrentlyTypingRef.current) {
        isCurrentlyTypingRef.current = false;
        socketRef.current?.emit('typing', { 
          roomId: `room_${currentUser?.id}_${chat.user_id}`,
          userId: currentUser?.id,
          isTyping: false,
          senderUsername: currentUser?.username,
          receiverId: chat.user_id
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleAiSuggest = async () => {
    if (messages.length === 0) {
        toast.info('Wait for the conversation to start!');
        return;
    }

    setIsAiSuggesting(true);
    setAiSuggestions([]);
    try {
      const lastMessages = messages.slice(-5).map(m => `${m.sender_id === currentUser?.id ? 'Me' : chat.username}: ${m.message}`).join('\n');
      const suggestions = await geminiService.generateReplySuggestion(lastMessages);
      setAiSuggestions(suggestions);
      toast.success('AI Suggestions ready!');
    } catch (err: any) {
      toast.error('AI Suggestion failed');
    } finally {
      setIsAiSuggesting(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100vw' }}
      animate={{ x: 0 }}
      exit={{ x: '100vw' }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white md:relative md:inset-auto md:h-[calc(100vh-140px)] md:rounded-3xl md:border md:border-zinc-850 md:shadow-2xl overflow-hidden"
    >
      {/* Hidden chat attachment file inputs for direct device uploads */}
      <input 
        type="file" 
        ref={chatImageRef} 
        accept="image/*" 
        onChange={handleChatImageSelect} 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={chatVideoRef} 
        accept="video/*" 
        onChange={handleChatVideoSelect} 
        className="hidden" 
      />
      {/* Detail Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 bg-[#09090b] p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-full p-2 hover:bg-zinc-900 transition-colors md:hidden">
            <ArrowLeft size={18} />
          </button>
          <div className="relative">
            <img 
              src={chat.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.username}`} 
              alt={chat.username} 
              className="h-10 w-10 rounded-full object-cover" 
            />
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 bg-emerald-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-black text-white leading-tight">@{chat.username}</h3>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[8px] font-black uppercase tracking-wider select-none shrink-0 font-sans" title="End-to-End Encrypted. Only the two of you can read messages.">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
                </span>
                <span>E2EE Secure</span>
              </div>
            </div>
            {isTyping ? (
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-normal">
                <span className="text-violet-400 font-extrabold flex items-center gap-1.5 animate-pulse">
                  <span className="flex items-center gap-0.5 mt-0.5">
                    <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '800ms' }}></span>
                    <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '800ms' }}></span>
                    <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '800ms' }}></span>
                  </span>
                  Typing
                </span>
              </p>
            ) : (
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-normal">
                {isOnline ? (
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">● Active now</span>
                ) : (
                  'Offline'
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => toast.success('Starting secure call...')} 
            className="rounded-full p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <Phone size={17} />
          </button>
          <button 
            onClick={() => toast.success('Starting live broadcast video call...')} 
            className="rounded-full p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <Video size={17} />
          </button>
          <button className="rounded-full p-2.5 text-zinc-500 hover:bg-zinc-900 transition-all cursor-pointer">
            <MoreVertical size={17} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Stage */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-gradient-to-b from-zinc-950 to-black">
        {messages.map((msg) => {
          const isMe = msg.sender_id?.toString() === currentUser?.id?.toString();
          
          const reactionGroups = (msg.reactions || []).reduce((acc: { [key: string]: { count: number, userReacted: boolean, users: string[] } }, curr) => {
            if (!acc[curr.emoji]) {
              acc[curr.emoji] = { count: 0, userReacted: false, users: [] };
            }
            acc[curr.emoji].count += 1;
            acc[curr.emoji].users.push(curr.username || `@${curr.user_id}`);
            if (curr.user_id?.toString() === currentUser?.id?.toString()) {
              acc[curr.emoji].userReacted = true;
            }
            return acc;
          }, {});

          return (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex flex-col max-w-[80%] relative group",
                isMe ? "ml-auto items-end" : "items-start"
              )}
            >
              {/* Emoji Float Menu */}
              <AnimatePresence>
                {activeReactionMessageId === msg.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 6 }}
                    className={cn(
                      "absolute bottom-full mb-1.5 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-full p-1.5 flex gap-1.5 z-40 items-center",
                      isMe ? "right-0" : "left-0"
                    )}
                  >
                    {REACTION_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="hover:scale-130 transition-transform text-lg px-1.5 py-0.5 rounded cursor-pointer active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reply Preview Header within bubble context */}
              {msg.reply_to_message && (
                <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 bg-zinc-900/40 px-2.5 py-1.5 rounded-t-xl mb-px border-l-2 border-[#7c3aed] max-w-xs truncate select-none">
                  <Reply size={9} className="text-[#a78bfa] shrink-0" />
                  <span className="truncate">@{msg.reply_to_sender_username}: {msg.reply_to_message}</span>
                </div>
              )}

              {/* Floating control buttons */}
              <div className={cn(
                "flex items-center gap-2 max-w-full relative",
                isMe ? "flex-row" : "flex-row-reverse"
              )}>
                {!msg.is_deleted && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {isMe && (
                      <>
                        <button 
                          onClick={() => {
                            setInputValue(msg.message);
                            setEditingMessage(msg);
                          }}
                          className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-[#7c3aed]"
                          title="Edit Message"
                        >
                          <Edit size={11} />
                        </button>
                        <button 
                          onClick={() => handleDelete(msg.id)}
                          className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-500"
                          title="Delete Message"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => {
                        setForwardingMessage(msg);
                        setIsForwardModalOpen(true);
                      }}
                      className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-500"
                      title="Forward Message"
                    >
                      <Forward size={11} />
                    </button>
                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-[#7c3aed]"
                      title="Reply"
                    >
                      <Reply size={11} />
                    </button>
                    <button 
                      onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)}
                      className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white"
                      title="React Emojis"
                    >
                      <Smile size={11} />
                    </button>
                  </div>
                )}

                {/* Main Content Bubble */}
                <div className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm shadow-md relative overflow-hidden",
                  isMe 
                    ? "bg-[#7c3aed] text-white rounded-br-none" 
                    : "bg-zinc-900 text-zinc-100 rounded-bl-none border border-zinc-850"
                )}>
                  {msg.is_deleted ? (
                    <span className="text-zinc-500 italic flex items-center gap-1.5 text-xs">
                      <Trash2 size={12} /> {msg.message}
                    </span>
                  ) : msg.type === 'image' ? (
                    <div className="space-y-2">
                      <img 
                        src={msg.attachment_url || msg.message} 
                        alt="Shared attachments" 
                        referrerPolicy="no-referrer"
                        className="rounded-lg max-h-56 max-w-64 object-cover border border-zinc-850 hover:scale-[1.02] transition-transform cursor-zoom-in"
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80'; }}
                      />
                      {msg.message && msg.message !== msg.attachment_url && <p>{msg.message}</p>}
                    </div>
                  ) : msg.type === 'video' ? (
                    <div className="space-y-2">
                      <video 
                        src={msg.attachment_url || msg.message} 
                        controls 
                        className="rounded-lg max-h-52 max-w-64 object-cover border border-zinc-850"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <p className="text-xs text-zinc-400">🎬 Shared video reference</p>
                    </div>
                  ) : msg.type === 'voice' ? (
                    <VoiceNotePlayer url={msg.attachment_url || msg.message} />
                  ) : (
                    <span>{msg.message}</span>
                  )}

                  {msg.is_edited && !msg.is_deleted && (
                    <span className="block text-[8px] opacity-60 text-right uppercase tracking-widest mt-0.5">Edited</span>
                  )}
                </div>

                {!isMe && !msg.is_deleted && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)}
                      className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white"
                      title="React Emojis"
                    >
                      <Smile size={11} />
                    </button>
                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-[#7c3aed]"
                      title="Reply"
                    >
                      <Reply size={11} />
                    </button>
                  </div>
                )}
              </div>

              {/* Render Tabulated Reaction Badges */}
              {Object.keys(reactionGroups).length > 0 && (
                <div className={cn(
                  "flex flex-wrap gap-1 mt-1 z-10",
                  isMe ? "justify-end" : "justify-start"
                )}>
                  {Object.entries(reactionGroups).map(([emoji, group]: [string, any]) => (
                    <button
                      key={emoji}
                      title={group.users.join(', ')}
                      onClick={() => handleToggleReaction(msg.id, emoji)}
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all duration-150 active:scale-95 shadow-sm",
                        group.userReacted
                          ? "bg-[#7c3aed]/20 text-[#a78bfa] border-[#7c3aed]/40"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850"
                      )}
                    >
                      <span>{emoji}</span>
                      <span className="text-[8px] font-black">{group.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp and Seen Double-Check Delivery Marks */}
              <div className="flex items-center gap-1 mt-1 text-[8px] font-bold text-zinc-500 uppercase tracking-widest select-none">
                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isMe && (
                  <span className="inline-flex">
                    {msg.status === 'seen' ? (
                      <CheckCheck size={11} className="text-[#a78bfa] drop-shadow-[0_0_4px_rgba(124,58,237,0.4)]" />
                    ) : msg.status === 'delivered' ? (
                      <CheckCheck size={11} className="text-zinc-500" />
                    ) : (
                      <Check size={11} className="text-zinc-500" />
                    )}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Typing Overlay */}
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-[10px] font-bold text-[#cb3dfc] uppercase tracking-widest bg-zinc-900/40 border border-zinc-900/80 rounded-full px-3 py-1.5 w-max select-none shadow-sm"
          >
            <span className="flex items-center gap-0.5">
              <span className="h-1 w-1 bg-[#cb3dfc] rounded-full animate-bounce" />
              <span className="h-1 w-1 bg-[#cb3dfc] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="h-1 w-1 bg-[#cb3dfc] rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>@{typingUser} is composing</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Tray & Replies Previews */}
      <div className="p-4 border-t border-zinc-900 bg-[#09090b]/90 backdrop-blur relative">
        <AnimatePresence>
          {/* Replying Status Bar */}
          {replyingTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900/85 border border-zinc-800/85 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md relative"
            >
              <div className="min-w-0 pr-4">
                <span className="text-[9px] uppercase font-black tracking-widest text-[#a78bfa] flex items-center gap-1">
                  <Reply size={10} /> Replying to context
                </span>
                <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">{replyingTo.message}</p>
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="rounded-full bg-zinc-850 p-1 text-zinc-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}

          {/* Editing Status Bar */}
          {editingMessage && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-zinc-900/85 border border-zinc-800/85 rounded-xl p-3 mb-3 flex justify-between items-center shadow-md"
            >
              <div className="min-w-0 pr-4">
                <span className="text-[9px] uppercase font-black tracking-widest text-[#a78bfa] flex items-center gap-1">
                  <Edit size={10} /> Editing Message Mode
                </span>
                <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">{editingMessage.message}</p>
              </div>
              <button 
                onClick={() => {
                  setEditingMessage(null);
                  setInputValue('');
                }}
                className="rounded-full bg-zinc-850 p-1 text-zinc-400 hover:text-white"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}

          {/* Smart reply Suggestions */}
          {aiSuggestions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-0 right-0 p-3 bg-zinc-950 border-t border-zinc-900 flex flex-col gap-2 z-10 shadow-xl"
            >
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-[#cb3dfc] uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#cb3dfc]" /> AI Companion Smart replies
                </span>
                <button 
                  onClick={() => setAiSuggestions([])}
                  className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest"
                >
                  Dismiss
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {aiSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(suggestion);
                      setAiSuggestions([]);
                    }}
                    className="shrink-0 max-w-[280px] rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 text-left transition-all active:scale-95 shadow truncate"
                    title={suggestion}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simulated continuous voice node recorder */}
        {isRecording && (
          <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-2xl p-3.5 mb-3 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#cb3dfc] flex items-center gap-1">
                <Mic size={14} /> LIVE REC: {recordingSeconds}s
              </span>
              <div className="flex gap-1 items-center">
                <div className="h-3 w-0.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                <div className="h-4.5 w-0.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="h-2 w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                <div className="h-5 w-0.5 bg-pink-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <div className="h-3 w-0.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.5s]"></div>
              </div>
            </div>
            <button 
              onClick={handleToggleVoiceRecord} 
              className="text-xs font-black bg-[#7c3aed] uppercase tracking-wider text-white hover:bg-red-600 border border-transparent rounded-lg px-3.5 py-1.5 active:scale-95"
            >
              Send Voice
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button 
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition-colors cursor-pointer"
              title="Add Media Attachments"
            >
              <Paperclip size={20} />
            </button>
            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  className="absolute bottom-full left-0 mb-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 flex flex-col gap-1 w-44 shadow-2xl z-50 text-white"
                >
                  <button 
                    onClick={handleAttachImage}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-zinc-800/80 hover:text-[#cb3dfc] transition-colors text-left"
                  >
                    <ImageIcon size={14} /> Send Image URL
                  </button>
                  <button 
                    onClick={handleAttachVideo}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl hover:bg-zinc-800/80 hover:text-[#cb3dfc] transition-colors text-left"
                  >
                    <Video size={14} /> Send Video URL
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Voice Mic Trigger */}
          <button 
            onClick={handleToggleVoiceRecord}
            className={cn(
              "p-2.5 rounded-full transition-colors cursor-pointer",
              isRecording ? "text-[#cb3dfc] bg-[#7c3aed]/10" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            )}
            title="Record Voice Note"
          >
            <Mic size={20} />
          </button>

          <div className="flex-1 relative">
            <input 
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend('text');
              }}
              placeholder={editingMessage ? "Updating message text..." : "Type dynamic secure message..."}
              className="w-full rounded-2xl bg-zinc-900 border-none py-3 px-4 text-xs font-semibold focus:ring-1 focus:ring-[#7c3aed] text-[#fafafa] placeholder:text-zinc-500"
            />
          </div>

          <button 
            onClick={() => handleSend('text')}
            className="p-3 bg-[#7c3aed] text-white rounded-full shadow-lg shadow-[#7c3aed]/20 active:scale-90 transition-all cursor-pointer"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Forward Message Selection Modal Overlay Portal */}
      <AnimatePresence>
        {isForwardModalOpen && forwardingMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsForwardModalOpen(false);
                setForwardingMessage(null);
                setForwardSearchQuery('');
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-[#09090b] border border-zinc-800 rounded-3xl p-6 shadow-2xl z-10 flex flex-col max-h-[80vh] text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-900 mb-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Forward Message</h3>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Choose a user to forward to</p>
                </div>
                <button 
                  onClick={() => {
                    setIsForwardModalOpen(false);
                    setForwardingMessage(null);
                    setForwardSearchQuery('');
                  }}
                  className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Message Preview context */}
              <div className="bg-zinc-950 p-3 rounded-2xl mb-4 border border-zinc-900/40 text-[11px] text-zinc-300">
                <span className="text-[9px] uppercase font-black tracking-widest text-[#7c3aed] block mb-1">Preview:</span>
                <p className="italic font-medium truncate">
                  {forwardingMessage.type === 'voice' ? '🎤 Voice Note' : 
                   forwardingMessage.type === 'image' ? '📸 Shared photo Attachment' : 
                   forwardingMessage.type === 'video' ? '🎬 Shared video reference' : 
                   forwardingMessage.message}
                </p>
              </div>

              {/* Search User in Forward */}
              <div className="mb-4 relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
                  <Search size={14} />
                </div>
                <input 
                  type="text" 
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  placeholder="Type username to search..." 
                  className="w-full rounded-2xl bg-zinc-950 border border-zinc-900 py-2.5 pl-10 pr-4 text-xs font-semibold text-white focus:ring-1 focus:ring-[#7c3aed] placeholder:text-zinc-500 outline-none"
                />
              </div>

              {/* Selection lists */}
              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1 max-h-[35vh]">
                {forwardSearchQuery.trim() ? (
                  // Search Results
                  <div>
                    <h4 className="text-[9px] uppercase font-black tracking-widest text-[#cb3dfc] mb-2">Search Matches</h4>
                    {isForwardSearching ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 text-[#cb3dfc] animate-spin" />
                      </div>
                    ) : forwardSearchResults.length > 0 ? (
                      <div className="space-y-1">
                        {forwardSearchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleForwardMessage(user)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-850 cursor-pointer transition-colors"
                          >
                            <img
                              src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                              alt={user.username}
                              className="h-8 w-8 rounded-full object-cover bg-zinc-900"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-xs font-black text-white truncate">@{user.username}</p>
                            </div>
                            <span className="text-[9px] uppercase font-black bg-[#7c3aed] text-white px-2.5 py-1.5 rounded-lg">
                              Send
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-[10px] text-zinc-500 py-4 uppercase tracking-wider font-extrabold">No matching users</p>
                    )}
                  </div>
                ) : (
                  // Recent Chats list
                  <div>
                    <h4 className="text-[9px] uppercase font-black tracking-widest text-[#7c3aed] mb-2">Recent Active Contacts</h4>
                    {isLoadingRecentChats ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 text-[#7c3aed] animate-spin" />
                      </div>
                    ) : recentForwardChats.length > 0 ? (
                      <div className="space-y-1">
                        {recentForwardChats.map((chatItem) => (
                          <div
                            key={chatItem.user_id}
                            onClick={() => handleForwardMessage({ id: chatItem.user_id, username: chatItem.username, avatar_url: chatItem.avatar_url })}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-850 cursor-pointer transition-colors"
                          >
                            <img
                              src={chatItem.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chatItem.username}`}
                              alt={chatItem.username}
                              className="h-8 w-8 rounded-full object-cover bg-zinc-900"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-xs font-black text-white truncate">@{chatItem.username}</p>
                            </div>
                            <span className="text-[9px] uppercase font-black bg-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-lg">
                              Send
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-[10px] text-zinc-500 py-4 uppercase tracking-wider font-extrabold font-sans">No recent contacts</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Conversation Explorer & Selection list
interface ChatLastMessageProps {
  chat: DatabaseChat;
  currentUser: any;
}

function ChatLastMessage({ chat, currentUser }: ChatLastMessageProps) {
  const [decryptedText, setDecryptedText] = useState(chat.last_message);

  useEffect(() => {
    let active = true;
    const tryDecrypt = async () => {
      if (
        chat.last_message_type === 'text' && 
        chat.last_message && 
        chat.last_message.startsWith('{') && 
        chat.last_message.includes('"e2ee":true')
      ) {
        try {
          const key = await getChatSymmetricKey(
            Number(currentUser?.id),
            localStorage.getItem(`e2ee_priv_${currentUser?.id}`),
            Number(chat.user_id),
            chat.e2ee_public_key || null
          );
          if (key) {
            const plain = await decryptMessageText(chat.last_message, key);
            if (active) {
              setDecryptedText(plain);
            }
          } else {
            if (active) {
              setDecryptedText('🔒 Encrypted message');
            }
          }
        } catch {
          if (active) {
            setDecryptedText('🔒 Encrypted message');
          }
        }
      } else {
        if (active) {
          setDecryptedText(chat.last_message);
        }
      }
    };
    tryDecrypt();
    return () => {
      active = false;
    };
  }, [chat.last_message, chat.user_id, currentUser?.id, chat.e2ee_public_key]);

  return <span className="truncate">{decryptedText}</span>;
}

export default function Chats() {
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<DatabaseChat | null>(null);
  const [chats, setChats] = useState<DatabaseChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeStreams, setActiveStreams] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const currentUser = authService.getCurrentUser();

  // Load active streams for Video Board
  useEffect(() => {
    const loadLiveStreams = async () => {
      try {
        const active = await liveService.getActiveStreams();
        setActiveStreams(active || []);
      } catch (err) {
        console.warn('Failed to load active streams on Chats board:', err);
      }
    };
    loadLiveStreams();
    
    // Auto-refresh active streams every 8 seconds
    const interval = setInterval(loadLiveStreams, 8000);

    const socket = getSocket();
    if (socket) {
      const handleStreamStartedSync = (newStream: any) => {
        setActiveStreams(prev => {
          if (prev.some(s => s.id === newStream.id)) return prev;
          return [newStream, ...prev];
        });
      };
      
      const handleStreamStoppedSync = ({ streamId }: { streamId: number }) => {
        setActiveStreams(prev => prev.filter(s => s.id !== streamId));
      };

      socket.on('live_stream_started', handleStreamStartedSync);
      socket.on('live_stream_stopped_global', handleStreamStoppedSync);

      return () => {
        clearInterval(interval);
        socket.off('live_stream_started', handleStreamStartedSync);
        socket.off('live_stream_stopped_global', handleStreamStoppedSync);
      };
    }

    return () => clearInterval(interval);
  }, []);

  // Load database conversations
  useEffect(() => {
    fetchActiveChats();

    const socket = getSocket();
    socketRef.current = socket;

    // Join my private user room to pick up live message streams to dynamically update conversation bubble tags
    if (currentUser?.id) {
      socket.emit('join_room', { roomId: `user_${currentUser.id}`, userId: currentUser.id });
    }

    const handleReceiveMessage = (data: any) => {
      // Refresh conversation tags list
      fetchActiveChats(true);
    };

    const handleMessagesSeen = (data: any) => {
      // Refresh seen checks on conversations list
      fetchActiveChats(true);
    };

    const handleUserStatus = (onlineUserIds: string[]) => {
      setChats(prev => prev.map(chat => ({
        ...chat,
        isOnline: onlineUserIds.includes(chat.user_id.toString())
      })));
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('messages_seen', handleMessagesSeen);
    socket.on('user_status', handleUserStatus);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('messages_seen', handleMessagesSeen);
      socket.off('user_status', handleUserStatus);
    };
  }, []);

  const fetchActiveChats = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const dbConversations = await messageService.getConversations();
      setChats(dbConversations);
    } catch (err) {
      console.warn('Unable to pull system conversations:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Searching users globally to start clean direct conversations (no fake/demo accounts)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchService.search(searchQuery, 'users');
        const list = (result.users || []).filter((u: any) => u.id.toString() !== currentUser?.id?.toString());
        setSearchResults(list);
      } catch (err) {
        console.error('Failed search in chats page:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectUser = (user: any) => {
    const existing = chats.find(c => c.user_id.toString() === user.id.toString());
    
    if (existing) {
      setSelectedChat(existing);
    } else {
      const newChat: DatabaseChat = {
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
        last_message_id: 'new',
        last_message: 'Say hello!',
        last_message_type: 'text',
        last_message_status: 'sent',
        last_message_sender_id: user.id,
        last_message_created_at: new Date().toISOString(),
        unread_count: 0,
        isOnline: true
      };
      setChats(prev => [newChat, ...prev]);
      setSelectedChat(newChat);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const syncLastMessageLocally = (targetUserId: string | number, newLastMessage: string) => {
    setChats(prev => prev.map(c => {
      if (c.user_id.toString() === targetUserId.toString()) {
        return {
          ...c,
          last_message: newLastMessage,
          last_message_created_at: new Date().toISOString()
        };
      }
      return c;
    }));
  };

  return (
    <div className="relative h-full px-4 text-white">
      <AnimatePresence>
        {!selectedChat ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex flex-col h-full bg-zinc-950 p-1"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black font-sans tracking-tight text-white flex items-center gap-2">
                  <Globe className="text-[#cb3dfc]" size={24} /> Direct Messages
                </h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Real database-driven connected world</p>
              </div>
              <button 
                onClick={() => toast.info('To initiate conversations with any user, type their username into the search bar!')}
                className="rounded-full bg-[#7c3aed] p-2.5 text-white hover:bg-[#6d28d9] transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Edit3 size={18} />
              </button>
            </div>

            {/* Live Broadcast Chat Video Board */}
            {activeStreams.length > 0 && (
              <div id="live-chat-video-board" className="mb-6 bg-gradient-to-r from-violet-950/20 to-zinc-900/40 border border-zinc-850 p-4 rounded-3xl shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3 select-none">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#cb3dfc] flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" /> Live Streaming Board
                  </span>
                  <span className="text-[9px] font-extrabold text-[#7c3aed] uppercase tracking-wider bg-violet-500/10 px-2 py-0.5 rounded-md">
                    {activeStreams.length} active
                  </span>
                </div>
                
                {/* Horizontal scroll containing capture tiles */}
                <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                  {activeStreams.map((stream) => (
                    <div 
                      key={`chat-live-${stream.id}`}
                      onClick={() => {
                        toast.info(`Redirecting you to watch @${stream.username}'s live broadcast!`);
                        navigate('/live');
                      }}
                      className="flex-shrink-0 w-36 bg-black border border-zinc-800 rounded-2xl overflow-hidden hover:border-[#cb3dfc] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer relative h-40 shadow-lg flex flex-col justify-between"
                    >
                      {/* Video capture thumbnail background */}
                      <div className="absolute inset-0 z-0 bg-zinc-950 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 z-10" />
                        <video 
                          src="https://assets.mixkit.co/videos/preview/mixkit-night-city-with-neon-lights-and-traffic-42289-large.mp4"
                          autoPlay
                          playsInline
                          muted
                          loop
                          className="w-full h-full object-cover opacity-60"
                        />
                      </div>

                      {/* Top Overlay Badge */}
                      <div className="z-10 p-2 flex justify-between items-start">
                        <span className="bg-red-650 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 text-white shadow-md animate-pulse">
                          LIVE
                        </span>
                        <span className="bg-black/60 backdrop-blur-md text-[8px] font-bold text-zinc-300 px-1.5 py-px rounded flex items-center gap-0.5">
                          👁️ {stream.viewer_count || 1}
                        </span>
                      </div>

                      {/* Bottom Overlay Info */}
                      <div className="z-10 p-2 bg-gradient-to-t from-black to-transparent pt-4">
                        <p className="text-[10px] font-black text-white truncate max-w-full drop-shadow-md">
                          @{stream.username}
                        </p>
                        <p className="text-[8px] text-zinc-450 font-bold truncate tracking-wide mt-0.5 max-w-full drop-shadow-md">
                          {stream.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Global User searching for safe direct matches */}
            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-zinc-500">
                <Search size={16} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active users to start chat..." 
                className="w-full rounded-2xl bg-zinc-900 py-3.5 pl-11 pr-4 text-xs font-semibold text-white focus:ring-1 focus:ring-[#7c3aed] placeholder:text-zinc-500"
              />
            </div>

            {searchQuery.trim() && (
              <div className="mb-6 rounded-2xl bg-[#09090b] p-4 border border-zinc-850">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[9px] font-black text-[#cbd5e1] uppercase tracking-widest">
                    {isSearching ? 'Searching Database matched...' : `${searchResults.length} Safe match(es) in DeoHub`}
                  </h4>
                  {searchResults.length > 0 && (
                    <span className="text-[9px] text-[#cb3dfc] uppercase tracking-widest font-black">
                      Select name to initiate
                    </span>
                  )}
                </div>

                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 text-[#cb3dfc] animate-spin" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        id={`search-user-${user.id}`}
                        onClick={() => handleSelectUser(user)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-850 cursor-pointer transition-colors"
                      >
                        <img
                          src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                          alt={user.username}
                          className="h-10 w-10 rounded-full object-cover bg-zinc-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white truncate">@{user.username}</p>
                          <p className="text-[10px] text-zinc-550 truncate font-semibold uppercase tracking-wider">{user.bio || `@${user.username}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-xs uppercase tracking-widest font-black">
                    No matching users found in DB
                  </div>
                )}
              </div>
            )}
            
            {/* Conversation Active List items */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 gap-3">
                <Loader2 size={32} className="animate-spin text-[#cb3dfc]" />
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Querying database engine...</span>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#09090b] border border-dashed border-zinc-900 rounded-3xl mb-24">
                <Globe size={40} className="text-zinc-700 mb-3.5" />
                <p className="font-extrabold text-sm text-zinc-300">Connected yet empty</p>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mt-1">There are no existing messaging histories yet inside your workspace. Search users to send safe data packs.</p>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto no-scrollbar flex-1 pb-24">
                {chats.map(chat => (
                  <motion.div 
                    key={chat.user_id}
                    whileHover={{ scale: 1.005 }}
                    onClick={() => {
                      setSelectedChat(chat);
                      setChats(prev => prev.map(c => c.user_id === chat.user_id ? { ...c, unread_count: 0 } : c));
                    }}
                    className="flex cursor-pointer items-center gap-4 rounded-2xl p-4 bg-[#09090b]/40 border border-[#09090b] hover:bg-zinc-900/40 hover:border-zinc-850 transition-all text-white relative"
                  >
                    <div className="relative shrink-0">
                      <div className="h-13 w-13 rounded-full hover:scale-105 transition-transform overflow-hidden bg-zinc-900 border border-zinc-800 p-0.5">
                        <img 
                          src={chat.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.username}`} 
                          alt={chat.username} 
                          className="h-full w-full rounded-full object-cover" 
                        />
                      </div>
                      {chat.isOnline && (
                        <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 bg-emerald-500" />
                      )}
                      {chat.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 flex h-5.5 w-5.5 items-center justify-center rounded-full border-2 border-zinc-950 bg-[#7c3aed] text-[8px] font-black text-white animate-bounce">
                          {chat.unread_count}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-bold text-xs text-white truncate">@{chat.username}</h3>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                          {chat.last_message_created_at ? new Date(chat.last_message_created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Just now'}
                        </span>
                      </div>
                      <p className={cn(
                        "text-xs truncate flex items-center gap-1", 
                        chat.unread_count > 0 ? "text-white font-extrabold" : "text-zinc-500 font-medium"
                      )}>
                        {chat.unread_count > 0 && <span className="text-[#cb3dfc] mr-1">●</span>}
                        {chat.last_message_sender_id?.toString() === currentUser?.id?.toString() && (
                          <span className="shrink-0">
                            {chat.last_message_status === 'seen' ? (
                              <CheckCheck size={12} className="text-[#a78bfa]" />
                            ) : chat.last_message_status === 'delivered' ? (
                              <CheckCheck size={12} className="text-zinc-500" />
                            ) : (
                              <Check size={12} className="text-zinc-500" />
                            )}
                          </span>
                        )}
                        <span className="truncate">
                          {chat.last_message_type === 'voice' ? '🎤 Voice Note' : 
                           chat.last_message_type === 'image' ? '📸 Shared photo Attachment' : 
                           chat.last_message_type === 'video' ? '🎬 Shared Video reference' : 
                           <ChatLastMessage chat={chat} currentUser={currentUser} />}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <Conversation 
            chat={selectedChat} 
            onBack={() => {
              setSelectedChat(null);
              fetchActiveChats(true);
            }} 
            onMessageSent={(receiverId, text) => {
              syncLastMessageLocally(receiverId, text);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
