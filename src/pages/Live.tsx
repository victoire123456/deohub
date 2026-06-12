import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, 
  Tv, 
  Users, 
  Layers, 
  Heart, 
  MessageCircle, 
  Video, 
  VideoOff, 
  Send, 
  VolumeX, 
  Volume2, 
  StopCircle, 
  Sparkles, 
  X, 
  Flame, 
  ThumbsUp, 
  Laugh, 
  Lightbulb, 
  Clock, 
  User, 
  Wifi, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { authService } from '../lib/authService';
import { liveService } from '../lib/liveService';
import { postsService } from '../lib/postsService';
import { getSocket } from '../lib/socket';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface LiveStream {
  id: number;
  user_id: number;
  title: string;
  status: 'active' | 'ended';
  viewer_count: number;
  created_at: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
}

interface LiveComment {
  id: number;
  live_stream_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

interface FloatingEmoji {
  id: number;
  type: string;
  left: number;
}

export default function Live() {
  const currentUser = authService.getCurrentUser();
  const socket = getSocket();

  // Streams lists
  const [activeStreams, setActiveStreams] = useState<LiveStream[]>([]);
  const [historyStreams, setHistoryStreams] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Streaming state
  const [currentSession, setCurrentSession] = useState<LiveStream | null>(null);
  const [isHosting, setIsHosting] = useState(false);
  const isHostingRef = useRef(false);

  useEffect(() => {
    isHostingRef.current = isHosting;
  }, [isHosting]);

  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const emojiIdCounter = useRef(0);

  // Creator Webcam controls
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Start Stream Modal Form
  const [showStartModal, setShowStartModal] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [isStartingStream, setIsStartingStream] = useState(false);

  // Fetch all streams
  const loadStreams = async () => {
    try {
      setIsLoading(true);
      const active = await liveService.getActiveStreams();
      const history = await liveService.getLiveHistory();
      setActiveStreams(Array.isArray(active) ? active : []);
      setHistoryStreams(Array.isArray(history) ? history : []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load live streams data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();

    // Listen for global streams events
    if (socket) {
      socket.on('live_stream_started', (newStream: LiveStream) => {
        setActiveStreams(prev => {
          if (prev.some(s => s.id === newStream.id)) return prev;
          return [newStream, ...prev];
        });
        toast.info(`🔴 ${newStream.username} just went LIVE: "${newStream.title}"!`);
      });

      socket.on('live_stream_stopped_global', ({ streamId }: { streamId: number }) => {
        setActiveStreams(prev => prev.filter(s => s.id !== streamId));
      });
    }

    return () => {
      if (socket) {
        socket.off('live_stream_started');
        socket.off('live_stream_stopped_global');
      }
    };
  }, [socket]);

  // Handle camera streamer permissions
  const startCamera = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
      setMicEnabled(true);
    } catch (err) {
      console.warn('Camera stream permission error (normal for servers without client devices):', err);
      toast.warning('No camera device detected or permission denied. Starting stream in card mode.');
      setLocalStream(null);
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Socket triggers inside stream room
  useEffect(() => {
    if (!currentSession || !socket) return;

    // Join room
    socket.emit('join_live', { streamId: currentSession.id, userId: currentUser?.id });
    setViewerCount(currentSession.viewer_count || 1);

    // Fetch comments
    liveService.getComments(currentSession.id)
      .then(res => setComments(res || []))
      .catch(err => console.error(err));

    // Listen room events
    socket.on('live_comment_received', (newComment: LiveComment) => {
      setComments(prev => [...prev, newComment]);
    });

    socket.on('live_reaction_received', (data: { reactionType: string }) => {
      triggerFloatingEmoji(data.reactionType);
    });

    socket.on('live_viewers_update', (data: { streamId: number, count: number }) => {
      if (data.streamId === currentSession.id) {
        setViewerCount(data.count);
      }
    });

    socket.on('viewer_count_updated', (data: { streamId: number, count: number }) => {
      if (data.streamId === currentSession.id) {
        setViewerCount(data.count);
      }
    });

    socket.on('live_stream_ended', () => {
      if (!isHostingRef.current) {
        toast.error('The host has ended this live stream session');
      } else {
        toast.success('Your live stream has ended.');
      }
      stopCamera();
      setCurrentSession(null);
      setIsHosting(false);
      loadStreams();
    });

    return () => {
      socket.emit('leave_live', { streamId: currentSession.id, userId: currentUser?.id });
      socket.off('live_comment_received');
      socket.off('live_reaction_received');
      socket.off('live_viewers_update');
      socket.off('viewer_count_updated');
      socket.off('live_stream_ended');
    };
  }, [currentSession, socket]);

  // Floating reactions logic
  const triggerFloatingEmoji = (type: string) => {
    const id = emojiIdCounter.current++;
    const left = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingEmojis(prev => [...prev, { id, type, left }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 2000);
  };

  // Host start stream action
  const handleHostStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamTitle.trim()) {
      toast.error('Please enter a live stream title');
      return;
    }

    try {
      setIsStartingStream(true);
      const newStream = await liveService.startStream(streamTitle);
      setCurrentSession(newStream);
      setIsHosting(true);
      setShowStartModal(false);
      setStreamTitle('');
      toast.success('🎉 You are now LIVE! Followers notified.');
      
      // Start camera capture
      await startCamera();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize live stream');
    } finally {
      setIsStartingStream(false);
    }
  };

  // Stop stream action
  const handleStopStream = async () => {
    if (!currentSession) return;
    const confirmStop = window.confirm("Are you sure you want to stop this live stream?");
    if (!confirmStop) return;

    try {
      await liveService.stopStream(currentSession.id);
      stopCamera();
      toast.success('Live stream ended successfully');
      setCurrentSession(null);
      setIsHosting(false);
      loadStreams();
    } catch (err: any) {
      toast.error('Failed to stop live stream: ' + err.message);
    }
  };

  // Join live stream viewer action
  const handleJoinStream = (stream: LiveStream) => {
    setCurrentSession(stream);
    setIsHosting(false);
    toast.success(`Connected to stream: ${stream.title}`);
  };

  // Exit stream view returning to feed
  const handleExitSession = () => {
    if (isHosting) {
      handleStopStream();
    } else {
      stopCamera();
      setCurrentSession(null);
      loadStreams();
    }
  };

  // Send a comment action
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentSession) return;

