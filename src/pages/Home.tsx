import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon, MapPin, Smile, Loader2, Plus, Play, Video, X, Sparkles, Send, ChevronLeft, ChevronRight, Eye, Trash2, ArrowDown, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { postsService } from '../lib/postsService';
import { authService } from '../lib/authService';
import { searchService } from '../lib/searchService';
import { messageService } from '../lib/messageService';
import { adsService } from '../lib/adsService';
import { getSocket } from '../lib/socket';
import { geminiService } from '../lib/geminiService';

interface UserStory {
  id: string;
  name: string;
  avatar: string;
  imageUrl: string;
  caption: string;
  created_at: string;
  userId: string | number;
}

function StoryCircle({ name, avatar, hasStory = true, isMe = false, onClick }: { name: string, avatar: string, hasStory?: boolean, isMe?: boolean, onClick?: () => void }) {
  return (
    <motion.button 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[72px] focus:outline-none"
    >
      <div className={cn(
        "h-[68px] w-[68px] rounded-full p-[2px] relative",
        hasStory ? "bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6]" : "bg-zinc-200 dark:bg-[#3f3f46]"
      )}>
        <div className="h-full w-full rounded-full border-[3px] border-white bg-zinc-100 dark:border-[#09090b] dark:bg-[#18181b] overflow-hidden relative">
             {avatar.startsWith('http') ? <img src={avatar} alt={name} className="h-full w-full object-cover" /> : <div className={cn("h-full w-full", avatar)} />}
        </div>
        
        {isMe && (
          <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-[#7c3aed] border-2 border-white dark:border-[#09090b] flex items-center justify-center text-white shadow-lg">
            <Plus size={12} strokeWidth={4} />
          </div>
        )}
      </div>
      <span className="text-[10px] font-bold text-zinc-500 dark:text-[#a1a1aa] truncate w-16 text-center uppercase tracking-tighter">
        {isMe ? 'Your Story' : name}
      </span>
    </motion.button>
  );
}

function CreatePostCard() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const username = currentUser?.username || 'Guest';
  const avatarUrl = currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-zinc-200 dark:bg-[#18181b] dark:border-[#27272a]"
    >
      <div className="flex gap-4 items-center mb-4">
        <img src={avatarUrl} alt={username} className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-[#27272a] object-cover" />
        <button 
          onClick={() => navigate('/create')}
          className="flex-1 text-left px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-[#09090b] text-zinc-500 dark:text-[#71717a] text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors"
        >
          What's happening, {username}?
        </button>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-[#27272a]">
        <button onClick={() => navigate('/create')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#27272a] transition-colors">
          <ImageIcon size={18} className="text-[#3b82f6]" strokeWidth={2.5} />
          <span className="text-xs font-bold text-zinc-600 dark:text-[#a1a1aa]">Photo</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#27272a] transition-colors">
          <MapPin size={18} className="text-[#ef4444]" strokeWidth={2.5} />
          <span className="text-xs font-bold text-zinc-600 dark:text-[#a1a1aa]">Location</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#27272a] transition-colors">
          <Smile size={18} className="text-[#f59e0b]" strokeWidth={2.5} />
          <span className="text-xs font-bold text-zinc-600 dark:text-[#a1a1aa]">Mood</span>
        </button>
      </div>
    </motion.div>
  );
}

function SponsoredFeedCard({ ad }: { ad: any }) {
  const [recordedImpression, setRecordedImpression] = useState(false);

  useEffect(() => {
    if (ad && ad.id && !recordedImpression) {
      adsService.recordInteraction(ad.id, 'impression').then(() => {
        setRecordedImpression(true);
      }).catch(() => {});
    }
  }, [ad, recordedImpression]);

  const handleAdClick = async () => {
    if (ad && ad.id) {
      try {
        await adsService.recordInteraction(ad.id, 'click');
      } catch (err) {}
      const targetUrl = ad.link_url || ad.website_url || ad.portfolio_url;
      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const hasVideo = ad.image_url?.startsWith('data:video') || ad.image_url?.endsWith('.mp4') || ad.image_url?.endsWith('.mov') || ad.image_url?.endsWith('.webm');

  return (
    <motion.article 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "mb-4 overflow-hidden rounded-2xl bg-white p-5 shadow-md border transition-all hover:shadow-lg dark:bg-[#18181b] relative",
        ad.is_premium 
          ? "border-amber-400 dark:border-amber-500/40 shadow-amber-400/5 dark:shadow-md" 
          : "border-zinc-200 dark:border-zinc-800"
      )}
    >
      {ad.is_premium && (
        <div className="absolute top-3.5 right-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5 z-10 shadow-lg select-none">
          <Zap size={8} className="fill-black" /> Elite Partner
        </div>
      )}

      <div className="mb-3 flex items-center justify-between pointer-events-none select-none">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 flex items-center justify-center">
            <div className="h-full w-full rounded-full bg-zinc-950 flex items-center justify-center text-white text-[9px] font-black">
              SP
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black text-zinc-900 dark:text-[#fafafa]">Sponsored Creator</h3>
              <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-2 py-0.5 text-[7px] font-black uppercase text-[#7c3aed] dark:bg-[#7c3aed]/15 dark:text-[#c084fc]">
                ADS
              </span>
            </div>
            <p className="text-[9px] font-bold text-zinc-400 dark:text-[#71717a] uppercase tracking-wider">
              {ad.category || 'Promotion'} Campaign
            </p>
          </div>
        </div>
      </div>

      <h4 className="mb-1.5 text-sm font-black text-zinc-900 dark:text-[#fafafa] tracking-tight leading-snug">
        {ad.title}
      </h4>

      {ad.description && (
        <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed font-medium mb-3 select-text white-space-pre-wrap">
          {ad.description}
        </p>
      )}

      {/* Uploaded assets badges */}
      {(ad.project_files_url || ad.cv_url) && (
        <div className="p-2 border border-zinc-200 dark:border-[#27272a] rounded-xl bg-zinc-50 dark:bg-zinc-950/40 mb-3 space-y-1 text-[10px] text-zinc-500 dark:text-zinc-450 font-mono">
          {ad.project_files_url && (
            <div className="flex items-center gap-1 truncate text-purple-600 dark:text-purple-400">
              <span className="font-bold">Project Files:</span> {ad.project_files_url}
            </div>
          )}
          {ad.cv_url && (
            <div className="flex items-center gap-1 truncate text-pink-600 dark:text-pink-400">
              <span className="font-bold">CV Linked:</span> {ad.cv_url}
            </div>
          )}
        </div>
      )}

      {ad.image_url && (
        <div 
          onClick={handleAdClick}
          className="mb-4 overflow-hidden rounded-xl bg-zinc-950 aspect-video relative group cursor-pointer border border-zinc-100 dark:border-zinc-900"
        >
          {hasVideo ? (
            <video src={ad.image_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
          ) : (
            <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          )}
          <div className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-md border border-white/20 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md z-10">
            <Zap size={10} className="text-amber-400 fill-amber-400" /> SPONSORED
          </div>
        </div>
      )}

      {/* Elegant CTA button */}
      <button 
        onClick={handleAdClick}
        className={cn(
          "w-full flex items-center justify-between rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer border",
          ad.is_premium 
            ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black border-amber-300 shadow-md" 
            : "bg-gradient-to-r from-[#7c3aed]/10 to-[#3b82f6]/10 hover:from-[#7c3aed]/20 hover:to-[#3b82f6]/20 border-[#7c3aed]/20 dark:border-[#7c3aed]/30 text-[#7c3aed] dark:text-[#c084fc]"
        )}
      >
        <span>{ad.cta_text || 'Learn More Details'}</span>
        <ChevronRight size={14} className={ad.is_premium ? "text-black" : "text-[#7c3aed] dark:text-[#c084fc]"} />
      </button>

    </motion.article>
  );
}

function PostCard({ post, onDelete }: { post: any; onDelete?: (postId: number) => void }) {
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(parseInt(post.like_count) || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentCount, setCommentCount] = useState(parseInt(post.comment_count) || 0);
  const [newComment, setNewComment] = useState('');
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    setLiked(post.is_liked);
  }, [post.is_liked]);

  useEffect(() => {
    setLikeCount(parseInt(post.like_count) || 0);
  }, [post.like_count]);

  useEffect(() => {
    setCommentCount(parseInt(post.comment_count) || 0);
  }, [post.comment_count]);

  // Real-Time dynamically added comments synchronizer
  useEffect(() => {
    const socket = getSocket();
    
    const handleCommentCreated = (data: { postId: number; comment: any; commentCount: number }) => {
      if (data.postId === post.id) {
        setComments(prev => {
          if (prev.some(c => String(c.id) === String(data.comment.id))) return prev;
          return [...prev, data.comment];
        });
      }
    };

    socket.on('post_comment_created', handleCommentCreated);
    return () => {
      socket.off('post_comment_created', handleCommentCreated);
    };
  }, [post.id]);
  const isOwnPost = currentUser && post.user_id?.toString() === currentUser.id?.toString();

  const toggleLike = async () => {
    try {
      // Optimistic UI update
      const newLikedStatus = !liked;
      setLiked(newLikedStatus);
      setLikeCount(prev => newLikedStatus ? prev + 1 : prev - 1);
      
      await postsService.toggleLike(post.id);
    } catch (err: any) {
      toast.error(err.message);
      // Revert on error
      setLiked(liked);
      setLikeCount(likeCount);
    }
  };

  const handleToggleComments = async () => {
    setShowComments(!showComments);
    if (!showComments) {
      setIsCommentsLoading(true);
      try {
        const data = await postsService.getComments(post.id);
        setComments(data);
      } catch (err: any) {
        toast.error('Failed to load comments');
      } finally {
        setIsCommentsLoading(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const added = await postsService.addComment(post.id, newComment);
      setComments(prev => [...prev, added]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
      toast.success('Comment added successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    
    // Attempt use native share if available
    if (navigator.share) {
      navigator.share({
        title: 'DeoHub Post',
        text: post.content || 'Check out this post on DeoHub!',
        url: shareUrl,
      })
      .then(() => toast.success('Shared successfully! ✨'))
      .catch((err) => {
        navigator.clipboard.writeText(shareUrl);
        toast.success('Copied link to clipboard! 💜');
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Copied link to clipboard! 💜');
    }
    setShowMenu(false);
  };

  const handleDeletePostClick = () => {
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await postsService.deletePost(post.id);
      toast.success('Post has been deleted.');
      if (onDelete) {
        onDelete(post.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not delete your post');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const avatarUrl = post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username || post.user_id}`;
  const navigate = useNavigate();

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-zinc-200 dark:bg-[#18181b] dark:border-[#27272a] hover:border-zinc-300 dark:hover:border-[#3f3f46] transition-colors"
    >
      <div className="mb-4 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => navigate(`/profile/${post.username}`)}
            className="h-10 w-10 rounded-full p-[1px] bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] cursor-pointer"
          >
             <img src={avatarUrl} alt={post.username} className="h-full w-full rounded-full border-2 border-white dark:border-[#18181b] bg-zinc-100 dark:bg-[#27272a] object-cover" />
          </div>
          <div>
            <div 
                onClick={() => navigate(`/profile/${post.username}`)}
                className="flex items-center gap-1 cursor-pointer"
            >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-[#fafafa] hover:underline">{post.username || 'Anonymous'}</h3>
                {post.is_verified && (
                  <svg className="h-4 w-4 text-[#3b82f6] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.66.15-.44.23-.91.23-1.4 0-2.45-1.99-4.44-4.44-4.44-.49 0-.96.08-1.4.23-1.44-1.3-2.08-2.18-3.66-2.18s-2.22.88-3.66 2.18c-.44-.15-.91-.23-1.4-.23-2.45 0-4.44 1.99-4.44 4.44 0 .49.08.96.23 1.4C1.38 9.55.5 10.92.5 12.5c0 1.58.88 2.95 2.18 3.66-.15.44-.23.91-.23 1.4 0 2.45 1.99 4.44 4.44 4.44.49 0 .96-.08 1.4-.23 1.44 1.3 2.08 2.18 3.66 2.18s2.22-.88 3.66-2.18c.44.15.91.23 1.4.23 2.45 0 4.44-1.99 4.44-4.44 0-.49-.08-.96-.23-1.4 1.3-.71 2.18-2.08 2.18-3.66zM10 17.5l-4-4 1.41-1.41L10 14.67l6.59-6.59L18 9.5l-8 8z"/></svg>
                )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-[#71717a]">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="text-zinc-400 hover:text-zinc-600 dark:text-[#71717a] dark:hover:text-[#fafafa] p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors cursor-pointer"
          >
            <MoreHorizontal size={20} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className="absolute right-0 top-10 w-44 rounded-xl border border-zinc-150 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 z-20 py-1 overflow-hidden"
                >
                  <button
                    onClick={handleShare}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-350 dark:hover:bg-zinc-900 hover:text-[#7c3aed] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 size={13} />
                    Share / Copy Link
                  </button>
                  {isOwnPost && (
                    <button
                      onClick={handleDeletePostClick}
                      className="w-full text-left px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-900 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      Delete Post
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="mb-4 text-[15px] leading-relaxed text-zinc-800 dark:text-[#d4d4d8] whitespace-pre-wrap">
        {post.content}
      </p>

      {post.image_url && (
        <div className="mb-4 overflow-hidden rounded-xl bg-zinc-100 dark:bg-[#27272a] aspect-video group cursor-pointer">
          <img src={post.image_url} alt="Post content" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      )}

      {post.video_url && (
        <div className="mb-4 overflow-hidden rounded-xl bg-zinc-100 dark:bg-[#27272a] aspect-video">
          <video src={post.video_url} controls className="w-full h-full object-cover" />
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-[#27272a]">
        <div className="flex items-center gap-4">
            <button 
                onClick={toggleLike}
                className={cn(
                    "flex items-center gap-2 text-xs font-black transition-all hover:scale-110",
                    liked ? "text-[#7c3aed]" : "text-zinc-500 hover:text-[#7c3aed] dark:text-[#a1a1aa]"
                )}
                >
                <Heart size={18} fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 0 : 2.5} />
                <span>{likeCount >= 1000 ? (likeCount/1000).toFixed(1) + 'k' : likeCount}</span>
            </button>
            <button 
                onClick={handleToggleComments}
                className={cn(
                  "flex items-center gap-2 text-xs font-black transition-all hover:scale-110 dark:text-[#a1a1aa]",
                  showComments ? "text-[#3b82f6]" : "text-zinc-500 hover:text-[#3b82f6]"
                )}
            >
                <MessageCircle size={18} strokeWidth={2.5} />
                <span>{commentCount}</span>
            </button>
        </div>
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 text-xs font-black text-zinc-500 transition-all hover:scale-110 hover:text-[#22c55e] dark:text-[#a1a1aa]"
        >
          <Share2 size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Inline Comments Expanded Board */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60"
          >
            {/* Input Bar */}
            <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Reply to this post..." 
                className="flex-1 text-xs px-4 py-2 rounded-full border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-[#7c3aed] dark:border-zinc-850 dark:bg-black text-white placeholder:text-zinc-500"
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-[#7c3aed] text-white text-xs font-extrabold uppercase rounded-full hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
              >
                Reply
              </button>
            </form>

            {/* Comments List */}
            {isCommentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-[11px] font-bold text-zinc-500 py-2 uppercase tracking-wide">No replies yet. Be the first!</p>
            ) : (
              <div className="space-y-3.5 select-text">
                {comments.map((comment, index) => (
                  <div key={comment.id ? `comment-${comment.id}-${index}` : `comment-idx-${index}`} className="flex gap-2.5">
                    <img 
                      src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`} 
                      alt="avatar" 
                      className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-[#27272a] object-cover" 
                    />
                    <div className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40 p-2.5 rounded-2xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black cursor-pointer hover:underline flex items-center gap-1">
                          @{comment.username}
                          {comment.is_verified && (
                            <svg className="h-3 w-3 text-[#3b82f6] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.66.15-.44.23-.91.23-1.4 0-2.45-1.99-4.44-4.44-4.44-.49 0-.96.08-1.4.23-1.44-1.3-2.08-2.18-3.66-2.18s-2.22.88-3.66 2.18c-.44-.15-.91-.23-1.4-.23-2.45 0-4.44 1.99-4.44 4.44 0 .49.08.96.23 1.4C1.38 9.55.5 10.92.5 12.5c0 1.58.88 2.95 2.18 3.66-.15.44-.23.91-.23 1.4 0 2.45 1.99 4.44 4.44 4.44.49 0 .96-.08 1.4-.23 1.44 1.3 2.08 2.18 3.66 2.18s2.22-.88 3.66-2.18c.44.15.91.23 1.4.23 2.45 0 4.44-1.99 4.44-4.44 0-.49-.08-.96-.23-1.4 1.3-.71 2.18-2.08 2.18-3.66zM10 17.5l-4-4 1.41-1.41L10 14.67l6.59-6.59L18 9.5l-8 8z"/></svg>
                          )}
                        </span>
                        <span className="text-[8px] font-bold text-zinc-500 uppercase">{new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 selection:bg-[#7c3aed]/40">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* MD3 Dialog Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-zinc-50 p-6 shadow-2xl dark:bg-[#1c1b1f] border border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center z-10"
            >
              {/* Headline Icon */}
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                <AlertTriangle className="h-7 w-7" />
              </div>
              
              {/* Headline (Title) */}
              <h3 className="mb-2 text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                Permanently delete post?
              </h3>
              
              {/* Supporting Text */}
              <p className="mb-6 text-[11px] font-bold leading-relaxed text-zinc-500 dark:text-zinc-400 px-2 uppercase tracking-wide">
                This will permanently remove this post, its media, and associated comments. This action cannot be undone.
              </p>
              
              {/* Action buttons with MD3 vibe */}
              <div className="flex w-full gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-full border border-zinc-200 py-3 text-[10px] font-extrabold uppercase tracking-wider text-zinc-650 hover:bg-zinc-150 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-full bg-rose-600 py-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-rose-500 transition-all cursor-pointer shadow-lg shadow-rose-600/25"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.article>
  );
}

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedMode, setFeedMode] = useState<string>('Normal');
  const [focusMessage, setFocusMessage] = useState<string | null>(null);
  
  // Pull to refresh gesture states
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = React.useRef(0);
  const activePullRef = React.useRef(false);
  const currentUser = authService.getCurrentUser();
  const meUsername = currentUser?.username || 'Guest';
  const meAvatar = currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${meUsername}`;

  // Dynamic Stories states
  const [stories, setStories] = useState<UserStory[]>([]);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [newStoryImage, setNewStoryImage] = useState('');
  const [newStoryCaption, setNewStoryCaption] = useState('');

  // Interactive Story states
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [storyReply, setStoryReply] = useState('');
  const [showViewersList, setShowViewersList] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number }[]>([]);

  const storiesList = stories.map(story => ({
    id: story.id,
    name: story.userId === currentUser?.id ? `${meUsername} (You)` : story.name,
    avatar: story.avatar,
    imageUrl: story.imageUrl,
    caption: story.caption,
    color: 'from-[#7c3aed] to-[#3b82f6]',
    userId: story.userId
  }));

  const myStories = stories.filter(story => story.userId === currentUser?.id);
  const otherStories = stories.filter(story => story.userId !== currentUser?.id);

  useEffect(() => {
    loadPosts();
    
    // Set up global real-time listeners for updates
    const socket = getSocket();

    const handlePostCreated = (newPost: any) => {
      setPosts(prev => {
        if (prev.some(p => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostLikeUpdated = (data: { postId: number; likeCount: number; liked: boolean; userId: number }) => {
      setPosts(prev => prev.map(p => {
        if (p.id === data.postId) {
          return {
            ...p,
            like_count: data.likeCount != null ? data.likeCount.toString() : '0',
            is_liked: data.userId === currentUser?.id ? data.liked : p.is_liked
          };
        }
        return p;
      }));
    };

    const handlePostCommentCreated = (data: { postId: number; comment: any; commentCount: number }) => {
      setPosts(prev => prev.map(p => {
        if (p.id === data.postId) {
          return {
            ...p,
            comment_count: data.commentCount != null ? data.commentCount.toString() : '0'
          };
        }
        return p;
      }));
    };

    const handlePostDeleted = (data: { postId: number }) => {
      setPosts(prev => prev.filter(p => p.id !== data.postId));
    };

    socket.on('post_created', handlePostCreated);
    socket.on('post_like_updated', handlePostLikeUpdated);
    socket.on('post_comment_created', handlePostCommentCreated);
    socket.on('post_deleted', handlePostDeleted);

    const raw = localStorage.getItem('deohub_stories');
    if (raw) {
      try {
        const loadedStories: UserStory[] = JSON.parse(raw);
        const now = new Date().getTime();
        const active: UserStory[] = [];
        const expired: UserStory[] = [];

        loadedStories.forEach(s => {
          const createdAtTime = new Date(s.created_at).getTime();
          const isOlderThan24h = (now - createdAtTime) > (24 * 60 * 60 * 1000);
          
          if (isOlderThan24h) {
            expired.push(s);
          } else {
            active.push(s);
          }
        });

        if (expired.length > 0) {
          // Add expired stories to personal archive
          const rawArchive = localStorage.getItem('deohub_stories_archive');
          let currentArchive: UserStory[] = [];
          if (rawArchive) {
            try {
              currentArchive = JSON.parse(rawArchive);
            } catch (e) {
              currentArchive = [];
            }
          }

          // Filter expired stories for current user
          const userExpired = expired.filter(s => s.userId?.toString() === currentUser?.id?.toString());
          if (userExpired.length > 0) {
            const updatedArchive = [...userExpired, ...currentArchive];
            localStorage.setItem('deohub_stories_archive', JSON.stringify(updatedArchive));
            toast.info(`${userExpired.length} expired story moved to your archive. 🗄️`);
          }

          localStorage.setItem('deohub_stories', JSON.stringify(active));
          setStories(active);
        } else {
          setStories(loadedStories);
        }
      } catch (err) {
        setStories([]);
      }
    }

    return () => {
      socket.off('post_created', handlePostCreated);
      socket.off('post_like_updated', handlePostLikeUpdated);
      socket.off('post_comment_created', handlePostCommentCreated);
      socket.off('post_deleted', handlePostDeleted);
    };
  }, [currentUser?.id]);

  // Timer progression effect for stories
  useEffect(() => {
    if (activeStoryIndex === null || isStoryPaused) return;

    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + 1.25; // Completes in 4 seconds
      });
    }, 50);

    return () => clearInterval(interval);
  }, [activeStoryIndex, isStoryPaused]);

  const loadPosts = async () => {
    try {
      if (feedMode !== 'Normal') {
        const result = await geminiService.getSmartFeed(feedMode);
        setPosts(result.feed || []);
        setFocusMessage(result.focusMessage || null);
      } else {
        const data = await postsService.getPosts();
        setPosts(data || []);
        setFocusMessage(null);
      }
      try {
        const adsData = await adsService.getAds();
        setAds(adsData || []);
      } catch (adErr) {
        console.warn("Could not retrieve sponsored advertisements list:", adErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadPosts();
  }, [feedMode]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      startYRef.current = e.touches[0].clientY;
      activePullRef.current = true;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activePullRef.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startYRef.current;
    
    if (diffY > 0) {
      // Damped pull distance computation
      const dampedDist = Math.min(80, Math.pow(diffY, 0.8) * 1.5);
      setPullDistance(dampedDist);
      
      // Prevent browser default pull-to-refresh / bounce if check is cancellable
      if (diffY > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
      activePullRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!activePullRef.current) return;
    activePullRef.current = false;
    setIsPulling(false);
    
    if (pullDistance >= 55) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep open at height of 60 for loader feedback
      try {
        await loadPosts();
        toast.success('Feed updated! ✨');
      } catch (err) {
        toast.error('Failed to update feed');
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      startYRef.current = e.clientY;
      activePullRef.current = true;
      setIsPulling(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activePullRef.current || isRefreshing) return;
    
    const currentY = e.clientY;
    const diffY = currentY - startYRef.current;
    
    if (diffY > 0) {
      const dampedDist = Math.min(80, Math.pow(diffY, 0.8) * 1.5);
      setPullDistance(dampedDist);
    } else {
      setPullDistance(0);
      setIsPulling(false);
      activePullRef.current = false;
    }
  };

  const handleMouseUpOrLeave = async () => {
    if (!activePullRef.current) return;
    activePullRef.current = false;
    setIsPulling(false);
    
    if (pullDistance >= 55) {
      setIsRefreshing(true);
      setPullDistance(60);
      try {
        await loadPosts();
        toast.success('Feed updated! ✨');
      } catch (err) {
        toast.error('Failed to update feed');
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewStoryImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStory = () => {
    if (!newStoryImage.trim()) {
      toast.error('Please upload a photo or video from your device!');
      return;
    }
    const newStoryItem: UserStory = {
      id: 'story_' + Date.now(),
      name: meUsername,
      avatar: meAvatar,
      imageUrl: newStoryImage,
      caption: newStoryCaption,
      created_at: new Date().toISOString(),
      userId: currentUser?.id || 'guest'
    };

    const updated = [newStoryItem, ...stories];
    localStorage.setItem('deohub_stories', JSON.stringify(updated));
    setStories(updated);

    // Reset fields & close
    setNewStoryImage('');
    setNewStoryCaption('');
    setIsCreateStoryOpen(false);
    toast.success('Your story was shared successfully! ✨');
  };

  const handleDeleteStory = (storyId: string | number) => {
    const updated = stories.filter(s => s.id !== storyId);
    localStorage.setItem('deohub_stories', JSON.stringify(updated));
    setStories(updated);
    setActiveStoryIndex(null);
    setStoryProgress(0);
    toast.success('Story deleted');
  };

  const handleForceArchiveStory = (storyId: string | number) => {
    const storyToArchive = stories.find(s => s.id === storyId);
    if (!storyToArchive) return;

    // Archive user's story
    const rawArchive = localStorage.getItem('deohub_stories_archive');
    let currentArchive: UserStory[] = [];
    if (rawArchive) {
      try {
        currentArchive = JSON.parse(rawArchive);
      } catch (e) {
        currentArchive = [];
      }
    }

    // Check if duplicate
    if (!currentArchive.some(s => s.id === storyId)) {
      currentArchive = [storyToArchive, ...currentArchive];
      localStorage.setItem('deohub_stories_archive', JSON.stringify(currentArchive));
    }

    // Remove from active
    const updated = stories.filter(s => s.id !== storyId);
    localStorage.setItem('deohub_stories', JSON.stringify(updated));
    setStories(updated);
    
    setActiveStoryIndex(null);
    setStoryProgress(0);
    toast.success('Story moved to your personal Story Archive! 🗄️');
  };

  const handleNextStory = () => {
    setStoryProgress(0);
    setActiveStoryIndex(prev => {
      if (prev === null) return null;
      if (prev < storiesList.length - 1) {
        return prev + 1;
      }
      return null; // Close after the last story
    });
  };

  const handlePrevStory = () => {
    setStoryProgress(0);
    setActiveStoryIndex(prev => {
      if (prev === null) return null;
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
  };

  const handleStoryReact = async (emoji: string) => {
    if (activeStoryIndex === null) return;
    const activeStory = storiesList[activeStoryIndex];
    if (!activeStory) return;
    
    // Add floating emoji animation element
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 200) - 100; // random offset horizontally (-100 to 100)
    setFloatingEmojis(prev => [...prev, { id, emoji, left }]);

    toast.success(`You reacted ${emoji} to @${activeStory.name.replace(' (You)', '')}'s story!`);

    if (activeStory.userId && activeStory.userId !== currentUser?.id) {
      try {
        await messageService.sendMessage(
          activeStory.userId, 
          `Reacted ${emoji} to your story: "${activeStory.caption.substring(0, 30)}..."`, 
          'text'
        );
      } catch (err) {
        console.warn('Silent story react skip:', err);
      }
    }
  };

  const handleSendStoryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyReply.trim() || activeStoryIndex === null) return;
    
    const activeStory = storiesList[activeStoryIndex];
    if (!activeStory) return;
    toast.success(`Message sent to @${activeStory.name.replace(' (You)', '')}! 💜`);

    if (activeStory.userId && activeStory.userId !== currentUser?.id) {
      try {
        await messageService.sendMessage(
          activeStory.userId, 
          `Replying to your story: "${storyReply}" (story context: "${activeStory.caption.substring(0, 30)}...")`,
          'text'
        );
      } catch (err) {
        console.warn('Story reply silent dispatch fallback:', err);
      }
    }

    setStoryReply('');
    setIsStoryPaused(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="overflow-hidden flex items-center justify-center transition-all duration-75 text-[#7c3aed] bg-[#7c3aed]/5 rounded-2xl mb-4"
        style={{ 
          height: pullDistance > 0 ? `${pullDistance}px` : '0px',
          opacity: pullDistance > 0 ? Math.min(1, pullDistance / 40) : 0
        }}
      >
        <div className="flex items-center gap-2 select-none">
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#7c3aed]" />
          ) : (
            <motion.div
              style={{ rotate: pullDistance * 4 }}
              className="flex items-center justify-center text-[#7c3aed]"
            >
              <ArrowDown className="h-4 w-4" />
            </motion.div>
          )}
          <span className="text-[10px] uppercase font-black tracking-wider text-[#7c3aed]">
            {isRefreshing 
              ? 'Syncing feed...' 
              : pullDistance >= 55 
                ? 'Release to refresh' 
                : 'Pull to reload'}
          </span>
        </div>
      </div>
      {/* Story Circles List */}
      <div className="mb-8 flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 select-none items-center">
        <StoryCircle 
          isMe 
          name={meUsername} 
          avatar={meAvatar} 
          hasStory={myStories.length > 0}
          onClick={() => {
            if (myStories.length > 0) {
              const globalIdx = stories.findIndex(s => s.userId === currentUser?.id);
              if (globalIdx !== -1) {
                setStoryProgress(0);
                setActiveStoryIndex(globalIdx);
              }
            } else {
              setIsCreateStoryOpen(true);
            }
          }}
        />

        {myStories.length > 0 && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateStoryOpen(true)}
            className="flex flex-[0_0_auto] flex-col items-center gap-1.5 min-w-[72px] focus:outline-none"
          >
            <div className="h-[68px] w-[68px] rounded-full border border-dashed border-zinc-700 dark:border-zinc-805 flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#7c3aed] transition-colors bg-zinc-950">
              <Plus size={20} />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Add Story</span>
          </motion.button>
        )}

        {otherStories.map((story) => {
          const globalIdx = stories.findIndex(s => s.id === story.id);
          return (
            <div key={story.id}>
              <StoryCircle 
                name={story.name} 
                avatar={story.avatar} 
                onClick={() => {
                  setStoryProgress(0);
                  setActiveStoryIndex(globalIdx);
                }}
              />
            </div>
          );
        })}
      </div>

      <CreatePostCard />

      {/* AI Smart Feed Selector */}
      <div className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
          {(['Normal', 'Learning', 'Creator', 'Entertainment', 'Focus'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setFeedMode(mode);
                toast.success(`Switched feed mode to: ${mode}`);
              }}
              className={cn(
                "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer border shrink-0",
                feedMode === mode
                  ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/10"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-[#121214] dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-[#1c1c1e]"
              )}
            >
              {mode === 'Focus' && <span>🧘</span>}
              {mode === 'Learning' && <span>🎓</span>}
              {mode === 'Creator' && <Sparkles size={12} className="text-amber-400" />}
              {mode === 'Entertainment' && <span>🎮</span>}
              {mode === 'Normal' && <span>🔥</span>}
              <span>{mode} Feed</span>
            </button>
          ))}
        </div>

        {focusMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[#172554]/30 via-[#18181b] to-purple-950/40 border border-[#1e1b4b] text-xs text-zinc-300 flex items-start gap-3"
          >
            <Zap className="text-purple-400 shrink-0 mt-0.5 animate-bounce" size={16} />
            <div>
              <p className="font-extrabold text-[#fafafa] uppercase tracking-wide mb-0.5">Focus Mode Safeguard Active</p>
              <p className="leading-relaxed font-mono text-zinc-400">{focusMessage}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#71717a]">Recent Activity</h2>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-[#27272a] ml-6"></div>
      </div>
      
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
          </div>
        ) : posts.length > 0 ? (
          posts.reduce((acc: React.ReactNode[], post: any, index: number) => {
            acc.push(
              <div key={`post-${post.id}`}>
                <PostCard 
                  post={post} 
                  onDelete={(deletedId) => setPosts(prev => prev.filter(p => p.id !== deletedId))} 
                />
              </div>
            );

            // Inter-weave active sponsored ads after every 2 posts dynamically
            const adInterval = 2;
            if (ads.length > 0 && (index + 1) % adInterval === 0) {
              const adIndex = Math.floor((index + 1) / adInterval - 1) % ads.length;
              const ad = ads[adIndex];
              if (ad) {
                acc.push(
                  <div key={`ad-${ad.id}-${index}`}>
                    <SponsoredFeedCard ad={ad} />
                  </div>
                );
              }
            }

            return acc;
          }, [])
        ) : (
          <div className="text-center py-20 bg-white dark:bg-[#18181b] rounded-2xl border border-dashed border-zinc-300 dark:border-[#27272a]">
            <p className="text-zinc-500 dark:text-[#71717a] font-medium">No posts yet. Be the first to share one!</p>
          </div>
        )}
      </div>

      {/* Story Viewer Overlay Portal */}
      <AnimatePresence>
        {activeStoryIndex !== null && storiesList[activeStoryIndex] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-all select-none p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-[420px] h-[85vh] max-h-[740px] rounded-3xl overflow-hidden bg-zinc-950 flex flex-col border border-zinc-800 shadow-3xl text-white outline-none"
            >
              
              {/* Top progress segments indicator */}
              <div className="absolute top-2.5 left-0 right-0 z-20 px-3 flex gap-1">
                {storiesList.map((story, i) => {
                  let widthPercent = 0;
                  if (i < activeStoryIndex) {
                    widthPercent = 100;
                  } else if (i === activeStoryIndex) {
                    widthPercent = storyProgress;
                  }
                  return (
                    <div key={i} className="h-[3px] flex-1 bg-white/25 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-75 ltr"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Story Header */}
              <div className="absolute top-5 left-0 right-0 z-20 px-4 py-1 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 p-[1px] rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6]">
                    <div className="h-full w-full rounded-full border border-zinc-950 overflow-hidden bg-zinc-800 flex items-center justify-center">
                      {storiesList[activeStoryIndex].avatar.startsWith('http') ? (
                        <img 
                          src={storiesList[activeStoryIndex].avatar} 
                          alt="avatar" 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className={cn("h-full w-full flex items-center justify-center text-xs font-bold text-white uppercase", storiesList[activeStoryIndex].avatar)}>
                          {storiesList[activeStoryIndex].name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-black tracking-wide drop-shadow-md">
                      {storiesList[activeStoryIndex].name}
                    </h5>
                    <span className="text-[9px] text-zinc-300 font-bold tracking-widest uppercase drop-shadow">
                      Deo story
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsStoryPaused(!isStoryPaused)}
                    className="p-1 px-2.5 rounded-full font-black text-[9px] uppercase bg-black/40 backdrop-blur-md border border-zinc-805 text-zinc-300 hover:text-white transition-colors"
                  >
                    {isStoryPaused ? 'resume' : 'pause'}
                  </button>
                  <button 
                    onClick={() => setActiveStoryIndex(null)}
                    className="p-1.5 rounded-full bg-black/40 text-zinc-300 hover:bg-black/60 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Story Content Canvas Image/Video */}
              <div className="relative flex-1 bg-zinc-900 overflow-hidden flex items-center justify-center h-full w-full">
                {storiesList[activeStoryIndex].imageUrl.startsWith('data:video') || 
                 storiesList[activeStoryIndex].imageUrl.endsWith('.mp4') || 
                 storiesList[activeStoryIndex].imageUrl.endsWith('.mov') || 
                 storiesList[activeStoryIndex].imageUrl.endsWith('.webm') ? (
                  <video 
                    src={storiesList[activeStoryIndex].imageUrl}
                    className="w-full h-full object-cover select-none"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img 
                    referrerPolicy="no-referrer"
                    src={storiesList[activeStoryIndex].imageUrl} 
                    alt="Story content" 
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                )}

                {/* Flying emoji animation canvas overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-30">
                  <AnimatePresence>
                    {floatingEmojis.map((item) => (
                      <motion.span
                        key={item.id}
                        initial={{ opacity: 1, y: '30vh', x: item.left, scale: 0.8 }}
                        animate={{ opacity: 0, y: '-40vh', scale: 1.8, rotate: item.left / 3 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.6, ease: 'easeOut' }}
                        onAnimationComplete={() => {
                          setFloatingEmojis(prev => prev.filter(e => e.id !== item.id));
                        }}
                        className="absolute text-5xl pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter"
                      >
                        {item.emoji}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Left and Right navigation buttons */}
                <button 
                  type="button" 
                  onClick={handlePrevStory}
                  disabled={activeStoryIndex === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur border border-zinc-800/65 text-zinc-300 hover:text-white hover:bg-black/60 transition-all z-20 disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  type="button" 
                  onClick={handleNextStory}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 backdrop-blur border border-zinc-800/65 text-zinc-300 hover:text-white hover:bg-black/60 transition-all z-20"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Direct tap navigation shortcuts (Invisible overlays that block nothing but allow fast clicking) */}
                <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrevStory(); }} />
                <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNextStory(); }} />
              </div>
              {/* Story Bottom text caption or comment box */}
              <div className="p-5 pt-7 pb-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
                {/* Seen By indicator for own story */}
                {storiesList[activeStoryIndex]?.userId === currentUser?.id && (
                  <div className="flex items-center justify-between bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-xl px-3.5 py-2.5 mb-3.5 shadow-sm">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsStoryPaused(true);
                        setShowViewersList(true);
                      }}
                      className="flex items-center gap-2 cursor-pointer text-left focus:outline-none"
                    >
                      <Eye size={14} className="text-[#a78bfa]" />
                      <span className="text-xs font-bold text-zinc-100 hover:text-white transition-colors">Seen by 32 people</span>
                      <div className="flex -space-x-1.5 ml-1 select-none">
                        <div className="w-4.5 h-4.5 rounded-full bg-indigo-505 border border-zinc-950 flex items-center justify-center text-[7px] font-bold text-white uppercase">A</div>
                        <div className="w-4.5 h-4.5 rounded-full bg-pink-505 border border-zinc-950 flex items-center justify-center text-[7px] font-bold text-white uppercase">S</div>
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-505 border border-zinc-950 flex items-center justify-center text-[7px] font-bold text-white uppercase">J</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleForceArchiveStory(storiesList[activeStoryIndex].id)}
                        className="text-[10px] uppercase font-black text-amber-400 bg-amber-950/40 border border-amber-900/40 hover:bg-amber-900 hover:text-white rounded px-2.5 py-1.5 transition-all cursor-pointer flex items-center gap-1"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStory(storiesList[activeStoryIndex].id)}
                        className="text-[10px] uppercase font-black text-rose-400 bg-rose-950/40 border border-rose-900/40 hover:bg-rose-900 hover:text-white rounded px-2.5 py-1.5 transition-all cursor-pointer flex items-center gap-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-zinc-200 font-bold mb-4 drop-shadow-md leading-relaxed select-text">
                  {storiesList[activeStoryIndex]?.caption}
                </p>

                {/* Heart, Clap, Laugh Quick story reactions */}
                {storiesList[activeStoryIndex]?.userId !== currentUser?.id && (
                  <div className="flex gap-2.5 justify-center mb-4.5 items-center select-none bg-black/30 backdrop-blur-sm rounded-2xl py-2 border border-zinc-900/40">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider mr-1">React:</span>
                    {['❤️', '👏', '😂', '🔥', '😮', '🙌'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => handleStoryReact(em)}
                        className="text-xl hover:scale-130 transition-transform h-9 w-9 flex items-center justify-center cursor-pointer active:scale-95 hover:bg-zinc-900 rounded-full"
                        title="React to story"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                {/* Reply bar */}
                <form 
                  onSubmit={handleSendStoryReply}
                  className="flex gap-2 items-center"
                >
                  <input 
                    type="text"
                    value={storyReply}
                    onChange={(e) => setStoryReply(e.target.value)}
                    onFocus={() => setIsStoryPaused(true)}
                    placeholder={`Reply to ${storiesList[activeStoryIndex].name.replace(' (You)', '')}...`}
                    className="flex-1 text-xs px-4 py-2.5 rounded-full border border-zinc-800 bg-zinc-90 w/25 focus:outline-none focus:ring-1 focus:ring-[#7c3aed] text-white placeholder:text-zinc-500"
                  />
                  <button 
                    type="submit"
                    disabled={!storyReply.trim()}
                    className="p-2.5 rounded-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-40 transition-colors flex-shrink-0 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>

              {/* Slide-up story viewers panel */}
              <AnimatePresence>
                {showViewersList && (
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="absolute inset-x-0 bottom-0 h-2/3 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl z-30 p-5 flex flex-col text-white shadow-2xl"
                  >
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-850 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Eye size={15} className="text-[#a78bfa]" />
                        <span className="text-xs font-black uppercase tracking-widest text-[#fafafa]">Story Viewers (32)</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowViewersList(false);
                          setIsStoryPaused(false);
                        }}
                        className="py-1 px-2.5 text-[9px] font-black bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors uppercase tracking-wider"
                      >
                        Close
                      </button>
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-3.5 pr-1 py-1">
                      {[
                        { name: 'Alex R.', desc: 'Viewed 4m ago', initial: 'A', color: 'from-indigo-500 to-purple-500' },
                        { name: 'Sarah K.', desc: 'Viewed 12m ago', initial: 'S', color: 'from-orange-400 to-pink-500' },
                        { name: 'Jordan', desc: 'Viewed 24m ago', initial: 'J', color: 'from-emerald-400 to-teal-500' },
                        { name: 'Maya', desc: 'Viewed 1h ago', initial: 'M', color: 'from-rose-400 to-amber-500' },
                        { name: 'neoreels', desc: 'Viewed 2h ago', initial: 'N', color: 'from-sky-500 to-blue-600' },
                        { name: 'adcenter', desc: 'Viewed 3h ago', initial: 'AD', color: 'from-[#7c3aed] to-[#3b82f6]' }
                      ].map((viewer, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 py-0.5">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8.5 h-8.5 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm border border-black/15", viewer.color)}>
                              {viewer.initial}
                            </div>
                            <div className="min-w-0">
                              <h6 className="text-xs font-black text-white truncate">@{viewer.name}</h6>
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">{viewer.desc}</span>
                            </div>
                          </div>
                          <span className="text-[9px] bg-[#7c3aed]/10 text-[#a78bfa] border border-[#7c3aed]/25 rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">Follower</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Story Modal */}
      <AnimatePresence>
        {isCreateStoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative text-white"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800 mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-[#cb3dfc]" size={18} />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Share a New Story</h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsCreateStoryOpen(false)}
                  className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Device Media Upload Zone */}
              <div className="mb-5">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block mb-2">Upload Photo or Video from your device:</label>
                
                {newStoryImage ? (
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                    {newStoryImage.startsWith('data:video') ? (
                      <video 
                        src={newStoryImage} 
                        className="w-full h-full object-cover" 
                        controls 
                      />
                    ) : (
                      <img 
                        src={newStoryImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setNewStoryImage('')}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/95 text-white p-2 rounded-full transition-all focus:outline-none cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label 
                    htmlFor="story-file-input"
                    className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 hover:border-[#cb3dfc]/50 bg-zinc-950/40 hover:bg-zinc-950/80 rounded-2xl h-48 cursor-pointer transition-all p-4 text-center group"
                  >
                    <div className="h-12 w-12 rounded-full bg-[#cb3dfc]/10 text-[#cb3dfc] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Plus size={24} />
                    </div>
                    <span className="text-xs font-bold text-zinc-300">Click to upload from device</span>
                    <span className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-medium">Supports photos and videos</span>
                    <input 
                      type="file"
                      id="story-file-input"
                      accept="image/*,video/*"
                      onChange={handleStoryFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="mb-6">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block mb-1">Story Caption:</label>
                <textarea 
                  value={newStoryCaption}
                  onChange={(e) => setNewStoryCaption(e.target.value)}
                  placeholder="What is happening in your day? ✨"
                  rows={2}
                  className="w-full text-xs px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/50 text-white focus:outline-none focus:ring-1 focus:ring-[#cb3dfc] placeholder:text-zinc-600 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateStoryOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateStory}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#cb3dfc] hover:opacity-90 active:scale-95 text-xs font-extrabold text-white transition-all cursor-pointer shadow-lg shadow-[#7c3aed]/20"
                >
                  Share Story
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
