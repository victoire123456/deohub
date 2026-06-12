import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, MapPin, X, ArrowLeft, Loader2, Sparkles, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { postsService } from '../lib/postsService';
import { geminiService } from '../lib/geminiService';
import { authService } from '../lib/authService';
import { userService } from '../lib/userService';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiCaptions, setAiCaptions] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [userAvatar, setUserAvatar] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (currentUser?.username) {
      userService.getProfile(currentUser.username)
        .then(profile => {
          if (profile?.avatar_url) {
            setUserAvatar(profile.avatar_url);
          } else {
            setUserAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.username)}`);
          }
        })
        .catch(() => {
          setUserAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.username || 'mystic')}`);
        });
    } else {
      setUserAvatar('https://api.dicebear.com/7.x/avataaars/svg?seed=Guest');
    }
  }, []);

  const handleAiCaption = async () => {
    if (!content.trim()) {
        toast.info('Enter a topic, keyword, or sentence in the box first to generate captions!');
        return;
    }
    
    setIsAiLoading(true);
    setAiCaptions([]);
    try {
      const captions = await geminiService.generateCaptions(content);
      if (captions && captions.length > 0) {
        setAiCaptions(captions);
        toast.success('AI Captions generated!');
      } else {
        toast.error('No captions returned.');
      }
    } catch (err: any) {
      toast.error('AI Caption failed: ' + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiOptimize = async () => {
    if (!content.trim()) {
      toast.info('Please write something in the input box first to optimize!');
      return;
    }
    setIsAiLoading(true);
    try {
      const response = await geminiService.chat(`Rewrite the following social media post text to make it extremely engaging, professional, readable, and properly formatted. Focus on a high-conversion social hook. Return ONLY the rewritten post text and nothing else.\n\nText: "${content}"`);
      if (response) {
        setContent(response);
        toast.success('Post copy optimized! Spark on. ✨');
      }
    } catch (err: any) {
      toast.error('Failed to optimize text: ' + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (!content.trim()) {
      toast.info('Write your draft content first to analyze metrics!');
      return;
    }
    setIsAiAnalyzing(true);
    setAiAnalysis(null);
    try {
      const analysis = await geminiService.analyzePostCreation(content);
      setAiAnalysis(analysis);
      toast.success('AI Post audit completed!');
    } catch (err: any) {
      toast.error('Post audit failed: ' + err.message);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      await postsService.createPost(content, image || undefined, video || undefined);
      toast.success('Post shared to your feed! 🚀');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear video when selecting image
      setVideo(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear image when selecting video
      setImage(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#09090b] md:relative md:inset-auto md:h-auto md:rounded-2xl md:p-6 md:shadow-2xl dark:md:border dark:md:border-[#27272a] dark:md:bg-[#18181b]"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-[#27272a] md:border-none md:p-0">
        <button 
          onClick={() => navigate(-1)}
          className="md:hidden"
        >
          <ArrowLeft size={24} className="text-zinc-900 dark:text-[#fafafa]" />
        </button>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-[#fafafa] md:mb-4 md:text-xl">Create Post</h2>
        <button 
          onClick={handlePost}
          disabled={!content.trim() || isLoading}
          className="flex items-center gap-2 rounded-full bg-[#7c3aed] px-6 py-2 text-sm font-bold text-white transition-all hover:bg-[#6d28d9] disabled:opacity-50 active:scale-95 shadow-lg shadow-[#7c3aed]/20"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          Post
        </button>
      </div>

      <div className="flex-1 p-4 md:p-0 overflow-y-auto">
        <div className="flex gap-4">
          <img src={userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.username || 'mystic')}`} alt="Me" className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-[#27272a] object-cover" />
          <div className="flex-1">
            <textarea
              autoFocus
              placeholder="What's on your mind?"
              className="w-full resize-none border-none bg-transparent pt-2 text-lg focus:outline-none focus:ring-0 text-zinc-900 dark:text-[#fafafa] placeholder:text-zinc-400 dark:placeholder:text-[#71717a]"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {image && (
              <div className="relative mt-4 group">
                <img src={image} alt="Selected" className="rounded-xl w-full max-h-80 object-cover border border-zinc-200 dark:border-[#27272a]" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {video && (
              <div className="relative mt-4 group">
                <video 
                  src={video} 
                  controls 
                  className="rounded-xl w-full max-h-80 object-cover border border-zinc-200 dark:border-[#27272a]" 
                />
                <button 
                  onClick={() => setVideo(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {aiCaptions.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200/50 dark:border-[#27272a] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#7c3aed] flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles size={14} className="text-[#7c3aed]" /> AI Suggested Captions
                  </span>
                  <button 
                    onClick={() => setAiCaptions([])}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Clear Suggestions
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {aiCaptions.map((caption, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setContent(caption);
                        setAiCaptions([]);
                        toast.success('Selected Caption applied!');
                      }}
                      className="w-full text-left p-3.5 rounded-xl bg-white dark:bg-[#1c1c1e] hover:bg-zinc-100 dark:hover:bg-[#27272a] border border-zinc-100 dark:border-[#27272a] text-sm text-zinc-700 dark:text-zinc-300 transition-all active:scale-[0.99] shadow-sm font-medium hover:border-[#7c3aed]/30 dark:hover:border-[#7c3aed]/30 cursor-pointer"
                    >
                      {caption}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {aiAnalysis && (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#1d102e] via-zinc-950 to-zinc-900 border border-purple-900/45 space-y-3.5 shadow-xl select-none">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-xs font-black text-purple-400 flex items-center gap-1.5 uppercase tracking-widest animate-pulse">
                    <Sparkles size={14} className="text-purple-400" /> AI Virality Audit
                  </span>
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-full">
                    Quality Rating: {aiAnalysis.qualityScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Suggested Category</p>
                    <p className="font-extrabold text-purple-300 mt-0.5">{aiAnalysis.category}</p>
                  </div>
                  <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Optimized Publishing Time</p>
                    <p className="font-extrabold text-emerald-400 mt-0.5">{aiAnalysis.bestTimeToPublish}</p>
                  </div>
                </div>

                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Recommended Audience</p>
                  <p className="font-medium text-zinc-300 leading-relaxed">{aiAnalysis.recommendedAudience}</p>
                </div>

                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Writing Insights</p>
                  <p className="font-sans text-[11px] text-[#fafafa] leading-relaxed select-text">{aiAnalysis.suggestions}</p>
                </div>

                {aiAnalysis.hashtags && aiAnalysis.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {aiAnalysis.hashtags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        onClick={() => {
                          setContent(prev => `${prev} ${tag}`);
                          toast.success(`Appended ${tag} to draft!`);
                        }}
                        className="text-[10px] font-black tracking-wider text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 px-2.5 py-1 rounded-full cursor-pointer transition-colors active:scale-95 duration-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-100 p-4 dark:border-[#27272a] md:mt-6 md:border-t-0 md:pt-4">
        <input 
          type="file" 
          hidden 
          ref={fileInputRef} 
          accept="image/*" 
          onChange={handleImageSelect}
        />
        <input 
          type="file" 
          hidden 
          ref={videoInputRef} 
          accept="video/*" 
          onChange={handleVideoSelect}
        />
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:hover:bg-[#3f3f46] cursor-pointer"
          >
            <ImageIcon size={18} className="text-[#3b82f6]" strokeWidth={2.5} />
            <span>Image</span>
          </button>
          <button 
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:hover:bg-[#3f3f46] cursor-pointer"
          >
            <Film size={18} className="text-emerald-500" strokeWidth={2.5} />
            <span>Video</span>
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-[#27272a] dark:text-[#a1a1aa] dark:hover:bg-[#3f3f46] cursor-pointer">
            <MapPin size={18} className="text-[#ef4444]" strokeWidth={2.5} />
            <span>Location</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
