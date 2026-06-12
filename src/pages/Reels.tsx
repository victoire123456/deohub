import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, Music, Volume2, VolumeX, Plus, Send, X, ArrowLeft, Award, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { reelsService } from '../lib/reelsService';
import { authService } from '../lib/authService';
import { geminiService } from '../lib/geminiService';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../lib/socket';

interface Reel {
  id: number;
  user_id: number;
  video_url: string;
  caption: string;
  created_at: string;
  username: string;
  avatar_url: string;
  like_count: string | number;
  comment_count: string | number;
  is_liked: boolean;
}

interface Comment {
  id: number;
  reel_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string;
  like_count?: number;
  is_liked?: boolean;
}

export default function Reels() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'following'>('trending');
  const [isMuted, setIsMuted] = useState(true);
  const [followedUsers, setFollowedUsers] = useState<Record<number, boolean>>({});
  
  // Comments Drawer State
  const [activeCommentsReelId, setActiveCommentsReelId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentsSortOrder, setCommentsSortOrder] = useState<'recent' | 'liked'>('recent');

  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    loadReels();

    const socket = getSocket();

    const handleReelCreated = (newReel: any) => {
      setReels(prev => {
        if (prev.some(r => r.id === newReel.id)) return prev;
        return [newReel, ...prev];
      });
    };

    const handleReelLikeUpdated = (data: { reelId: number; likeCount: number; liked: boolean; userId: number }) => {
      setReels(prev => prev.map(r => {
        if (r.id === data.reelId) {
          return {
            ...r,
            like_count: data.likeCount,
            is_liked: data.userId === currentUser?.id ? data.liked : r.is_liked
          };
        }
        return r;
      }));
    };

    const handleReelCommentCreated = (data: { reelId: number; comment: any; commentCount: number }) => {
      setReels(prev => prev.map(r => {
        if (r.id === data.reelId) {
          return {
            ...r,
            comment_count: data.commentCount
          };
        }
        return r;
      }));

      setComments(prev => {
        if (data.reelId === activeCommentsReelId) {
          if (prev.some(c => String(c.id) === String(data.comment.id))) return prev;
          return [...prev, data.comment];
        }
        return prev;
      });
    };

    socket.on('reel_created', handleReelCreated);
    socket.on('reel_like_updated', handleReelLikeUpdated);
    socket.on('reel_comment_created', handleReelCommentCreated);

    return () => {
      socket.off('reel_created', handleReelCreated);
      socket.off('reel_like_updated', handleReelLikeUpdated);
      socket.off('reel_comment_created', handleReelCommentCreated);
    };
  }, [currentUser?.id, activeCommentsReelId]);

  const loadReels = async () => {
    setIsLoading(true);
    try {
      const data = await reelsService.getReels();
      setReels(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch reels.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async (reelId: number) => {
    const backupReels = [...reels];
    
    // Instantly apply change in UI optimistically
    setReels(prev => prev.map(reel => {
      if (reel.id === reelId) {
        const nextIsLiked = !reel.is_liked;
        const currentCount = typeof reel.like_count === 'string' ? parseInt(reel.like_count, 10) : Number(reel.like_count || 0);
        return {
          ...reel,
          is_liked: nextIsLiked,
          like_count: nextIsLiked ? currentCount + 1 : Math.max(0, currentCount - 1)
        };
      }
      return reel;
    }));

    try {
      const result = await reelsService.toggleLike(reelId);
      setReels(prev => prev.map(reel => {
        if (reel.id === reelId) {
          return {
            ...reel,
            is_liked: result.liked,
            like_count: result.like_count
          };
        }
        return reel;
      }));
    } catch (err: any) {
      // Revert if API request fails
      setReels(backupReels);
      toast.error(err.message || 'Failed to toggle like');
    }
  };

  const handleToggleFollow = (userId: number, username: string) => {
    setFollowedUsers(prev => {
      const isNext = !prev[userId];
      toast.success(isNext ? `Following @${username}` : `Unfollowed @${username}`);
      return { ...prev, [userId]: isNext };
    });
  };

  const handleOpenComments = async (reelId: number) => {
    setActiveCommentsReelId(reelId);
    setIsCommentsLoading(true);
    try {
      const commentsList = await reelsService.getComments(reelId);
      setComments(commentsList);
    } catch (err: any) {
      toast.error('Failed to load comments');
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const handleToggleCommentLike = async (commentId: number) => {
    try {
      const result = await reelsService.toggleCommentLike(commentId);
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            is_liked: result.liked,
            like_count: result.like_count
          };
        }
        return c;
      }));
      toast.success(result.liked ? 'Comment liked! 💜' : 'Comment unliked');
    } catch (err: any) {
      toast.error('Failed to toggle comment like');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentsReelId || !newComment.trim()) return;

    try {
      const commentRes = await reelsService.addComment(activeCommentsReelId, newComment);
      setComments(prev => [...prev, commentRes]);
      setNewComment('');
      
      // Update comment count on parent reel
      setReels(prev => prev.map(r => {
        if (r.id === activeCommentsReelId) {
          return { ...r, comment_count: parseInt(r.comment_count as string) + 1 };
        }
        return r;
      }));
    } catch (err: any) {
      toast.error('Failed to post comment');
    }
  };

  const handleShare = (reelId: number) => {
    navigator.clipboard.writeText(`${window.location.origin}/reels?id=${reelId}`);
    toast.success('Reel link copied to clipboard! 🌟');
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (commentsSortOrder === 'liked') {
      const likesA = a.like_count || 0;
      const likesB = b.like_count || 0;
      if (likesA !== likesB) {
        return likesB - likesA;
      }
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-80px)] bg-black overflow-hidden relative text-white rounded-2xl md:border md:border-zinc-800">
      
      {/* Header Tabs */}
      <div className="absolute top-4 left-0 right-0 z-30 flex justify-between items-center px-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors">
          <ArrowLeft size={20} />
        </button>

        <div className="flex bg-black/40 backdrop-blur-md p-1 rounded-full border border-zinc-800/80">
          <button 
            onClick={() => setActiveTab('trending')}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              activeTab === 'trending' ? "bg-brand text-white" : "text-zinc-400 hover:text-white"
            )}
          >
            <TrendingUp size={14} />
            Trending
          </button>
          <button 
            onClick={() => setActiveTab('following')}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              activeTab === 'following' ? "bg-brand text-white" : "text-zinc-400 hover:text-white"
            )}
          >
            <Sparkles size={14} />
            Following
          </button>
        </div>

        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
        >
          {isMuted ? <VolumeX size={20} className="text-red-400" /> : <Volume2 size={20} />}
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tuning Reels Engine...</span>
        </div>
      ) : reels.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <Award size={48} className="text-brand mb-4 animate-bounce" />
          <h3 className="text-lg font-bold">No Reels Created Yet</h3>
          <p className="text-sm text-zinc-500 max-w-xs mt-1">Be the very first elite creator to upload a loop on DeoHub!</p>
          <button 
            onClick={() => navigate('/upload')}
            className="mt-6 px-6 py-2.5 rounded-full bg-brand font-bold text-sm tracking-wider uppercase hover:opacity-90 transition-all font-sans"
          >
            Create Reel
          </button>
        </div>
      ) : (
        <div className="flex-1 snap-y snap-mandatory overflow-y-scroll h-full w-full scrollbar-none">
          {reels.map((reel) => (
            <ReelCard 
              key={reel.id} 
              reel={reel} 
              isMuted={isMuted} 
              isFollowed={!!followedUsers[reel.user_id]}
              onLike={() => handleToggleLike(reel.id)}
              onFollow={() => handleToggleFollow(reel.user_id, reel.username)}
              onOpenComments={() => handleOpenComments(reel.id)}
              onShare={() => handleShare(reel.id)}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* Dynamic Comments Drawer overlay */}
      <AnimatePresence>
        {activeCommentsReelId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCommentsReelId(null)}
              className="absolute inset-0 bg-black z-40"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 h-[65%] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 flex flex-col z-50 shadow-2xl animate-none"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h4 className="font-extrabold uppercase tracking-widest text-sm text-brand flex items-center gap-1.5">
                  <MessageCircle size={18} /> Remarks ({comments.length})
                </h4>

                {/* Sort Toggle */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider shadow-inner ml-auto mr-3">
                  <button
                    type="button"
                    onClick={() => setCommentsSortOrder('recent')}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      commentsSortOrder === 'recent'
                        ? "bg-brand text-white font-black"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Recent
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentsSortOrder('liked')}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all",
                      commentsSortOrder === 'liked'
                        ? "bg-brand text-white font-black"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Most Liked
                  </button>
                </div>

                <button 
                  onClick={() => setActiveCommentsReelId(null)} 
                  className="p-1 rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 select-text">
                {isCommentsLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : sortedComments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                    <p className="font-bold text-sm">Silence is loud here</p>
                    <p className="text-xs">Be the first to leave a comment!</p>
                  </div>
                ) : (
                  sortedComments.map((comment, index) => (
                    <div key={comment.id ? `reel-comment-${comment.id}-${index}` : `reel-comment-idx-${index}`} className="flex gap-3 justify-between items-start">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <img 
                          src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`} 
                          alt={comment.username}
                          className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-900 object-cover flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-1.5">
                            <span className="font-black text-xs hover:underline cursor-pointer">@{comment.username}</span>
                            <span className="text-[9px] text-zinc-500 font-bold uppercase flex-shrink-0">
                              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-1 selection:bg-brand/30 leading-relaxed bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/40 whitespace-pre-wrap break-words">{comment.content}</p>
                        </div>
                      </div>

                      {/* Comment Liking heart Column */}
                      <div className="flex flex-col items-center justify-center pl-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleCommentLike(comment.id)}
                          className={cn(
                            "p-1.5 rounded-full transition-all hover:scale-110",
                            comment.is_liked ? "text-rose-500" : "text-zinc-500 hover:text-rose-400"
                          )}
                        >
                          <Heart size={14} fill={comment.is_liked ? "currentColor" : "none"} strokeWidth={comment.is_liked ? 0 : 2} />
                        </button>
                        {comment.like_count !== undefined && comment.like_count > 0 && (
                          <span className="text-[9px] text-zinc-400 font-black">
                            {comment.like_count}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Write Comments form */}
              <form onSubmit={handlePostComment} className="flex gap-2 items-center mt-2 border-t border-zinc-900 pt-3">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..." 
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2.5 text-xs focus:ring-1 focus:ring-brand outline-none text-white placeholder:text-zinc-500"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim()}
                  className="p-2.5 rounded-full bg-brand hover:opacity-90 text-white disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

// Reel Card Snap Block
function ReelCard({ 
  reel, 
  isMuted, 
  isFollowed,
  onLike, 
  onFollow, 
  onOpenComments, 
  onShare,
  currentUser 
}: { 
  key?: any;
  reel: Reel;
  isMuted: boolean;
  isFollowed: boolean;
  onLike: () => any;
  onFollow: () => any;
  onOpenComments: () => any;
  onShare: () => any;
  currentUser: any;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI analysis states
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [translatedSubs, setTranslatedSubs] = useState<any[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [targetLang, setTargetLang] = useState<'en' | 'fr' | 'es'>('en');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Intersection Observer to autoplay and auto-pause on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => {
      observer.disconnect();
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    
    if (subtitles.length > 0) {
      if (targetLang === 'en') {
        const active = subtitles.find(s => time >= s.start && time <= s.end);
        setCurrentSubtitle(active ? active.text : '');
      } else {
        const active = translatedSubs.find(s => time >= s.start && time <= s.end);
        setCurrentSubtitle(active ? active[targetLang] : '');
      }
    }
  };

  const triggerAiAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const data = await geminiService.analyzeVideoFeed(reel.id, reel.video_url, reel.caption);
      setSubtitles(data.subtitles || []);
      setTranslatedSubs(data.translatedSubtitles || []);
      setAiResult(data);
    } catch (err: any) {
      console.error("AI automated transcribing error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto AI transcribed captions elements are disabled across the system.

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (e.detail === 2) {
      // Direct double click
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      
      // Perform Like Action
      if (!reel.is_liked) {
        onLike();
      }
      
      // Trigger center heart-pop visual effect
      setShowHeartPop(false);
      setTimeout(() => {
        setShowHeartPop(true);
      }, 50);

    } else if (e.detail === 1) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        if (videoRef.current) {
          if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
          } else {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }
      }, 250);
    }
  };

  const avatarUrl = reel.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reel.username}`;

  return (
    <div className="snap-start flex-none w-full h-full relative flex items-center bg-zinc-950 select-none">
      
      {/* HTML5 Video */}
      <video 
        ref={videoRef}
        src={reel.video_url}
        className="w-full h-full object-cover cursor-pointer"
        loop
        muted={isMuted}
        playsInline
        onClick={handleVideoClick}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Heart Pop Overlay for Double Tap */}
      <AnimatePresence>
        {showHeartPop && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.4, 1.1, 1.2, 1], opacity: [0, 1, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() => setShowHeartPop(false)}
            className="absolute inset-x-0 inset-y-0 m-auto w-24 h-24 flex items-center justify-center text-rose-500 drop-shadow-lg z-30 pointer-events-none"
          >
            <Heart size={84} fill="currentColor" stroke="none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause overlay indicator */}
      {!isPlaying && (
        <div 
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            }
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center border border-white/20"
          >
            <Plus size={28} className="translate-x-[2px] text-white rotate-45" />
          </motion.div>
        </div>
      )}

      {/* Sidebar Controls (Likes, Comments, Shares) */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
        
        {/* Creator Hub button */}
        <div className="relative mb-2">
          <img 
            src={avatarUrl} 
            alt={reel.username} 
            className="w-11 h-11 rounded-full border-2 border-white object-cover bg-zinc-900" 
          />
          {currentUser?.id !== reel.user_id && !isFollowed && (
            <button 
              onClick={onFollow}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-brand text-white rounded-full p-0.5 border border-black hover:scale-110 active:scale-95 transition-transform"
            >
              <Plus size={12} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Heart / Likes */}
        <button 
          onClick={onLike}
          className="flex flex-col items-center hover:scale-110 transition-transform active:scale-90"
        >
          <div className={cn(
            "w-12 h-12 rounded-full border border-zinc-800/40 backdrop-blur-md flex items-center justify-center shadow-lg transition-all",
            reel.is_liked ? "bg-rose-600 text-white border-rose-500" : "bg-black/40 text-white"
          )}>
            <Heart size={22} fill={reel.is_liked ? "currentColor" : "none"} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black mt-1 tracking-tighter shadow-md drop-shadow">
            {reel.like_count}
          </span>
        </button>

        {/* Remarks / Comments */}
        <button 
          onClick={onOpenComments}
          className="flex flex-col items-center hover:scale-110 transition-transform active:scale-90"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 border border-zinc-800/40 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
            <MessageCircle size={22} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black mt-1 tracking-tighter shadow-md drop-shadow">
            {reel.comment_count}
          </span>
        </button>

        {/* Copy Share links */}
        <button 
          onClick={onShare}
          className="flex flex-col items-center hover:scale-110 transition-transform active:scale-90"
        >
          <div className="w-12 h-12 rounded-full bg-black/40 border border-zinc-800/40 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
            <Share2 size={22} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black mt-1 tracking-tighter shadow-md drop-shadow">Share</span>
        </button>

        {/* AI Sidebar Control is disabled */}
      </div>

      {/* AI Dynamic Subtitles Overlay */}
      {currentSubtitle && (
        <div className="absolute bottom-28 left-6 right-20 flex justify-center z-20 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-zinc-800/40 text-center text-sm font-black tracking-wide text-white max-w-xs md:max-w-md shadow-2xl leading-relaxed"
          >
            {currentSubtitle}
          </motion.div>
        </div>
      )}

      {/* AI Drawer Side Panel Overlay */}
      <AnimatePresence>
        {isAiPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute right-0 top-0 bottom-0 w-72 bg-black/95 backdrop-blur-xl border-l border-zinc-900/80 z-40 p-5 overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
              <span className="text-xs font-black text-purple-400 flex items-center gap-1.5 uppercase tracking-widest">
                <Sparkles size={14} className="text-purple-400 animate-pulse" /> DeoAI Studio
              </span>
              <button 
                onClick={() => setIsAiPanelOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 select-none">
                <Loader2 size={32} className="animate-spin text-purple-500" />
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#a1a1aa]">Transcribing Short...</p>
              </div>
            ) : aiResult ? (
              <div className="space-y-4 text-xs">
                {/* 1. Language Toggle */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Subtitle Languages</p>
                  <div className="flex gap-1.5">
                    {(['en', 'fr', 'es'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setTargetLang(lang);
                          toast.success(`Subtitle language: ${lang === 'en' ? 'English' : lang === 'fr' ? 'French' : 'Spanish'}`);
                        }}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition border cursor-pointer",
                          targetLang === lang
                            ? "bg-purple-600 text-white border-purple-500"
                            : "bg-zinc-900 text-zinc-400 border-zinc-800"
                        )}
                      >
                        {lang === 'en' ? 'English' : lang === 'fr' ? 'French' : 'Spanish'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Highlights / Video moments seeker */}
                {aiResult.importantMoments && aiResult.importantMoments.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Navigate Video Moments</p>
                    <div className="grid gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {aiResult.importantMoments.map((moment: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = moment.time;
                              videoRef.current.play().catch(() => {});
                              setIsPlaying(true);
                              toast.info(`Jumped to highlight at ${moment.time}s`);
                            }
                          }}
                          className="w-full text-left p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-[10.5px] text-zinc-300 font-medium transition active:scale-[0.98] select-none flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate pr-1">🎥 {moment.event}</span>
                          <span className="font-mono text-purple-400 shrink-0 font-extrabold bg-purple-500/10 px-1 py-0.5 rounded text-[9px]">{moment.time}s</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Quality Analysis */}
                {aiResult.qualityAnalysis && (
                  <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/60 pb-1">AI Video Audit</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-zinc-500">Video Clarity:</span>
                        <p className="font-bold text-zinc-200">{aiResult.qualityAnalysis.visualClarity}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">Audio Clarity:</span>
                        <p className="font-bold text-zinc-200">{aiResult.qualityAnalysis.audioClarity}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] pt-1">
                      <span className="text-zinc-400">Production Check:</span>
                      <span className="font-bold text-emerald-400">Score {aiResult.qualityAnalysis.score}/100</span>
                    </div>
                  </div>
                )}

                {/* 4. Duplication Check */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Duplicity Fingerprint</p>
                  <p className="font-mono text-[9.5px] text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-800 select-all max-w-full truncate">
                    {aiResult.duplicateHash || "sha256:deohub_unique_reel"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center select-none gap-2">
                <Sparkles size={24} className="text-purple-400 rotate-12 animate-pulse" />
                <p className="text-xs font-bold text-white">Generate Subtitles</p>
                <p className="text-[10px] text-zinc-500 max-w-[180px]">Automate transcribing timelines, translate caption strings, and compute growth metrics.</p>
                <button
                  onClick={triggerAiAnalysis}
                  className="mt-3 bg-purple-600 text-white rounded-lg font-black text-[10px] uppercase tracking-wider px-4 py-1.5 hover:bg-purple-700 cursor-pointer"
                >
                  Process Reels
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption & Music Sound labels inside left tray */}
      <div className="absolute left-4 bottom-6 right-20 flex flex-col items-start gap-2.5 z-20 text-shadow-sm select-text">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-white hover:underline cursor-pointer">@{reel.username}</span>
          {isFollowed && (
            <span className="text-[9px] font-extrabold text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/30 uppercase tracking-wider">Following</span>
          )}
        </div>
        
        <p className="text-xs text-zinc-200 line-clamp-2 max-w-sm selection:bg-brand/30">
          {reel.caption}
        </p>

        {/* Music scrolling track info */}
        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-xs py-1 px-2.5 rounded-full border border-zinc-900/60 overflow-hidden text-[10px] font-bold text-zinc-300">
          <Music size={12} className="animate-spin text-brand" style={{ animationDuration: '6s' }} />
          <span className="uppercase tracking-wide">Sync Audio Track // Live Output</span>
        </div>
      </div>

      {/* Edge vignette gradient mask */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />

    </div>
  );
}