    try {
      await liveService.addComment(currentSession.id, commentInput);
      setCommentInput('');
    } catch (err: any) {
      toast.error(err.message || 'Could not post comment');
    }
  };

  // Client reaction action
  const handlePostReaction = async (type: string) => {
    if (!currentSession) return;
    try {
      // Optimizely animate locally for immediate feeling
      triggerFloatingEmoji(type);
      await liveService.addReaction(currentSession.id, type);
    } catch (err) {
      // Silent error
    }
  };

  const getEmojiCharacter = (type: string) => {
    switch (type) {
      case 'heart': return '❤️';
      case 'fire': return '🔥';
      case 'laugh': return '😂';
      case 'like': return '👍';
      case 'insight': return '💡';
      default: return '❤️';
    }
  };

  // If inside an active live session streamer/viewer
  if (currentSession) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white px-2 py-4 md:px-6">
        {/* Session Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 border-b border-zinc-850 pb-4 select-none">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExitSession}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer group flex items-center justify-center gap-2 border border-zinc-800 text-sm font-bold text-zinc-300 hover:text-white"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 animate-pulse text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Wifi size={10} /> Live
                </span>
                <h1 className="text-lg md:text-xl font-black tracking-tight">{currentSession.title}</h1>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <User size={12} className="text-violet-400" /> 
                <span className="font-bold text-zinc-200">{currentSession.username}</span> 
                {currentSession.is_verified && <span className="text-sky-400">✓</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <div className="flex items-center gap-1 bg-red-600/10 border border-red-600/30 rounded-xl px-3.5 py-1.5 text-xs font-bold text-red-500">
              <Users size={14} />
              <span>{viewerCount} watching</span>
            </div>
            {isHosting ? (
              <button
                onClick={handleStopStream}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/20 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <StopCircle size={14} />
                <span>End Stream</span>
              </button>
            ) : (
              <button
                onClick={handleExitSession}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 transition-all cursor-pointer"
              >
                Leave Stream
              </button>
            )}
          </div>
        </div>

        {/* Streaming Main Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
          {/* Main Visual Frame */}
          <div className="lg:col-span-2 bg-black border border-zinc-850 rounded-3xl relative overflow-hidden flex flex-col justify-between items-stretch group h-[50vh] lg:h-full shadow-2xl">
            {/* Stream Canvas Representation */}
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-gradient-to-tr from-[#0c051a] to-[#04010a]">
              {isHosting && localStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Dynamic moving visualization overlay for active stream view model */
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden relative">
                  {/* Atmospheric neon waves */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#7c3aed]/10 blur-3xl animate-pulse" />
                  
                  <div className="z-10 flex flex-col items-center justify-center max-w-sm">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#bfdbfe] p-[2px] mb-4 animate-spin-slow">
                      <div className="h-full w-full rounded-full bg-black/80 flex items-center justify-center border border-zinc-900">
                        <Radio size={36} className="text-[#cb3dfc] animate-pulse" />
                      </div>
                    </div>
                    <p className="text-md font-black tracking-wide bg-gradient-to-r from-violet-400 to-fuchsia-300 bg-clip-text text-transparent">
                      {isHosting ? 'Starting Webcam Feed...' : `Streaming: ${currentSession.username}`}
                    </p>
                    <p className="text-xs text-zinc-500 max-w-xs mt-2 leading-relaxed">
                      {isHosting 
                        ? 'Broadcasting microphone and camera signals securely across Neon WebSocket relays'
                        : 'Simulated high-fidelity media transport active. Type comments and click reactions to interact in real time!'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom floating reactions particle container */}
            <div className="absolute bottom-16 right-4 w-24 h-64 z-20 pointer-events-none overflow-hidden">
              <AnimatePresence>
                {floatingEmojis.map((emoji) => (
                  <motion.div
                    key={emoji.id}
                    initial={{ y: 200, opacity: 1, scale: 0.8 }}
                    animate={{ 
                      y: -100, 
                      opacity: 0, 
                      scale: 1.4,
                      x: Math.sin(emoji.id) * 30 
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.8, ease: 'easeOut' }}
                    style={{ left: `${emoji.left}%` }}
                    className="absolute text-3xl drop-shadow-xl"
                  >
                    {getEmojiCharacter(emoji.type)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Webcam / Mic control toggles overlay for host */}
            {isHosting && (
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-zinc-800 p-1.5 rounded-2xl select-none">
                <button
                  onClick={toggleCamera}
                  className={cn(
                    "p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center border",
                    cameraEnabled 
                      ? "bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-white" 
                      : "bg-red-600 border-red-500 text-white animate-pulse"
                  )}
                  title={cameraEnabled ? "Disable Video" : "Enable Video"}
                >
                  {cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
                <button
                  onClick={toggleMic}
                  className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-white transition-all cursor-pointer flex items-center justify-center"
                  title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {micEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-red-400" />}
                </button>
              </div>
            )}

            {/* Viewer Live Interaction toolbar inside media box (Bottom Right overlay) */}
            {!isHosting && (
              <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-zinc-800 p-2 rounded-2xl select-none">
                <button 
                  onClick={() => handlePostReaction('like')}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 transition-transform active:scale-125 cursor-pointer text-xl"
                  title="Like"
                >
                  👍
                </button>
                <button 
                  onClick={() => handlePostReaction('heart')}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 transition-transform active:scale-125 cursor-pointer text-xl"
                  title="Love"
                >
                  ❤️
                </button>
                <button 
                  onClick={() => handlePostReaction('laugh')}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 transition-transform active:scale-125 cursor-pointer text-xl"
                  title="Laugh"
                >
                  😂
                </button>
                <button 
                  onClick={() => handlePostReaction('fire')}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 transition-transform active:scale-125 cursor-pointer text-xl"
                  title="Fire"
                >
                  🔥
                </button>
                <button 
                  onClick={() => handlePostReaction('insight')}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 transition-transform active:scale-125 cursor-pointer text-xl"
                  title="Bulb"
                >
                  💡
                </button>
              </div>
            )}
          </div>

          {/* Scrolling Live Chat comments area */}
          <div className="bg-[#18181b] border border-zinc-850 rounded-3xl p-4 flex flex-col justify-between h-[45vh] lg:h-full select-text shadow-2xl relative">
            <div className="border-b border-zinc-800/80 pb-3 mb-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#cb3dfc] flex items-center gap-1.5">
                <MessageCircle size={12} /> Live stream Chat
              </span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Synced via rel_stream
              </span>
            </div>

            {/* Scrolling List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1 scrollbar-thin">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-2">
                    💬
                  </div>
                  <p className="text-xs font-bold text-zinc-400">Welcome to the stream chat!</p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Say hello to the broadcaster and keep the conversation friendly.</p>
                </div>
              ) : (
                comments.map((comment, index) => (
                  <motion.div 
                    key={comment.id ? `live-comment-${comment.id}` : `live-comment-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5 text-xs select-text"
                  >
                    <img 
                      src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`} 
                      className="h-8 w-8 rounded-full bg-zinc-950 object-cover border border-zinc-850" 
                      alt="avatar" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-300 truncate leading-tight flex items-center gap-1">
                        {comment.username}
                        {comment.user_id === currentSession.user_id && (
                          <span className="text-[8px] bg-violet-600/20 text-violet-400 border border-violet-500/20 px-1 py-0.2 rounded font-black uppercase tracking-widest leading-none scale-90">Host</span>
                        )}
                      </p>
                      <p className="text-zinc-200 mt-1 whitespace-pre-wrap breakdown-all select-text leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Comment Post Footer input form */}
            <form onSubmit={handleSendComment} className="pt-3 border-t border-zinc-800/80 mt-3 flex items-center gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Send a chat message..."
                maxLength={450}
                className="flex-1 rounded-xl bg-zinc-950 border border-zinc-850 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#7c3aed]/50 hover:border-zinc-800 transition-colors"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-brand font-bold text-white shadow-lg shadow-violet-900/10 hover:opacity-95 cursor-pointer active:scale-95 transition-all flex items-center justify-center hover:bg-violet-600"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const myActiveStream = Array.isArray(activeStreams) ? activeStreams.find(
    (s) => String(s.user_id) === String(currentUser?.id) && s.status === 'active'
  ) : undefined;

  // Otherwise, default to Live Streams list hub dashboard
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="px-4 text-white"
    >
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-2xl font-black font-sans tracking-tight text-white flex items-center gap-2">
            <Radio className="text-[#cb3dfc] animate-pulse" size={24} /> Live Broadcaster
          </h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Browse active broadcast panels or stream live to your followers
          </p>
        </div>
        {myActiveStream ? (
          <button 
            onClick={async () => {
              const confirmStop = window.confirm("Are you sure you want to stop your active live stream?");
              if (!confirmStop) return;
              try {
                await liveService.stopStream(myActiveStream.id);
                toast.success('Your live stream has ended.');
                loadStreams();
              } catch (err: any) {
                toast.error('Failed to stop live stream: ' + err.message);
              }
            }}
            className="py-3 px-5 rounded-xl bg-red-650 hover:bg-red-700 font-black uppercase text-xs tracking-wider text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-950/20 border border-red-500"
          >
            <StopCircle size={16} /> STOP LIVE
          </button>
        ) : (
          <button 
            onClick={() => setShowStartModal(true)}
            className="py-3 px-5 rounded-xl bg-brand border border-transparent font-black uppercase text-xs tracking-wider text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-violet-900/20"
          >
            <Video size={16} /> GO LIVE NOW
          </button>
        )}
      </div>

      {myActiveStream && (
        <div className="mb-6 p-4 rounded-3xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-red-500">🔴 You are Currently Live</p>
              <h4 className="text-sm font-bold text-zinc-200 mt-1 truncate max-w-xs md:max-w-md">&quot;{myActiveStream.title}&quot;</h4>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => handleJoinStream(myActiveStream)}
              className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer active:scale-95 text-center"
            >
              Resume Stream
            </button>
            <button
              onClick={async () => {
                const confirmStop = window.confirm("Are you sure you want to stop your active live stream?");
                if (!confirmStop) return;
                try {
                  await liveService.stopStream(myActiveStream.id);
                  toast.success('Your live stream has ended.');
                  loadStreams();
                } catch (err: any) {
                  toast.error('Failed to stop live stream: ' + err.message);
                }
              }}
              className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-red-650 hover:bg-red-700 font-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer active:scale-95 text-center"
            >
              Stop Live
            </button>
          </div>
        </div>
      )}

      {/* Main content split */}
      <div className="space-y-8 pb-20">
        
        {/* ACTIVE STREAMS SECTION */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#7c3aed] mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" /> Active Streams
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-zinc-850 bg-zinc-900/20 rounded-3xl">
              <Loader2 size={32} className="animate-spin text-[#cb3dfc]" />
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Querying Neon DB...</span>
            </div>
          ) : activeStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-zinc-850/60 bg-[#18181b]/30 rounded-3xl text-center">
              <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-500 mb-3 text-2xl">
                📺
              </div>
              <p className="text-xs font-black text-zinc-400">No active streams right now</p>
              <p className="text-[10px] text-zinc-500 mt-1 max-w-sm px-4">
                Be the first to step into the spotlight! Click the &quot;Go Live Now&quot; button to launch your live stream with real-time follows routing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeStreams.map((stream) => (
                <div 
                  key={stream.id}
                  className="bg-[#18181b]/80 border border-zinc-850 rounded-3xl overflow-hidden hover:border-[#7c3aed]/40 transition-colors flex flex-col justify-between group shadow-lg"
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div className="flex items-center gap-2.5 text-xs font-bold">
                        <img 
                          src={stream.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.username}`}
                          className="h-9 w-9 rounded-full bg-zinc-950 object-cover border border-zinc-800"
                          alt="stream avatar"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-zinc-100 font-bold truncate flex items-center gap-1">
                            {stream.username}
                            {stream.is_verified && <span className="text-sky-400">✓</span>}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Host</p>
                        </div>
                      </div>
                      <span className="bg-red-600/10 border border-red-500/30 text-red-500 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> {stream.viewer_count} watching
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white group-hover:text-violet-400 transition-colors line-clamp-2 leading-relaxed">
                      {stream.title}
                    </h4>
                  </div>

                  <div className="bg-zinc-900/60 p-4 border-t border-zinc-850/60 flex items-center justify-between">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                      Started {new Date(stream.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleJoinStream(stream)}
                      className="py-1.5 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-[10px] uppercase tracking-widest text-white transition-all cursor-pointer shadow-sm shadow-violet-950/20 active:scale-95 flex items-center gap-1"
                    >
                      <span>Join Room</span>
                      <ChevronRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RECENT STREAM HISTORIES LOG SECTION */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[#7c3aed] mb-4 flex items-center gap-1">
            <Clock size={14} className="text-[#cb3dfc]" /> Broadcast History Log
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 size={24} className="animate-spin text-zinc-650" />
            </div>
          ) : historyStreams.filter(s => s.status === 'ended').length === 0 ? (
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest italic text-center py-6">No historical records in the archive logs yet.</p>
          ) : (
            <div className="bg-[#18181b]/30 border border-zinc-850/60 rounded-3xl p-4 overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-zinc-850 text-zinc-500 text-[9px] uppercase font-black tracking-widest pb-3">
                    <th className="pb-3 pl-2">Stream Title</th>
                    <th className="pb-3">Broadcaster</th>
                    <th className="pb-3">Session Date</th>
                    <th className="pb-3">Final Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/40">
                  {historyStreams.filter(s => s.status === 'ended').map((stream) => (
                    <tr key={`history-${stream.id}`} className="hover:bg-zinc-900/10 transition-colors">
                      <td className="py-3.5 pl-2 font-bold text-zinc-200">{stream.title}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <img 
                            src={stream.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.username}`}
                            className="h-5.5 w-5.5 rounded-full bg-zinc-950 border border-zinc-800"
                            alt="host"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-bold text-zinc-300">{stream.username}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-zinc-400">
                        {new Date(stream.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5">
                        <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/60 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                          ENDED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL WINDOW FOR STREAM CREATION SETUP */}
      <AnimatePresence>
        {showStartModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStartModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-3xl p-6 text-white shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-850 mb-5">
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white p-1 rounded-md flex items-center justify-center">
                    <Video size={14} />
                  </span>
                  <span className="font-black uppercase tracking-wider text-sm">Configure Broadcast</span>
                </div>
                <button 
                  onClick={() => setShowStartModal(false)}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleHostStart} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] block mb-2">Live stream Title</label>
                  <input
                    type="text"
                    required
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="e.g. Exploring database scaling or chill chatting session!"
                    maxLength={100}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-850 px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#7c3aed]/50 hover:border-zinc-800 transition-colors"
                  />
                  <p className="text-[9px] text-zinc-500 mt-1.5">This description will be broadcasted to your followers alongside standard alert notifications.</p>
                </div>

                <div className="p-3 bg-violet-600/5 border border-violet-500/10 rounded-xl">
                  <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={10} /> Live broadcasting sync
                  </p>
                  <p className="text-[9px] text-zinc-400 mt-1 max-w-xs select-none">
                    Going live creates an interactive room, starts camera detection (if available), and automatically notifies followers via real-time socket updates.
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-850 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowStartModal(false)}
                    className="flex-1 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 font-bold text-xs uppercase tracking-wider text-zinc-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isStartingStream}
                    className="flex-1 py-3.5 rounded-xl bg-brand font-black text-xs uppercase tracking-wider text-white shadow-lg shadow-violet-900/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    {isStartingStream ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <Wifi size={12} className="animate-pulse" />
                        <span>Go Live Now</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
