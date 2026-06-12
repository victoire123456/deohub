import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  X, 
  Loader2, 
  UserPlus, 
  UserCheck, 
  Heart, 
  MessageCircle, 
  Share2, 
  TrendingUp, 
  Users, 
  FileText,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { searchService } from '../lib/searchService';
import { userService } from '../lib/userService';
import { postsService } from '../lib/postsService';
import { geminiService } from '../lib/geminiService';
import { cn } from '../lib/utils';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSemantic, setIsSemantic] = useState(false);
  const [results, setResults] = useState<{ users: any[]; posts: any[] }>({ users: [], posts: [] });
  const [aiInterpretation, setAiInterpretation] = useState<any | null>(null);
  const navigate = useNavigate();

  // Debounced search trigger
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({ users: [], posts: [] });
      setAiInterpretation(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        let data;
        if (isSemantic) {
          data = await geminiService.semanticSearch(trimmed);
          setAiInterpretation(data.aiInterpretation);
        } else {
          data = await searchService.search(trimmed, activeTab);
          setAiInterpretation(null);
        }
        setResults({
          users: data.users || [],
          posts: data.posts || []
        });
      } catch (err: any) {
        console.error("Search error:", err);
        toast.error(err.message || 'Error occurred during search');
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, activeTab, isSemantic]);

  const handleClear = () => {
    setQuery('');
    setResults({ users: [], posts: [] });
  };

  const handleFollowToggle = async (targetUser: any) => {
    try {
      const isCurrentlyFollowing = targetUser.is_following;
      
      // Optimistic UI updates
      setResults(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === targetUser.id 
          ? { 
              ...u, 
              is_following: !isCurrentlyFollowing, 
              followers_count: parseInt(u.followers_count || 0) + (!isCurrentlyFollowing ? 1 : -1)
            } 
          : u
        )
      }));

      const response = await userService.toggleFollow(targetUser.id);
      toast.success(response.following ? `Following @${targetUser.username}` : `Unfollowed @${targetUser.username}`);
    } catch (err: any) {
      toast.error(err.message);
      // Revert search results state if failed
      setResults(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === targetUser.id 
          ? { 
              ...u, 
              is_following: targetUser.is_following, 
              followers_count: targetUser.followers_count
            } 
          : u
        )
      }));
    }
  };

  const handleLikeToggle = async (post: any) => {
    try {
      const isCurrentlyLiked = post.is_liked;

      // Optimistic UI update
      setResults(prev => ({
        ...prev,
        posts: prev.posts.map(p => p.id === post.id
          ? {
              ...p,
              is_liked: !isCurrentlyLiked,
              like_count: parseInt(p.like_count || 0) + (!isCurrentlyLiked ? 1 : -1)
            }
          : p
        )
      }));

      await postsService.toggleLike(post.id);
    } catch (err: any) {
      toast.error(err.message);
      // Revert search results state
      setResults(prev => ({
        ...prev,
        posts: prev.posts.map(p => p.id === post.id
          ? {
              ...p,
              is_liked: post.is_liked,
              like_count: post.like_count
            }
          : p
        )
      }));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-4"
    >
      {/* Search Header Area */}
      <div className="mb-6">
        <h2 className="text-xl font-black tracking-tight text-[#fafafa] mb-2">Search DeoHub</h2>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <p className="text-xs text-zinc-500 max-w-sm">Discover creators, tags, bios, and hot stories matching your keywords.</p>
        </div>
        
        {/* Search Input Control */}
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-4 text-zinc-400">
            <Search size={20} />
          </div>
          <input
            id="search-input-field"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts content, bios, or @usernames..."
            className="w-full rounded-2xl border border-zinc-800 bg-[#121214] py-3.5 pl-12 pr-10 text-sm font-medium text-white placeholder-zinc-500 transition-all focus:border-[#7c3aed] focus:outline-none focus:ring-1 focus:ring-[#7c3aed] shadow-inner"
            autoFocus
          />
          {query && (
            <button 
              id="clear-search-btn"
              onClick={handleClear}
              className="absolute right-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs list with framer motion sliding pill */}
      <div className="mb-6 flex border-b border-zinc-800/80 pb-2 gap-1">
        {(['all', 'users', 'posts'] as const).map((tab) => (
          <button
            key={tab}
            id={`tab-btn-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 md:flex-initial md:px-6 py-2.5 text-xs font-bold uppercase tracking-wider relative transition-colors focus:outline-none",
              activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <span className="relative z-10 flex items-center justify-center gap-1.5 font-bold">
              {tab === 'users' && <Users size={14} />}
              {tab === 'posts' && <FileText size={14} />}
              {tab}
            </span>
            {activeTab === tab && (
              <motion.div
                layoutId="activeSearchTabPill"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-[#7c3aed]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
        </div>
      )}

      {/* Results Rendering Section */}
      {!isLoading && (
        <AnimatePresence mode="popLayout">
          {query.trim() === '' ? (
            // Empty / Prompt State
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 dark:text-zinc-600 border border-dashed border-zinc-900 rounded-3xl"
            >
              <div className="mb-4 rounded-2xl bg-[#121214] p-4 text-[#7c3aed] shadow-lg">
                <TrendingUp size={36} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Search Anything</h3>
              <p className="text-xs max-w-xs text-zinc-500">Find users by username and bio, or locate posts with specific keywords.</p>
            </motion.div>
          ) : (results.users.length === 0 && results.posts.length === 0) ? (
            // No results state
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 bg-[#121214] rounded-2xl border border-zinc-900"
            >
              <p className="text-zinc-400 font-medium mb-1 text-sm">No match found.</p>
              <p className="text-xs text-zinc-600">Double check spelling or search with a different word.</p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* 1. USERS LISTING */}
              {results.users.length > 0 && (activeTab === 'all' || activeTab === 'users') && (
                <div className="space-y-3">
                  {(activeTab === 'all') && (
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#71717a]">Match Profiles ({results.users.length})</h3>
                      <div className="h-px flex-1 bg-zinc-800/80 ml-4"></div>
                    </div>
                  )}
                  <div className="grid gap-3">
                    {results.users.map((item) => (
                      <motion.div
                        key={`user-card-${item.id}`}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-between rounded-xl bg-[#18181b] p-4 border border-zinc-900 hover:border-zinc-800 transition-colors"
                      >
                        <div 
                          className="flex items-center gap-3 cursor-pointer min-w-0"
                          onClick={() => navigate(`/profile/${item.username}`)}
                        >
                          <img 
                            src={item.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username}`} 
                            alt={item.username} 
                            className="h-11 w-11 rounded-full bg-zinc-800 outline outline-1 outline-neutral-800"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white hover:underline truncate">@{item.username}</span>
                              {item.is_verified && (
                                <svg className="h-4 w-4 text-[#3b82f6] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.66.15-.44.23-.91.23-1.4 0-2.45-1.99-4.44-4.44-4.44-.49 0-.96.08-1.4.23-1.44-1.3-2.08-2.18-3.66-2.18s-2.22.88-3.66 2.18c-.44-.15-.91-.23-1.4-.23-2.45 0-4.44 1.99-4.44 4.44 0 .49.08.96.23 1.4C1.38 9.55.5 10.92.5 12.5c0 1.58.88 2.95 2.18 3.66-.15.44-.23.91-.23 1.4 0 2.45 1.99 4.44 4.44 4.44.49 0 .96-.08 1.4-.23 1.44 1.3 2.08 2.18 3.66 2.18s2.22-.88 3.66-2.18c.44.15.91.23 1.4.23 2.45 0 4.44-1.99 4.44-4.44 0-.49-.08-.96-.23-1.4 1.3-.71 2.18-2.08 2.18-3.66zM10 17.5l-4-4 1.41-1.41L10 14.67l6.59-6.59L18 9.5l-8 8z"/>
                                </svg>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                              {item.followers_count || 0} follower{parseInt(item.followers_count) !== 1 && 's'}
                            </p>
                            {item.bio && (
                              <p className="text-xs text-zinc-400 mt-1 line-clamp-1 break-words">{item.bio}</p>
                            )}
                          </div>
                        </div>

                        {/* Follow state interactive button */}
                        <button
                          id={`follow-user-btn-${item.username}`}
                          onClick={() => handleFollowToggle(item)}
                          className={cn(
                            "ml-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black transition-all hover:scale-105 active:scale-95 shrink-0",
                            item.is_following 
                              ? "bg-[#1f1f23] text-zinc-300 hover:bg-[#27272b] border border-zinc-800" 
                              : "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                          )}
                        >
                          {item.is_following ? (
                            <>
                              <UserCheck size={14} />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={14} />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. POSTS LISTING */}
              {results.posts.length > 0 && (activeTab === 'all' || activeTab === 'posts') && (
                <div className="space-y-4">
                  {(activeTab === 'all') && (
                    <div className="flex items-center justify-between pt-2">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#71717a]">Match Posts ({results.posts.length})</h3>
                      <div className="h-px flex-1 bg-zinc-800/80 ml-4"></div>
                    </div>
                  )}
                  <div className="grid gap-4">
                    {results.posts.map((post) => {
                      const avatarUrl = post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username || post.user_id}`;
                      return (
                        <motion.article 
                          key={`post-card-${post.id}`}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="overflow-hidden rounded-2xl bg-[#18181b] p-4 border border-zinc-900 hover:border-zinc-800 transition-colors"
                        >
                          <div className="mb-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                onClick={() => navigate(`/profile/${post.username}`)}
                                className="h-9 w-9 rounded-full p-[1px] bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] cursor-pointer shrink-0"
                              >
                                <img src={avatarUrl} alt={post.username} className="h-full w-full rounded-full border border-zinc-900 bg-zinc-800" />
                              </div>
                              <div>
                                <div 
                                  onClick={() => navigate(`/profile/${post.username}`)}
                                  className="flex items-center gap-1 cursor-pointer"
                                >
                                  <h3 className="text-xs font-bold text-white hover:underline">@{post.username || 'anonymous'}</h3>
                                  {post.is_verified && (
                                    <svg className="h-3.5 w-3.5 text-[#3b82f6]" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.66.15-.44.23-.91.23-1.4 0-2.45-1.99-4.44-4.44-4.44-.49 0-.96.08-1.4.23-1.44-1.3-2.08-2.18-3.66-2.18s-2.22.88-3.66 2.18c-.44-.15-.91-.23-1.4-.23-2.45 0-4.44 1.99-4.44 4.44 0 .49.08.96.23 1.4C1.38 9.55.5 10.92.5 12.5c0 1.58.88 2.95 2.18 3.66-.15.44-.23.91-.23 1.4 0 2.45 1.99 4.44 4.44 4.44.49 0 .96-.08 1.4-.23 1.44 1.3 2.08 2.18 3.66 2.18s2.22-.88 3.66-2.18c.44.15.91.23 1.4.23 2.45 0 4.44-1.99 4.44-4.44 0-.49-.08-.96-.23-1.4 1.3-.71 2.18-2.08 2.18-3.66zM10 17.5l-4-4 1.41-1.41L10 14.67l6.59-6.59L18 9.5l-8 8z"/>
                                    </svg>
                                  )}
                                </div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                  {new Date(post.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <p className="mb-3 text-[14px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
                            {post.content}
                          </p>

                          {post.image_url && (
                            <div className="mb-3 overflow-hidden rounded-xl bg-zinc-900 aspect-video shrink-0">
                              <img src={post.image_url} alt="Post image Attachment" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {post.video_url && (
                            <div className="mb-3 overflow-hidden rounded-xl bg-zinc-900 aspect-video shrink-0">
                              <video src={post.video_url} controls className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                            <div className="flex items-center gap-5">
                              {/* Optimistic Like button toggle */}
                              <button 
                                id={`like-post-btn-${post.id}`}
                                onClick={() => handleLikeToggle(post)}
                                className={cn(
                                  "flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-105",
                                  post.is_liked ? "text-[#7c3aed]" : "text-zinc-500 hover:text-[#7c3aed]"
                                )}
                              >
                                <Heart size={18} fill={post.is_liked ? "currentColor" : "none"} strokeWidth={post.is_liked ? 0 : 2.5} />
                                <span>{post.like_count || 0}</span>
                              </button>
                              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
                                <MessageCircle size={18} strokeWidth={2.5} />
                                <span>Replied</span>
                              </div>
                            </div>
                            <button className="text-zinc-500 hover:text-green-500 transition-colors">
                              <Share2 size={18} strokeWidth={2.5} />
                            </button>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
