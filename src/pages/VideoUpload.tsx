import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { UploadCloud, Video, Image, FileVideo, Film, CheckCircle2, ArrowLeft, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { postsService } from '../lib/postsService';
import { reelsService } from '../lib/reelsService';

export default function VideoUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image' | null>(null);
  const [uploadType, setUploadType] = useState<'post' | 'reel'>('post');
  
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile) return;

    // Determine type
    const isVid = selectedFile.type.startsWith('video/');
    const isImg = selectedFile.type.startsWith('image/');

    if (!isVid && !isImg) {
      toast.error('Only images or MP4 videos are supported on DeoHub.');
      return;
    }

    setFile(selectedFile);
    setMediaType(isVid ? 'video' : 'image');
    // If it is a video, default upload mode to "reel"
    if (isVid) {
      setUploadType('reel');
    } else {
      setUploadType('post');
    }

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl) {
      toast.error('Please select a media file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    // Simulate progressive upload milestones
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 150);

    try {
      if (uploadType === 'reel') {
        // Create as real database reel! We use the loaded Preview URL (base64) as source url
        await reelsService.createReel(previewUrl, caption);
        setUploadProgress(100);
        clearInterval(interval);
        toast.success('Your dynamic video Reel was published successfully! 🚀');
        setTimeout(() => navigate('/reels'), 300);
      } else {
        // Create as standard base64 image/video post
        await postsService.createPost(caption || '⚡ uploaded media preview', previewUrl);
        setUploadProgress(100);
        clearInterval(interval);
        toast.success('Your post with preview media was shared to feed! 💜');
        setTimeout(() => navigate('/'), 300);
      }
    } catch (err: any) {
      clearInterval(interval);
      toast.error(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 select-none">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full border border-zinc-800 bg-[#09090b] text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
            <UploadCloud className="text-[#7c3aed]" size={22} /> Media Hub Upload
          </h2>
          <p className="text-xs text-zinc-500 font-medium">Broadcast premium reels and posts directly to postgreSQL</p>
        </div>
      </div>

      <form onSubmit={handleUploadSubmit} className="space-y-6">

        {/* Drag & Drop Area */}
        {!previewUrl ? (
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive 
                ? "border-[#7c3aed] bg-[#7c3aed]/5 scale-[0.99]" 
                : "border-zinc-850 bg-[#18181b]/50 hover:bg-[#18181b]/80 hover:border-zinc-700"
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*,video/*"
              className="hidden" 
              onChange={handleChange}
            />
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#7c3aed]/20 to-[#3b82f6]/20 border border-zinc-800 flex items-center justify-center text-[#7c3aed] mb-4">
              <UploadCloud size={28} className="animate-pulse" />
            </div>

            <h3 className="font-extrabold text-[#fafafa] uppercase tracking-wider text-sm">Drag and drop file here</h3>
            <p className="text-xs text-zinc-500 mt-1">Accepts ultra-vivid video clips & aesthetic photographs</p>
            <div className="mt-4 flex gap-2">
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <Video size={10} className="text-[#7c3aed]" /> VIDEO REELS
              </span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <Image size={10} className="text-blue-400" /> FEED PHOTOGRAPHY
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-4 overflow-hidden space-y-4">
            
            {/* Header Controls */}
            <div className="flex justify-between items-center text-xs text-zinc-400 border-b border-zinc-800 pb-3">
              <span className="uppercase font-bold tracking-wider flex items-center gap-1.5 text-[#22c55e]">
                <CheckCircle2 size={14} /> Ready to Broadcast ({mediaType})
              </span>
              <button 
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreviewUrl(null);
                  setMediaType(null);
                }}
                className="text-red-400 hover:text-red-300 font-bold uppercase tracking-wider"
              >
                Remove Media
              </button>
            </div>

            {/* Media Canvas Box */}
            <div className="relative aspect-video rounded-xl bg-black border border-zinc-850 overflow-hidden flex items-center justify-center">
              {mediaType === 'video' ? (
                <video src={previewUrl} controls className="max-w-full max-h-72 object-contain" />
              ) : (
                <img src={previewUrl} alt="Preview Upload" className="max-w-full max-h-72 object-contain" />
              )}
            </div>
          </div>
        )}

        {/* Publish Type & Metadata */}
        {previewUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Select Destination Layout */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setUploadType('post')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                  uploadType === 'post' 
                    ? "border-[#7c3aed] bg-[#7c3aed]/10 text-white" 
                    : "border-zinc-800 bg-[#09090b] text-zinc-400 hover:text-white"
                }`}
              >
                <Film size={18} />
                <span className="text-xs font-extrabold uppercase tracking-widest">Feed Post</span>
              </button>
              
              <button 
                type="button"
                disabled={mediaType !== 'video'}
                onClick={() => setUploadType('reel')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all disabled:opacity-30 ${
                  uploadType === 'reel' 
                    ? "border-[#7c3aed] bg-[#7c3aed]/10 text-white" 
                    : "border-zinc-800 bg-[#09090b] text-zinc-400 hover:text-white"
                }`}
              >
                <FileVideo size={18} />
                <span className="text-xs font-extrabold uppercase tracking-widest">Short Reel</span>
              </button>
            </div>

            {mediaType !== 'video' && uploadType === 'reel' && (
              <p className="text-[10px] text-zinc-400 font-bold bg-[#7c3aed]/10 p-2 rounded-xl flex items-center gap-1">
                <AlertTriangle size={12} className="text-[#7c3aed]" /> Reels exclusively support MP4 formats. To post images, please select "Feed Post".
              </p>
            )}

            {/* Caption Input */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider">Remarks / Caption</label>
              <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Hook your audience with keywords first... #neon #vibe" 
                rows={3}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-[#7c3aed]"
              />
            </div>
          </motion.div>
        )}

        {/* Progress bar loader overlay */}
        {isUploading && (
          <div className="space-y-2 p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-zinc-400">
              <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-[#7c3aed]" /> Broadcasting clip</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
              <motion.div 
                className="bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] h-full rounded-full"
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        )}

        {/* Submit action */}
        {previewUrl && (
          <button 
            type="submit"
            disabled={isUploading || (uploadType === 'reel' && mediaType !== 'video')}
            className="w-full py-3.5 rounded-full bg-[#7c3aed] text-white font-extrabold uppercase tracking-widest hover:bg-[#6d28d9] disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#7c3aed]/20"
          >
            {isUploading && <Loader2 size={16} className="animate-spin" />}
            Publish to DeoHub Database
          </button>
        )}

      </form>
    </div>
  );
}
