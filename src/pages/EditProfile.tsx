import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Camera, 
  Loader2, 
  Upload, 
  RefreshCw, 
  Sparkles, 
  Image as ImageIcon,
  Check,
  Palette,
  Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../lib/userService';
import { authService } from '../lib/authService';
import { toast } from 'sonner';

const DICEBEAR_STYLES = [
  { name: 'Animated Us', id: 'avataaars' },
  { name: 'Fantasy Adventurer', id: 'adventurer' },
  { name: 'Artist Lorelei', id: 'lorelei' },
  { name: 'Pixel Art', id: 'pixel-art' },
  { name: 'Emojis', id: 'fun-emoji' },
  { name: 'Futuristic Bots', id: 'bottts' }
];

const PRESET_SEEDS = ['Shadow', 'Quantum', 'Nebula', 'Deo', 'Pulse', 'Spark', 'Solstice', 'Zenith'];

export default function EditProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Custom Studio controllers
  const [studioTab, setStudioTab] = useState<'upload' | 'generate' | 'preset'>('generate');
  const [selectedStyle, setSelectedStyle] = useState('avataaars');
  const [seedText, setSeedText] = useState('');
  
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (currentUser) {
      loadProfile();
      setSeedText(currentUser.username || 'mystic');
    }
  }, []);

  const loadProfile = async () => {
    if (!currentUser) return;
    try {
      const data = await userService.getProfile(currentUser.username);
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || '');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image type (jpeg, png, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // High quality scale downs to fit 240x240 px nicely with safe sizes
        const canvas = document.createElement('canvas');
        const RESIZE_DIM = 240;
        
        let width = img.width;
        let height = img.height;
        
        // Match square crop dimensions
        const minDim = Math.min(width, height);
        const sourceX = (width - minDim) / 2;
        const sourceY = (height - minDim) / 2;

        canvas.width = RESIZE_DIM;
        canvas.height = RESIZE_DIM;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Centered cropping + downscaling
          ctx.drawImage(
            img, 
            sourceX, sourceY, minDim, minDim, 
            0, 0, RESIZE_DIM, RESIZE_DIM
          );
          
          try {
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.85);
            setAvatarUrl(compressedUrl);
            toast.success('Local image scaled & attached successfully!');
          } catch (canvasErr) {
            console.error(canvasErr);
            toast.error('Could not process this image format. Try entering a URL.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const generateDicebear = (styleId: string, customSeed: string) => {
    const formatted = customSeed.trim() || 'avatar';
    const finalUrl = `https://api.dicebear.com/7.x/${styleId}/svg?seed=${encodeURIComponent(formatted)}`;
    setAvatarUrl(finalUrl);
  };

  // Handle sudden seed/style update
  const handleStyleSelect = (id: string) => {
    setSelectedStyle(id);
    generateDicebear(id, seedText);
  };

  const handleSeedInput = (val: string) => {
    setSeedText(val);
    generateDicebear(selectedStyle, val);
  };

  const handleRandomize = () => {
    const randomWords = ['Pulse', 'Neon', 'Cosmic', 'Solar', 'Deo', 'Wave', 'Vibe', 'Prism', 'Matrix', 'Zen'];
    const randomString = randomWords[Math.floor(Math.random() * randomWords.length)] + Math.floor(Math.random() * 1000);
    setSeedText(randomString);
    generateDicebear(selectedStyle, randomString);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updatedData = await userService.updateProfile(bio, avatarUrl);
      
      // Save in permanent local fallback cache
      if (currentUser?.email) {
        localStorage.setItem(`deohub_avatar_backup_${currentUser.email.toLowerCase()}`, avatarUrl);
      }

      const currentLocally = localStorage.getItem('user');
      if (currentLocally) {
        const parsed = JSON.parse(currentLocally);
        localStorage.setItem('user', JSON.stringify({ 
          ...parsed, 
          bio: updatedData.bio, 
          avatar_url: updatedData.avatar_url 
        }));
      }
      toast.success('Your profile ecosystem has updated!');
      navigate(`/profile/${currentUser?.username}`);
    } catch (err: any) {
      toast.error(err.message || 'Ecosystem update failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="px-4 pb-20 max-w-lg mx-auto"
    >
      {/* Sticky Header */}
      <div className="mb-6 flex items-center gap-4 py-3 sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-zinc-900">
        <button 
          id="back-profile-btn"
          onClick={() => navigate(-1)}
          className="rounded-full p-2 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-white">Modify Profile</h2>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Core Profile Preview */}
        <div className="flex flex-col items-center justify-center p-6 bg-[#121214] border border-zinc-900 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-[#7c3aed]/10 blur-2xl rounded-full" />
          
          <div 
            className="relative group cursor-pointer transition-transform hover:scale-105"
            onClick={triggerFileSelect}
          >
            <div className="h-28 w-28 rounded-full overflow-hidden bg-zinc-950 p-[3px] border-2 border-dashed border-zinc-800 group-hover:border-[#7c3aed] transition-colors relative">
              <img 
                src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`} 
                alt="Profile Preview" 
                className="h-full w-full rounded-full object-cover bg-zinc-900"
              />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </div>
          </div>
          <span className="mt-3 text-[10px] font-black uppercase text-[#7c3aed] bg-[#7c3aed]/10 px-3 py-1 rounded-full tracking-wider">
            Curated Identity
          </span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Change Avatar Studio Tab Controllers */}
        <div className="bg-[#121214] border border-zinc-900 rounded-3xl p-5 space-y-4">
          <div className="flex bg-zinc-950/80 p-1.5 rounded-2xl border border-zinc-900">
            <button
              id="studio-tab-generate"
              type="button"
              onClick={() => setStudioTab('generate')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                studioTab === 'generate' ? 'bg-[#7c3aed] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Sparkles size={14} />
              AI Studio
            </button>
            <button
              id="studio-tab-upload"
              type="button"
              onClick={() => setStudioTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                studioTab === 'upload' ? 'bg-[#7c3aed] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Upload size={14} />
              Upload Photo
            </button>
            <button
              id="studio-tab-preset"
              type="button"
              onClick={() => setStudioTab('preset')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                studioTab === 'preset' ? 'bg-[#7c3aed] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Palette size={14} />
              Default Presets
            </button>
          </div>

          <AnimatePresence mode="wait">
            {studioTab === 'generate' && (
              <motion.div
                key="generate-engine"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4"
              >
                {/* Style Packs Slider/Scroller */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
                    1. Choose Vector Style Pack
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DICEBEAR_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleStyleSelect(style.id)}
                        className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between ${
                          selectedStyle === style.id 
                            ? 'bg-[#7c3aed]/10 border-[#7c3aed] text-[#c084fc]' 
                            : 'bg-zinc-950/60 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <span>{style.name}</span>
                        {selectedStyle === style.id && <Check size={12} className="text-[#c084fc]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seed customizer term */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">
                    2. Customize Seed Word or Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="seed-identifier-input"
                      type="text"
                      value={seedText}
                      onChange={(e) => handleSeedInput(e.target.value)}
                      placeholder="Type unique seed..."
                      className="flex-1 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-medium text-white border border-zinc-900 focus:border-[#7c3aed] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleRandomize}
                      className="bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 p-2.5 rounded-xl transition-all"
                      title="Generate Randomized Terms"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {studioTab === 'upload' && (
              <motion.div
                key="upload-engine"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4"
              >
                {/* Upload dragbox */}
                <div 
                  onClick={triggerFileSelect}
                  className="border border-dashed border-zinc-800 hover:border-[#7c3aed] bg-zinc-950/50 hover:bg-zinc-950/90 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="rounded-full bg-zinc-900 p-3 text-zinc-400 group-hover:text-white transition-colors">
                    <Upload size={22} />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-300">Click to import image file</h4>
                  <p className="text-[10px] text-zinc-500 max-w-[200px]">Supports PNG, JPEG, GIF. Automatically resized and optimized on-the-fly.</p>
                </div>

                {/* Direct Manual Field (Fallback) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">
                    Or input custom image address (URL)
                  </label>
                  <input
                    id="url-avatar-input"
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar_image.jpg"
                    className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-medium text-white border border-zinc-900 focus:border-[#7c3aed] focus:outline-none"
                  />
                </div>
              </motion.div>
            )}

            {studioTab === 'preset' && (
              <motion.div
                key="preset-engine"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-3"
              >
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">
                  Select Pre-designed Cosmic Identities
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {PRESET_SEEDS.map((preset) => {
                    const presetUrl = `https://api.dicebear.com/7.x/miniavs/svg?seed=${preset}`;
                    const isSelected = avatarUrl === presetUrl;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAvatarUrl(presetUrl)}
                        className={`relative rounded-xl overflow-hidden aspect-square border bg-zinc-950 p-1 flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                          isSelected ? 'border-[#7c3aed] ring-1 ring-[#7c3aed]' : 'border-zinc-900 hover:border-zinc-700'
                        }`}
                      >
                        <img 
                          src={presetUrl} 
                          alt={preset} 
                          className="h-full w-full object-cover rounded-lg" 
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-[#7c3aed] text-white rounded-full p-0.5 shadow">
                            <Check size={8} strokeWidth={4} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Bio Paragraph block */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-[#71717a]">Bio Details</label>
          <textarea 
            id="bio-textarea-input"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Introduce your mind, your vibes, or your custom background..."
            className="w-full rounded-2xl bg-zinc-100 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-900 py-4 px-4 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7c3aed] resize-none"
          />
        </div>

        {/* Save button */}
        <button 
          id="save-profile-btn"
          disabled={isLoading}
          className="w-full rounded-2xl bg-[#7c3aed] py-4 text-center text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-[#7c3aed]/10 hover:shadow-[#7c3aed]/20 active:scale-[0.98] transition-all hover:bg-[#6d28d9] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          Apply Modifications
        </button>

        {/* Advanced System Administration Setting */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-900 mt-6 space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]">
            Advanced System Settings
          </h4>
          <div className="bg-zinc-100 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-[#c084fc] shrink-0">
                <Database size={18} />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Database Center</h5>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                  Clean and seed database tables, manage connection parameters, configure mock records, and check systems health.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/database-setup')}
              className="py-2 px-3.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-950 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-350 dark:border-zinc-850 text-xs font-black uppercase tracking-wider transition-all hover:scale-103 shrink-0"
            >
              Launch Core
            </button>
          </div>
        </div>

      </form>
    </motion.div>
  );
}

