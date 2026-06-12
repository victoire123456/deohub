import { motion, AnimatePresence } from 'motion/react';
import { Settings, Grid, Bookmark, Users, Loader2, MapPin, Link as LinkIcon, Calendar, Check, ShieldCheck, History, Trash2, Eye, X, Play, Film, Send, Sparkles } from 'lucide-react';
import { User, Post } from '../types';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { userService } from '../lib/userService';
import { authService } from '../lib/authService';
import { toast } from 'sonner';
import { getSocket } from '../lib/socket';

export default function Profile() {
  const { username: profileUsername } = useParams();
  const [activeTab, setActiveTab] = useState('posts');
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [archivedStories, setArchivedStories] = useState<any[]>([]);
  const [selectedArchivedStory, setSelectedArchivedStory] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const isOwnProfile = !profileUsername || profileUsername === currentUser?.username;
  const targetUsername = profileUsername || currentUser?.username;

  useEffect(() => {
    if (isOwnProfile) {
      const rawArch = localStorage.getItem('deohub_stories_archive');
      if (rawArch) {
        try {
          // Filter to only current user's archived stories
          const parsed = JSON.parse(rawArch);
          const filtered = parsed.filter((s: any) => s.userId?.toString() === currentUser?.id?.toString());
          setArchivedStories(filtered);
        } catch (e) {
          console.error('Failed to parse archived stories', e);
        }
      }
    }
  }, [isOwnProfile, currentUser?.id]);

  useEffect(() => {
    if (targetUsername) {
      loadProfileData();
    } else if (!currentUser) {
        navigate('/login');
    }
  }, [targetUsername]);

  // Real-Time profile and post synchronizer
  useEffect(() => {
    const socket = getSocket();

    const handleFollowUpdated = (data: { followerId: number; followingId: number; following: boolean; followersCount: number; followingCount: number }) => {
      setUser(prev => {
        if (!prev) return prev;
        
        if (prev.id === data.followingId) {
          const isMeFollower = currentUser?.id === data.followerId;
          return {
            ...prev,
            followers_count: data.followersCount,
            is_following: isMeFollower ? data.following : prev.is_following
          };
        }
        
        if (prev.id === data.followerId) {
          return {
            ...prev,
            following_count: data.followingCount
          };
        }

        return prev;
      });
    };

    const handlePostCreated = (newPost: any) => {
      if (user && newPost.user_id === user.id) {
        setPosts(prev => {
          if (prev.some(p => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
      }
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

    socket.on('follow_updated', handleFollowUpdated);
    socket.on('post_created', handlePostCreated);
    socket.on('post_like_updated', handlePostLikeUpdated);
    socket.on('post_comment_created', handlePostCommentCreated);
    socket.on('post_deleted', handlePostDeleted);

    return () => {
      socket.off('follow_updated', handleFollowUpdated);
      socket.off('post_created', handlePostCreated);
      socket.off('post_like_updated', handlePostLikeUpdated);
      socket.off('post_comment_created', handlePostCommentCreated);
      socket.off('post_deleted', handlePostDeleted);
    };
  }, [currentUser?.id, user?.id]);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const userData = await userService.getProfile(targetUsername!);
      
      // Fallback custom avatar recovery
      if (userData && userData.email) {
        const backup = localStorage.getItem(`deohub_avatar_backup_${userData.email.toLowerCase()}`);
        if (backup) {
          userData.avatar_url = backup;
        }
      }
      
      setUser(userData);
      
      const userPosts = await userService.getUserPosts(userData.id);
      setPosts(userPosts);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) return;
    try {
      const result = await userService.toggleFollow(user.id);
      setUser(prev => prev ? { 
          ...prev, 
          is_following: result.following,
          followers_count: (prev.followers_count || 0) + (result.following ? 1 : -1)
      } : null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleVerify = async () => {
    if (!user) return;
    try {
      const targetVerifyState = !user.is_verified;
      const result = await userService.verifyUser(user.id, targetVerifyState);
      setUser(prev => prev ? {
        ...prev,
        is_verified: result.is_verified
      } : null);
      if (result.is_verified) {
        toast.success(`@${user.username} is now verified with Blue Tick checkbadge! 🌟`);
      } else {
        toast.info(`Verification is removed for @${user.username}.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification update failed.');
    }
  };

  const handleDeleteArchivedStory = (storyId: string | number) => {
    const confirmDelete = window.confirm('Are you sure you want to permanently delete this story from your archive?');
    if (!confirmDelete) return;

    const raw = localStorage.getItem('deohub_stories_archive');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const updated = parsed.filter((s: any) => s.id?.toString() !== storyId.toString());
        localStorage.setItem('deohub_stories_archive', JSON.stringify(updated));
        setArchivedStories(prev => prev.filter(s => s.id?.toString() !== storyId.toString()));
        setSelectedArchivedStory(null);
        toast.success('Archived story permanent deleted successfully!');
      } catch (err) {
        toast.error('Failed to delete archived story');
      }
    }
  };

  const handleReshareStory = (story: any) => {
    try {
      const rawActive = localStorage.getItem('deohub_stories');
      let activeStories: any[] = [];
      if (rawActive) {
        try {
          activeStories = JSON.parse(rawActive);
        } catch (e) {
          console.error(e);
        }
      }

      const meUsername = currentUser?.username || 'Guest';
      const meAvatar = currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${meUsername}`;

      const resharedItem = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: meUsername,
        avatar: meAvatar,
        imageUrl: story.imageUrl,
        caption: story.caption || '',
        created_at: new Date().toISOString(),
        userId: currentUser?.id || 'guest'
      };

      const updated = [resharedItem, ...activeStories];
      localStorage.setItem('deohub_stories', JSON.stringify(updated));

      // Remove the item from deohub_stories_archive to "move" it back to active feed
      const rawArchive = localStorage.getItem('deohub_stories_archive');
      if (rawArchive) {
        try {
          const parsed = JSON.parse(rawArchive);
          const updatedArchive = parsed.filter((s: any) => s.id?.toString() !== story.id?.toString());
          localStorage.setItem('deohub_stories_archive', JSON.stringify(updatedArchive));
          setArchivedStories(prev => prev.filter(s => s.id?.toString() !== story.id?.toString()));
        } catch (e) {
          console.error('Failed to update story archive during re-sharing', e);
        }
      }

      setSelectedArchivedStory(null);
      
      // Navigate to homepage to view the live story feed
      toast.success('Archived story successfully moved back to your live Story Feed! ✨');
      navigate('/');
    } catch (err) {
      toast.error('Could not re-share this story.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <h2 className="text-xl font-bold mb-2">User not found</h2>
        <p className="text-zinc-500">The user you are looking for does not exist or has been removed.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-[#7c3aed] font-bold">Back to Home</button>
      </div>
    );
  }

  const avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="px-4 pb-6">
        <div className="mb-6 flex items-start justify-between">
          <div className="relative">
            <div className="h-28 w-28 rounded-3xl bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] p-1 shadow-xl shadow-[#7c3aed]/20">
                <img src={avatarUrl} alt={user.username} className="h-full w-full rounded-[24px] object-cover bg-white border-2 border-white dark:border-[#09090b] dark:bg-[#18181b]" />
            </div>
          </div>
          {isOwnProfile && (
            <button className="rounded-full bg-zinc-100 p-2.5 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-[#18181b] dark:text-[#a1a1aa] dark:hover:bg-[#27272a] dark:hover:text-[#fafafa]">
              <Settings size={22} />
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-[#fafafa]">{user.username}</h2>
            {user.is_verified && (
              <span className="inline-flex items-center justify-center bg-[#3b82f6] text-white rounded-full h-5.5 w-5.5 shadow-sm" title="Verified User">
                <Check size={11} strokeWidth={4.5} />
              </span>
            )}
            {user.role === 'admin' && (
              <span className="bg-amber-100/80 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/30">
                ADMIN
              </span>
            )}
          </div>
          <p className="font-bold text-[#7c3aed]">
            {user.role === 'admin' ? 'DeoHub Administrator ⚡️' : 'User Explorer'}
          </p>
        </div>

        <p className="mb-6 text-[15px] leading-relaxed font-medium text-zinc-600 dark:text-[#a1a1aa]">
          {user.bio || "No bio yet. Tap edit to add one!"}
        </p>

        <div className="flex gap-8 mb-8">
          <div className="flex flex-col">
            <span className="text-xl font-black text-zinc-900 dark:text-[#fafafa]">{user.posts_count || 0}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#71717a]">Posts</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-zinc-900 dark:text-[#fafafa]">{user.followers_count || 0}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#71717a]">Followers</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-zinc-900 dark:text-[#fafafa]">{user.following_count || 0}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#71717a]">Following</span>
          </div>
        </div>

        <div className="flex gap-3">
          {isOwnProfile ? (
            <>
              <button 
                onClick={() => navigate('/edit-profile')}
                className="flex-1 rounded-2xl bg-[#7c3aed] py-4 text-center text-sm font-bold text-white shadow-xl shadow-[#7c3aed]/20 active:scale-95 transition-all hover:bg-[#6d28d9]"
              >
                Edit Profile
              </button>
              <button 
                onClick={() => {
                   authService.logout();
                   navigate('/login');
                }}
                className="flex-1 rounded-2xl bg-zinc-100 py-4 text-center text-sm font-bold text-zinc-900 shadow-sm active:scale-95 transition-all dark:bg-[#18181b] dark:text-[#fafafa] dark:border dark:border-[#27272a] dark:hover:bg-[#27272a]"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleFollow}
                className={`flex-1 rounded-2xl py-4 text-center text-sm font-bold shadow-xl transition-all active:scale-95 ${
                    user.is_following 
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-[#27272a] dark:text-[#fafafa] shadow-none' 
                        : 'bg-[#7c3aed] text-white shadow-[#7c3aed]/20 hover:bg-[#6d28d9]'
                }`}
              >
                {user.is_following ? 'Following' : 'Follow'}
              </button>
              <button 
                onClick={() => navigate('/chats')}
                className="flex-1 rounded-2xl bg-zinc-100 py-4 text-center text-sm font-bold text-zinc-900 shadow-sm active:scale-95 transition-all dark:bg-[#18181b] dark:text-[#fafafa] dark:border dark:border-[#27272a] dark:hover:bg-[#27272a]"
              >
                Message
              </button>
            </>
          )}
        </div>

        {!isOwnProfile && currentUser?.role === 'admin' && (
          <div className="mt-3">
            <button 
              onClick={handleToggleVerify}
              className={`w-full rounded-2xl py-3.5 text-center text-sm font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                user.is_verified 
                  ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/10'
              }`}
            >
              <ShieldCheck size={16} />
              {user.is_verified ? 'Revoke Verification (Remove Blue Tick)' : 'Verify Ability (Grant Blue Tick)'}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-[#27272a]">
        <div className="flex px-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'posts', icon: Grid, label: 'Posts' },
            ...(isOwnProfile ? [{ id: 'archive', icon: History, label: 'Story Archive' }] : []),
            { id: 'saved', icon: Bookmark, label: 'Saved' },
            { id: 'tagged', icon: Users, label: 'Tagged' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 transition-all min-w-[100px] ${
                activeTab === tab.id 
                  ? 'border-[#7c3aed] text-[#7c3aed]' 
                  : 'border-transparent text-zinc-400 dark:text-[#71717a]'
              }`}
            >
              <tab.icon size={18} fill={activeTab === tab.id ? "currentColor" : "none"} />
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'posts' ? (
        posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 p-1 pb-20">
            {posts.map(post => (
                <div 
                    key={post.id} 
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                    onClick={() => navigate('/')}
                >
                    {post.image_url ? (
                        <img src={post.image_url} alt="post" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : post.video_url ? (
                        <div className="relative h-full w-full">
                          <video src={post.video_url} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" muted playsInline />
                          <div className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white">
                            <Film size={12} />
                          </div>
                        </div>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100 dark:bg-[#18181b] text-zinc-400 text-xs px-2 text-center group-hover:bg-zinc-200 dark:group-hover:bg-[#27272a] transition-colors">
                            {post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content}
                        </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex items-center gap-4 text-white font-bold">
                            <span className="flex items-center gap-1">
                                <Bookmark size={18} fill="white" /> {post.content.split(' ').length % 4}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-[#18181b] flex items-center justify-center mb-4">
                    <Grid size={32} className="text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-[#fafafa]">No Posts Yet</h3>
                <p className="text-zinc-500 dark:text-[#71717a] max-w-[200px]">When {user.username} shares a post, it will appear here.</p>
            </div>
        )
      ) : activeTab === 'archive' && isOwnProfile ? (
        archivedStories.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5 p-1.5 pb-20">
            {archivedStories.map(story => (
              <div 
                key={story.id}
                onClick={() => setSelectedArchivedStory(story)}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800"
              >
                {story.imageUrl.startsWith('data:video') || story.imageUrl.endsWith('.mp4') ? (
                  <div className="w-full h-full relative">
                    <video src={story.imageUrl} className="w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-opacity" muted />
                    <Play className="absolute top-2 right-2 text-white h-4.5 w-4.5 drop-shadow bg-black/30 p-1 rounded" />
                  </div>
                ) : (
                  <img src={story.imageUrl} alt="Archived Story" className="w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-all duration-300 group-hover:scale-105" />
                )}
                
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <span className="text-[8px] font-bold text-zinc-300 truncate block uppercase tracking-wide">
                    {new Date(story.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="text-white h-6 w-6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="h-16 w-16 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center mb-4 shadow-inner">
              <History size={32} className="text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-[#fafafa] tracking-tight">Your Story Archive is Empty</h3>
            <p className="text-xs text-zinc-500 dark:text-[#71717a] max-w-sm mt-1.5 leading-relaxed font-medium">
              We automatically preserve your expired stories here after 24 hours so you never lose your special memories, or you can archive active stories instantly using the <strong className="text-amber-500">Archive</strong> button!
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-[#fafafa]">Coming Soon</h3>
            <p className="text-zinc-500 dark:text-[#71717a]">This feature is part of the next big DecoHub update!</p>
        </div>
      )}

      {/* Lightbox Modal for Archived Story Preview */}
      <AnimatePresence>
        {selectedArchivedStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-[420px] h-[80vh] max-h-[660px] rounded-3xl overflow-hidden bg-zinc-950 flex flex-col border border-zinc-900 shadow-2xl text-white outline-none"
            >
              {/* Header */}
              <div className="absolute top-4 left-0 right-0 z-20 px-4 py-1 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full border border-zinc-800 bg-zinc-900 overflow-hidden flex items-center justify-center">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[#7c3aed] flex items-center justify-center text-xs font-bold text-white uppercase">
                        {user?.username?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-black tracking-wide">
                      @{user?.username || 'user'}
                    </h5>
                    <span className="text-[8px] text-zinc-300 font-bold uppercase tracking-wider block">
                      Archived • {new Date(selectedArchivedStory.created_at).toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'})}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => handleReshareStory(selectedArchivedStory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all cursor-pointer shadow-md"
                    title="Re-share story back to active timeline"
                  >
                    <Send size={10} /> Re-share to Story
                  </button>
                  <button 
                    onClick={() => handleDeleteArchivedStory(selectedArchivedStory.id)}
                    className="p-2 rounded-xl bg-rose-950/60 border border-rose-900/40 text-rose-400 hover:bg-rose-900 hover:text-white transition-all cursor-pointer"
                    title="Delete permanently from archive"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setSelectedArchivedStory(null)}
                    className="p-2 rounded-xl bg-zinc-900/80 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Story Asset Canvas */}
              <div className="relative flex-1 bg-zinc-950 flex items-center justify-center w-full h-full overflow-hidden">
                {selectedArchivedStory.imageUrl.startsWith('data:video') || 
                 selectedArchivedStory.imageUrl.endsWith('.mp4') ? (
                  <video 
                    src={selectedArchivedStory.imageUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    controls
                    playsInline
                  />
                ) : (
                  <img 
                    referrerPolicy="no-referrer"
                    src={selectedArchivedStory.imageUrl} 
                    alt="Archived Story Preview" 
                    className="w-full h-full object-cover-safe select-none"
                  />
                )}
              </div>

              {/* Footer */}
              <div className="p-5 bg-gradient-to-t from-black via-black/95 to-transparent z-20">
                <p className="text-xs text-zinc-100 font-bold leading-relaxed mb-1">
                  {selectedArchivedStory.caption || "No caption provided."}
                </p>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block">
                  Preserved in your memory journal
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
