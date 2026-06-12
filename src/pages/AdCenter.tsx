import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, TrendingUp, BarChart3, Rocket, DollarSign, Eye, MousePointer, 
  ArrowLeft, Loader2, PlayCircle, PauseCircle, Trash2, Edit2, Check,
  Zap, X, Upload, FileText, Globe, Share2, Mail, ShieldAlert, BadgeHelp, CheckCircle2, CreditCard
} from 'lucide-react';
import { adsService } from '../lib/adsService';
import { postsService } from '../lib/postsService';
import { authService } from '../lib/authService';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface AdCampaign {
  id: number;
  user_id: number;
  title: string;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  budget: string | number;
  status: string;
  clicks: number;
  impressions: number;
  created_at: string;
  description?: string;
  category?: string;
  project_files_url?: string;
  cv_url?: string;
  portfolio_url?: string;
  website_url?: string;
  social_links?: any;
  contact_info?: string;
  cta_text?: string;
  is_premium?: boolean;
  payment_reference?: string;
  payment_status?: string;
  screenshots?: string[];
  views?: number;
  reach?: number;
  engagement?: number;
}

interface Post {
  id: number;
  content: string;
  image_url?: string;
  created_at: string;
}

const CATEGORIES = [
  'Projects',
  'Applications',
  'Websites',
  'Companies',
  'Services',
  'Products',
  'Personal brands',
  'Portfolios',
  'CVs',
  'Skills'
];

const CTA_OPTIONS = [
  'Visit Website',
  'Download App',
  'Hire Me',
  'View Portfolio',
  'Apply Now',
  'Get Quote',
  'Learn More'
];

export default function AdCenter() {
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'analytics' | 'campaigns' | 'boost' | 'admin'>('analytics');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filter Categories in preview
  const [selectedPreviewCategory, setSelectedPreviewCategory] = useState<string>('All');

  // Ad creation form states
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adCategory, setAdCategory] = useState('Projects');
  const [adImage, setAdImage] = useState('');
  const [adLink, setAdLink] = useState('');
  const [adPortfolioLink, setAdPortfolioLink] = useState('');
  const [adWebsiteLink, setAdWebsiteLink] = useState('');
  const [adContactInfo, setAdContactInfo] = useState('');
  const [adCtaText, setAdCtaText] = useState('Learn More');
  
  // Simulated files uploads state
  const [uploadedFolderFiles, setUploadedFolderFiles] = useState<string[]>([]);
  const [uploadedCVFile, setUploadedCVFile] = useState<string | null>(null);
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialLinkedIn, setSocialLinkedIn] = useState('');
  const [socialGitHub, setSocialGitHub] = useState('');

  // Premium selection
  const [premiumPlan, setPremiumPlan] = useState<'basic' | 'spotlight' | 'enterprise'>('basic');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // Editing Campaign
  const [editingAd, setEditingAd] = useState<AdCampaign | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBudget, setEditBudget] = useState<number>(0);

  // Boost Post state
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [boostBudget, setBoostBudget] = useState(100);
  const [isBoostingPost, setIsBoostingPost] = useState(false);
  const [isCreatingAd, setIsCreatingAd] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const adsList = await adsService.getAds();
      setAds(adsList || []);

      const postsList = await postsService.getPosts();
      const user = authService.getCurrentUser();
      const userPosts = postsList.filter((p: any) => p.user_id === user?.id || p.username === user?.username);
      setPosts(userPosts);
    } catch (err: any) {
      toast.error('Failed to load advertisement data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleZipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const names = Array.from(files).map((f: any) => f.name);
      setUploadedFolderFiles(prev => [...prev, ...names]);
      toast.success(`${files.length} project asset file(s) aggregated!`);
    }
  };

  const handleCVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedCVFile(file.name);
      toast.success(`CV Document "${file.name}" linked successfully!`);
    }
  };

  const getPlanPrice = () => {
    if (premiumPlan === 'basic') return 25;
    if (premiumPlan === 'spotlight') return 100;
    return 500;
  };

  const triggerDeployFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim() || !adLink.trim()) {
      toast.error('Campaign title and Destination link are required.');
      return;
    }
    // Open Credit Card secure checkout modal
    setIsCheckoutOpen(true);
  };

  const processPaymentAndDeploy = async () => {
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim() || !cardName.trim()) {
      toast.error('Please input valid card credentials for verification.');
      return;
    }

    setIsCreatingAd(true);
    setIsCheckoutOpen(false);

    try {
      const budget = getPlanPrice();
      const paymentRef = "DEO-CREDIT-" + Math.floor(100000 + Math.random() * 900000);
      
      const payload = {
        title: adTitle,
        description: adDescription,
        category: adCategory,
        imageUrl: adImage || null,
        videoUrl: null,
        linkUrl: adLink,
        budget,
        portfolio_url: adPortfolioLink || null,
        website_url: adWebsiteLink || null,
        contact_info: adContactInfo || null,
        cta_text: adCtaText,
        is_premium: premiumPlan !== 'basic',
        payment_reference: paymentRef,
        payment_status: 'paid',
        project_files_url: uploadedFolderFiles.length > 0 ? uploadedFolderFiles.join(', ') : null,
        cv_url: uploadedCVFile || null,
        social_links: {
          twitter: socialTwitter,
          linkedin: socialLinkedIn,
          github: socialGitHub
        }
      };

      await adsService.createAd(payload);
      toast.success(`Dynamic Ad ${premiumPlan.toUpperCase()} is now fully live! (Paid via ${paymentRef}) 🚀`);
      
      // Reset form fields
      setAdTitle('');
      setAdDescription('');
      setAdImage('');
      setAdLink('');
      setAdPortfolioLink('');
      setAdWebsiteLink('');
      setAdContactInfo('');
      setAdCtaText('Learn More');
      setUploadedCVFile(null);
      setUploadedFolderFiles([]);
      setSocialTwitter('');
      setSocialLinkedIn('');
      setSocialGitHub('');
      setPremiumPlan('basic');
      
      // Clear Card inputs
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCardName('');

      // reload
      loadDashboardData();
      setActiveSection('campaigns');
    } catch (err: any) {
      toast.error(err.message || 'Ad creation failed.');
    } finally {
      setIsCreatingAd(false);
    }
  };

  const handleBoostPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostId) {
      toast.error('Please select a post to boost.');
      return;
    }

    setIsBoostingPost(true);
    try {
      await adsService.promotePost(selectedPostId, boostBudget);
      toast.success('Post boosted successfully! Impressions allocated instantly. ⚡');
      setSelectedPostId(null);
      setBoostBudget(100);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to boost post.');
    } finally {
      setIsBoostingPost(false);
    }
  };

  const toggleAdStatus = async (ad: AdCampaign) => {
    try {
      const nextStatus = ad.status === 'active' ? 'paused' : 'active';
      await adsService.updateAdStatus(ad.id, nextStatus);
      toast.success(`Campaign status changed to ${nextStatus.toUpperCase()}`);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.');
    }
  };

  const trashAd = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this ad campaign? This cannot be undone.')) return;
    try {
      await adsService.deleteAd(id);
      toast.success('Campaign removed successfully.');
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete ad.');
    }
  };

  const startEditing = (ad: AdCampaign) => {
    setEditingAd(ad);
    setEditTitle(ad.title);
    setEditLink(ad.link_url || '');
    setEditCta(ad.cta_text || 'Learn More');
    setEditDesc(ad.description || '');
    setEditCategory(ad.category || 'Projects');
    setEditBudget(parseFloat(ad.budget as string) || 0);
  };

  const saveEditAd = async () => {
    if (!editingAd) return;
    if (!editTitle.trim() || !editLink.trim()) {
      toast.error('Title and destination link is required.');
      return;
    }

    try {
      await adsService.updateAd(editingAd.id, {
        title: editTitle,
        linkUrl: editLink,
        cta_text: editCta,
        description: editDesc,
        category: editCategory,
        budget: editBudget
      });
      toast.success('Campaign details updated successfully!');
      setEditingAd(null);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  const handleAdminApprove = async (adId: number, status: string) => {
    try {
      await adsService.adminModerateAd(adId, status, `Manually moderated to ${status} by Administrator`);
      toast.success(`Campaign marked as ${status} successfully!`);
      loadDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to moderate');
    }
  };

  const handleAdRegisterClick = async (adId: number, linkUrl: string | null) => {
    if (!linkUrl) return;
    try {
      await adsService.recordInteraction(adId, 'click');
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
      // reload live numbers quickly
      const updated = await adsService.getAds();
      setAds(updated);
    } catch (err) {}
  };

  // Metric aggregates
  const totalImpressions = ads.reduce((acc, ad) => acc + (ad.impressions || 0), 0);
  const totalClicks = ads.reduce((acc, ad) => acc + (ad.clicks || 0), 0);
  const averageCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const totalBudget = ads.reduce((acc, ad) => acc + parseFloat(ad.budget as string || '0'), 0);

  // Filters previews inside analytics
  const filteredPreviewAds = selectedPreviewCategory === 'All' 
    ? ads 
    : ads.filter(ad => ad.category === selectedPreviewCategory);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin';

  return (
    <div className="max-w-4xl mx-auto p-4 select-none text-[#fafafa]">
      
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-8">
        <div>
          <h2 className="text-2xl font-black font-sans tracking-tight text-white flex items-center gap-2">
            <Target className="text-[#a78bfa]" size={26} /> Ad Center Suite
          </h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">Professional Advertiser & Growth Platform</p>
        </div>

        <button 
          onClick={() => navigate('/')} 
          className="p-3 border border-zinc-800 bg-[#09090b] text-zinc-400 rounded-full hover:text-white hover:border-zinc-700 transition-colors cursor-pointer"
          title="Back to Feed"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24 gap-3">
          <Loader2 size={36} className="animate-spin text-[#a78bfa]" />
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Compiling corporate analytics pool...</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#a1a1aa]">Impressions</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black tracking-tight">{totalImpressions.toLocaleString()}</span>
                <Eye size={18} className="text-[#3b82f6]" />
              </div>
            </div>

            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#cb3dfc]">Conversions</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black tracking-tight">{totalClicks.toLocaleString()}</span>
                <MousePointer size={18} className="text-[#cb3dfc]" />
              </div>
            </div>

            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Average CTR</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black tracking-tight">{averageCTR}%</span>
                <TrendingUp size={18} className="text-[#22c55e]" />
              </div>
            </div>

            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Spend Pool</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black tracking-tight">${totalBudget.toFixed(2)}</span>
                <DollarSign size={18} className="text-emerald-400" />
              </div>
            </div>

          </div>

          {/* Tab Selection Navigation */}
          <div className="flex border-b border-zinc-900 pb-px overflow-x-auto no-scrollbar select-none">
            {[
              { id: 'analytics', label: 'Dashboard & Previews' },
              { id: 'campaigns', label: 'Manage & Deploy Campaign' },
              { id: 'boost', label: 'Boost Organic Post' },
              ...(isAdmin ? [{ id: 'admin', label: '🔑 Administrative Review' }] : [])
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={cn(
                  "px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all relative shrink-0 cursor-pointer",
                  activeSection === tab.id 
                    ? "text-[#a78bfa]" 
                    : "text-zinc-500 hover:text-white"
                )}
              >
                {tab.label}
                {activeSection === tab.id && (
                  <motion.div layoutId="ad_active_tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#a78bfa]" />
                )}
              </button>
            ))}
          </div>

          {/* Section Render Content */}
          <div className="min-h-96">
            <AnimatePresence mode="wait">
              {activeSection === 'analytics' && (
                <motion.div 
                  key="analytics"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-8"
                >
                  
                  {/* Dynamic SVG Visual Charts for CTR & Conversions */}
                  <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-extrabold uppercase tracking-widest text-xs text-white flex items-center gap-1.5">
                        <BarChart3 size={15} className="text-[#a78bfa]" /> Conversion Click-Through Index (Past Campaigns Node)
                      </h3>
                      <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-purple-300 py-1 px-2.5 rounded-full font-bold uppercase tracking-wide">Live Stream Analysis</span>
                    </div>

                    {/* Chart Canvas */}
                    <div className="h-44 w-full flex items-end gap-3.5 mt-4 px-2 select-none">
                      {ads.length === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-zinc-600 text-xs gap-1.5 font-bold">
                          <Rocket size={20} className="text-zinc-700" />
                          <span>Deploy commercial campaigns to populate CTR indices</span>
                        </div>
                      ) : (
                        ads.slice(0, 10).reverse().map((ad, idx) => {
                          const clickVal = ad.clicks || 0;
                          const maxClick = Math.max(...ads.map(item => item.clicks || 0), 10);
                          const pct = (clickVal / maxClick) * 100;
                          return (
                            <div key={ad.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                              <div className="relative w-full flex flex-col justify-end h-full">
                                {/* Hover tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-[#09090b] text-[10px] font-black pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap p-2 rounded-xl border border-zinc-800 mb-1.5 flex flex-col gap-0.5 z-40 bg-zinc-950/95 shadow-xl">
                                  <span className="text-white text-[11px] truncate max-w-[120px]">{ad.title}</span>
                                  <span className="text-[#a78bfa] font-mono">{clickVal} clicks // Budget: ${parseFloat(ad.budget as string || '0')}</span>
                                </div>
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: `${pct || 12}%` }}
                                  className={cn(
                                    "w-full rounded-t-lg transition-all border border-transparent group-hover:border-[#cb3dfc]/50",
                                    ad.is_premium 
                                      ? "bg-gradient-to-t from-pink-600 via-[#7c3aed] to-amber-400 shadow-lg shadow-amber-400/5" 
                                      : "bg-gradient-to-t from-zinc-800 to-purple-600/80"
                                  )}
                                />
                              </div>
                              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter truncate w-14 text-center">#{ad.id}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Smart Category Filter Selection */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="font-extrabold uppercase tracking-widest text-xs text-zinc-400">Sponsored Platform Placements</h3>
                      
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 select-none">
                        {['All', ...CATEGORIES].map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedPreviewCategory(category)}
                            className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border select-none transition-all cursor-pointer whitespace-nowrap",
                              selectedPreviewCategory === category
                                ? "bg-purple-950 text-purple-300 border-purple-500/50"
                                : "bg-zinc-950 text-zinc-400 border-zinc-850 hover:text-white"
                            )}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredPreviewAds.length === 0 ? (
                      <div className="bg-[#121214] border border-zinc-850 p-12 rounded-2xl text-center text-zinc-500 font-bold text-xs">
                        No active advertisements match the selected category filters: {selectedPreviewCategory}
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-4">
                        {filteredPreviewAds.map((ad) => (
                          <div 
                            key={ad.id} 
                            onClick={async () => {
                              // Record interaction
                              try {
                                await adsService.recordInteraction(ad.id, 'impression');
                              } catch(e){}
                            }}
                            className={cn(
                              "bg-[#121214] border rounded-2xl overflow-hidden hover:scale-[1.01] transition-all flex flex-col justify-between p-4 relative shadow-xl",
                              ad.is_premium ? "border-amber-500/40 shadow-amber-500/5" : "border-zinc-850 hover:border-zinc-800"
                            )}
                          >
                            {ad.is_premium && (
                              <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 z-10 shadow-lg">
                                <Zap size={8} className="fill-black" /> Premium Accent
                              </div>
                            )}

                            <div>
                              <div className="flex justify-between items-start gap-4 mb-3">
                                <span className="text-[9px] font-black uppercase bg-[#1e1b4b] text-[#a78bfa] border border-[#a78bfa]/20 rounded-full px-2.5 py-0.5 ml-auto">
                                  {ad.category || 'Portfolio'}
                                </span>
                              </div>

                              {ad.image_url ? (
                                <div className="aspect-video w-full rounded-xl overflow-hidden bg-black mb-3 border border-zinc-900 flex items-center justify-center">
                                  <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                                </div>
                              ) : null}

                              <h4 className="font-extrabold text-[13px] text-white leading-snug line-clamp-2">
                                {ad.title}
                              </h4>
                              {ad.description && (
                                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium mt-1.5 mb-3 line-clamp-3">
                                  {ad.description}
                                </p>
                              )}

                              {/* Simulated files overview */}
                              {(ad.project_files_url || ad.cv_url) && (
                                <div className="p-2 border border-zinc-850 rounded-xl bg-zinc-950/50 mt-2 mb-3 space-y-1.5 text-[10px] text-zinc-400 font-mono">
                                  {ad.project_files_url && (
                                    <div className="flex items-center gap-1">
                                      <Upload size={10} className="text-[#a78bfa]" />
                                      <span className="truncate">Assets: {ad.project_files_url}</span>
                                    </div>
                                  )}
                                  {ad.cv_url && (
                                    <div className="flex items-center gap-1">
                                      <FileText size={10} className="text-[#cb3dfc]" />
                                      <span className="truncate">CV Linked: {ad.cv_url}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="border-t border-zinc-850 pt-3 mt-3 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-zinc-500">CTA TARGET</span>
                              <button 
                                onClick={() => handleAdRegisterClick(ad.id, ad.link_url)}
                                className={cn(
                                  "py-1.5 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer hover:shadow-lg flex items-center gap-1 border",
                                  ad.is_premium 
                                    ? "bg-amber-400 border-amber-300 text-black hover:bg-amber-300" 
                                    : "bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-850"
                                )}
                              >
                                {ad.cta_text || 'Learn More'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </motion.div>
              )}

              {activeSection === 'campaigns' && (
                <motion.div 
                  key="campaigns"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid lg:grid-cols-2 gap-6"
                >
                  
                  {/* Campaign Launch Panel */}
                  <div className="bg-[#121214] border border-zinc-800 p-5 rounded-2xl space-y-4 h-fit shadow-xl select-none">
                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-900 pb-3">
                      <Rocket size={18} className="text-[#a78bfa]" />
                      <h3 className="font-extrabold uppercase tracking-widest text-[#fafafa] text-xs">Deploy Professional Ad Campaign</h3>
                    </div>

                    <form onSubmit={triggerDeployFlow} className="space-y-4 text-xs font-semibold text-zinc-100">
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Category</label>
                          <select
                            value={adCategory}
                            onChange={(e) => setAdCategory(e.target.value)}
                            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                          >
                            {CATEGORIES.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Action Button Label (CTA)</label>
                          <select
                            value={adCtaText}
                            onChange={(e) => setAdCtaText(e.target.value)}
                            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                          >
                            {CTA_OPTIONS.map(cta => (
                              <option key={cta} value={cta}>{cta}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ad Headline / Title</label>
                        <input 
                          type="text" 
                          value={adTitle}
                          onChange={(e) => setAdTitle(e.target.value)}
                          placeholder="e.g. Modern Fullstack Developer Portfolio" 
                          className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-650"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ad Pitch / Description</label>
                        <textarea 
                          value={adDescription}
                          rows={2}
                          onChange={(e) => setAdDescription(e.target.value)}
                          placeholder="Highlight key skills, project capabilities, applications stats, companies details..." 
                          className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-650 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 select-none">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Project Files (.ZIP / Files)</label>
                          <div 
                            onClick={() => zipInputRef.current?.click()}
                            className="bg-[#09090b]/40 border border-zinc-850 hover:border-zinc-750 hover:bg-[#09090b] p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-zinc-400 font-bold uppercase text-[9px] tracking-wider cursor-pointer transition-all"
                          >
                            <Upload size={11} className="text-[#a78bfa]" /> Upload Project Folder
                          </div>
                          <input 
                            type="file" 
                            hidden 
                            ref={zipInputRef} 
                            multiple 
                            onChange={handleZipSelect} 
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Resume / CV PDF</label>
                          <div 
                            onClick={() => cvInputRef.current?.click()}
                            className="bg-[#09090b]/40 border border-zinc-850 hover:border-zinc-750 hover:bg-[#09090b] p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-zinc-400 font-bold uppercase text-[9px] tracking-wider cursor-pointer transition-all"
                          >
                            <FileText size={11} className="text-[#cb3dfc]" /> Associate Resume
                          </div>
                          <input 
                            type="file" 
                            hidden 
                            ref={cvInputRef} 
                            accept=".pdf,.doc,.docx" 
                            onChange={handleCVSelect} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 select-none">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Primary Link (URL)</label>
                          <input 
                            type="text" 
                            value={adLink}
                            onChange={(e) => setAdLink(e.target.value)}
                            placeholder="https://deohub.com/projects" 
                            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-650"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Portfolio / Web Link</label>
                          <input 
                            type="text" 
                            value={adPortfolioLink}
                            onChange={(e) => setAdPortfolioLink(e.target.value)}
                            placeholder="https://github.com/profile" 
                            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-655"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 select-none">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Twitter Link</label>
                          <input 
                            type="text" 
                            value={socialTwitter}
                            onChange={(e) => setSocialTwitter(e.target.value)}
                            placeholder="@handle" 
                            className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2 text-[10px] text-white outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">LinkedIn Link</label>
                          <input 
                            type="text" 
                            value={socialLinkedIn}
                            onChange={(e) => setSocialLinkedIn(e.target.value)}
                            placeholder="/in/yourname" 
                            className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2 text-[10px] text-white outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Contact Email</label>
                          <input 
                            type="text" 
                            value={adContactInfo}
                            onChange={(e) => setAdContactInfo(e.target.value)}
                            placeholder="email@provider" 
                            className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2 text-[10px] text-white outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ad Creative Media</label>
                        {adImage ? (
                          <div className="relative w-full h-28 rounded-xl overflow-hidden border border-zinc-800 bg-[#09090b] flex items-center justify-center">
                            <img src={adImage} alt="Cover Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setAdImage('')}
                              className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1.5 rounded-full transition-all focus:outline-none cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full border border-dashed border-zinc-800 hover:border-purple-500/50 bg-[#09090b]/40 hover:bg-[#09090b] rounded-xl h-24 cursor-pointer flex flex-col items-center justify-center p-3 transition-all"
                          >
                            <Upload className="text-[#a78bfa] mb-1.5" size={20} />
                            <span className="text-xs font-bold text-zinc-450">Upload Promo Graphic Cover Image</span>
                            <span className="text-[8px] text-zinc-550 uppercase tracking-tight mt-0.5">supports JPG, PNG and BMP files</span>
                            <input 
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>

                      {/* Pricing Tier Plans */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">DeoHub Growth Pricing Plans</label>
                        <div className="grid grid-cols-3 gap-2 select-none">
                          <div 
                            onClick={() => setPremiumPlan('basic')}
                            className={cn(
                              "border rounded-xl p-2.5 cursor-pointer text-left transition-all",
                              premiumPlan === 'basic' 
                                ? "border-purple-500 bg-[#7c3aed]/10 text-white" 
                                : "border-zinc-850 bg-zinc-950/40 text-zinc-500 hover:border-zinc-800"
                            )}
                          >
                            <p className="text-[10px] font-black uppercase tracking-wider text-purple-400">Basic Reach</p>
                            <p className="font-mono text-xs font-black text-white mt-1">$25 / ad</p>
                            <p className="text-[8px] text-zinc-450 mt-1">Standard listing priority</p>
                          </div>

                          <div 
                            onClick={() => setPremiumPlan('spotlight')}
                            className={cn(
                              "border rounded-xl p-2.5 cursor-pointer text-left transition-all relative overflow-hidden",
                              premiumPlan === 'spotlight' 
                                ? "border-amber-500 bg-amber-500/5 text-white shadow-md shadow-amber-500/5" 
                                : "border-zinc-850 bg-zinc-950/40 text-zinc-500 hover:border-zinc-800"
                            )}
                          >
                            <div className="absolute top-0 right-0 bg-amber-500 text-black text-[7px] font-black px-1.5 uppercase">2x</div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-550">Spotlight</p>
                            <p className="font-mono text-xs font-black text-white mt-1">$100 / ad</p>
                            <p className="text-[8px] text-zinc-450 mt-1">2x Impression allocation</p>
                          </div>

                          <div 
                            onClick={() => setPremiumPlan('enterprise')}
                            className={cn(
                              "border rounded-xl p-2.5 cursor-pointer text-left transition-all relative overflow-hidden",
                              premiumPlan === 'enterprise' 
                                ? "border-pink-500 bg-pink-500/5 text-white" 
                                : "border-zinc-850 bg-zinc-950/40 text-zinc-500 hover:border-zinc-800"
                            )}
                          >
                            <div className="absolute top-0 right-0 bg-pink-550 text-white text-[7px] font-black px-1.5 uppercase">Elite</div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-pink-400">Sovereign</p>
                            <p className="font-mono text-xs font-black text-white mt-1">$500 / ad</p>
                            <p className="text-[8px] text-zinc-450 mt-1">5x Views, dual feeds, Gold Badge</p>
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isCreatingAd}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-[#7c3aed] hover:from-purple-500 hover:to-purple-650 text-white font-extrabold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-purple-500/10 active:scale-[0.99]"
                      >
                        {isCreatingAd && <Loader2 size={14} className="animate-spin" />}
                        Proceed to Secure Checkout (${getPlanPrice()})
                      </button>

                    </form>
                  </div>

                  {/* Active Ad List Summary / Management Tab */}
                  <div className="space-y-4">
                    <h3 className="font-extrabold uppercase tracking-widest text-[#fafafa] text-xs">Active Campaign Manager</h3>
                    {ads.length === 0 ? (
                      <div className="bg-[#121214] border border-zinc-850 p-12 rounded-2xl text-center text-zinc-550 text-xs font-bold">
                        No campaigns found. Configure and spawn one on the left!
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-[720px] overflow-y-auto pr-1">
                        {ads.map((ad) => {
                          const isOwnAd = currentUser?.id === ad.user_id;
                          return (
                            <div 
                              key={ad.id} 
                              className={cn(
                                "bg-[#121214]/90 border rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-xl",
                                ad.is_premium ? "border-amber-500/30" : "border-zinc-850"
                              )}
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-extrabold text-[13px] text-white truncate">{ad.title}</h4>
                                    {ad.is_premium && <span className="bg-amber-500/20 text-amber-300 text-[8px] font-black tracking-widest uppercase px-1.5 rounded-full border border-amber-500/30">Premium</span>}
                                  </div>
                                  <p className="text-[10px] text-zinc-550 font-bold select-text tracking-wider uppercase mt-0.5">Category: {ad.category || 'Portfolio'} // Target: {ad.cta_text || 'Learn More'}</p>
                                </div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border",
                                  ad.status === 'active' 
                                    ? "bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]" 
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                )}>
                                  {ad.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-2 bg-[#09090b]/40 rounded-xl p-2.5 text-center text-[10px] font-mono border border-zinc-900 select-text">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Clicks</span>
                                  <span className="text-zinc-200 font-extrabold mt-0.5 text-[11px]">{ad.clicks || 0}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Impressions</span>
                                  <span className="text-zinc-200 font-extrabold mt-0.5 text-[11px]">{ad.impressions || 0}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">CTR</span>
                                  <span className="text-emerald-400 font-extrabold mt-0.5 text-[11px]">
                                    {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0'}%
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Price</span>
                                  <span className="text-white font-extrabold mt-0.5 text-[11px]">${parseFloat(ad.budget as string || '0')}</span>
                                </div>
                              </div>

                              {/* Interactive modification options */}
                              <div className="flex items-center justify-between border-t border-zinc-850/60 pt-3">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase">Actions</span>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => toggleAdStatus(ad)}
                                    className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:text-white transition-colors cursor-pointer"
                                    title={ad.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                                  >
                                    {ad.status === 'active' ? <PauseCircle size={15} className="text-amber-500" /> : <PlayCircle size={15} className="text-emerald-500" />}
                                  </button>
                                  <button 
                                    onClick={() => startEditing(ad)}
                                    className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:text-white transition-colors cursor-pointer text-blue-400"
                                    title="Edit Campaign Details"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button 
                                    onClick={() => trashAd(ad.id)}
                                    className="p-1.5 rounded-lg border border-zinc-800 hover:border-red-900/40 bg-zinc-900/60 transition-colors cursor-pointer text-red-400 hover:bg-red-500/10"
                                    title="Delete Campaign"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </motion.div>
              )}

              {activeSection === 'boost' && (
                <motion.div 
                  key="boost"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <div className="bg-[#121214] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-900 pb-3">
                      <Zap size={18} className="text-[#cb3dfc]" />
                      <h3 className="font-extrabold uppercase tracking-widest text-xs text-white">Boost Organic Creator Posts</h3>
                    </div>

                    <form onSubmit={handleBoostPost} className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-550">Pick content to promote on DeoHub feed</label>
                        {posts.length === 0 ? (
                          <div className="text-xs text-zinc-500 font-bold bg-[#09090b] border border-zinc-850 p-6 rounded-2xl text-center select-text leading-relaxed">
                            No posts indexed for your current active profile. <br />
                            <span className="text-zinc-650">Publish a post from your homepage draft area to associate campaigns!</span>
                          </div>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1 select-none">
                            {posts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPostId(p.id)}
                                className={cn(
                                  "p-3.5 rounded-xl border text-left flex flex-col justify-between gap-3 select-none transition-all cursor-pointer",
                                  selectedPostId === p.id 
                                    ? "border-[#a78bfa] bg-[#cb3dfc]/10 text-white" 
                                    : "border-zinc-850 bg-[#09090b] text-zinc-400 hover:text-white hover:border-zinc-750"
                                )}
                              >
                                <p className="text-[11px] leading-relaxed line-clamp-2">{p.content}</p>
                                <span className="text-[9px] font-mono tracking-wide text-zinc-550 uppercase">Post node ID: #{p.id}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {posts.length > 0 && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-550 border-b border-zinc-900 pb-1 flex">Boost Budget Pool ($)</label>
                            <div className="flex gap-2 select-none">
                              {[50, 100, 200, 500].map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setBoostBudget(b)}
                                  className={cn(
                                    "flex-1 py-1.5 text-xs font-black border rounded-xl transition-all cursor-pointer",
                                    boostBudget === b ? "border-[#cb3dfc] bg-[#cb3dfc]/10 text-white" : "border-zinc-850 bg-[#09090b] text-zinc-500 hover:text-white"
                                  )}
                                >
                                  ${b}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={isBoostingPost || !selectedPostId}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-[#7c3aed] text-white font-extrabold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                          >
                            {isBoostingPost && <Loader2 size={14} className="animate-spin" />}
                            Scale Organic Feed Impressions
                          </button>
                        </>
                      )}

                    </form>
                  </div>
                </motion.div>
              )}

              {activeSection === 'admin' && isAdmin && (
                <motion.div 
                  key="admin"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <div className="bg-[#121214] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-900 pb-3">
                      <ShieldAlert size={18} className="text-amber-500" />
                      <h3 className="font-extrabold uppercase tracking-widest text-xs text-white">🔑 Administrative Ad Moderation Panel</h3>
                    </div>

                    <p className="text-xs text-zinc-400 font-medium">As a certified administrator, you have permission to manually approve, reject, or suspend campaign visibility.</p>

                    {ads.length === 0 ? (
                      <p className="text-xs text-zinc-500 p-4 border border-zinc-850 rounded-xl bg-black text-center">No campaigns globally indexed.</p>
                    ) : (
                      <div className="space-y-3">
                        {ads.map(ad => (
                          <div key={ad.id} className="p-3.5 border border-zinc-850 rounded-xl bg-[#09090b]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="min-w-0 flex-1">
                              <h5 className="font-black text-white truncate">{ad.title}</h5>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Category: {ad.category} // Budget: ${parseFloat(ad.budget as string)}</p>
                              {ad.description && <p className="text-[11px] text-zinc-400 mt-1 italic leading-relaxed line-clamp-1">"{ad.description}"</p>}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleAdminApprove(ad.id, 'active')}
                                className="px-2.5 py-1 text-[10px] font-black uppercase text-[#22c55e] border border-[#22c55e]/20 bg-[#22c55e]/5 rounded-lg hover:bg-[#22c55e]/15 cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAdminApprove(ad.id, 'rejected')}
                                className="px-2.5 py-1 text-[10px] font-black uppercase text-red-400 border border-red-900/40 bg-red-500/5 rounded-lg hover:bg-red-500/15 cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleAdminApprove(ad.id, 'paused')}
                                className="px-2.5 py-1 text-[10px] font-black uppercase text-amber-500 border border-amber-500/20 bg-amber-500/5 rounded-lg hover:bg-amber-500/15 cursor-pointer"
                              >
                                Suspend
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}

      {/* SECURE CARD CHECKOUT DRAWER OVERLAY MODAL */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 w-full max-w-md w-fit shadow-2xl relative overflow-hidden select-none text-[#fafafa]"
            >
              
              {/* Gold light effects */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-pink-500 via-[#7c3aed] to-amber-400 animate-pulse" />

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-[#a78bfa]" size={20} />
                  <h4 className="font-black text-sm uppercase tracking-wider">Secure Payment Gateway</h4>
                </div>
                <button 
                  onClick={() => setIsCheckoutOpen(false)}
                  className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4 bg-zinc-950/40 border border-zinc-850 p-3.5 rounded-2xl select-text">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Authorized Charge Details</p>
                <div className="flex justify-between items-center mt-2.5 text-xs">
                  <span className="font-extrabold text-zinc-350 uppercase">DeoHub Ads {premiumPlan.toUpperCase()} Plan</span>
                  <span className="font-mono text-white font-black">${getPlanPrice().toFixed(2)} USD</span>
                </div>
              </div>

              {/* Card input field groups */}
              <div className="space-y-3.5 text-xs font-bold text-zinc-100">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Name on Card</label>
                  <input 
                    type="text" 
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="CARDHOLDER NAME" 
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-650"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Credit Card Number</label>
                  <input 
                    type="text" 
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      // Format spaced card input
                      const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                      setCardNumber(val);
                    }}
                    placeholder="4111 2222 3333 4444" 
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-650"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#a1a1aa]">Expiry Date</label>
                    <input 
                      type="text" 
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY" 
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-xs text-center font-mono outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-650"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#a1a1aa]">Secret code (CVV)</label>
                    <input 
                      type="password" 
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="•••" 
                      className="w-full bg-[#09090b] border border-zinc-800 rounded-xl p-3 text-xs text-center font-mono outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-zinc-650"
                    />
                  </div>
                </div>

                {/* Secure Badge */}
                <span className="text-[10px] text-emerald-450 font-sans tracking-wide flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-full justify-center">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  Simulated sandbox verification. No real money charged!
                </span>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="flex-1 py-3 text-xs font-black uppercase tracking-widest border border-zinc-800 rounded-xl bg-zinc-900/20 hover:text-white hover:bg-zinc-850/40 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={processPaymentAndDeploy}
                    className="flex-grow-[1.5] py-3.5 text-xs font-extrabold uppercase tracking-widest bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-xl hover:from-amber-400 hover:to-yellow-300 shadow-lg cursor-pointer"
                  >
                    Authorize Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDITING MODAL OVERLAY PORTAL */}
      <AnimatePresence>
        {editingAd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-zinc-800 rounded-3xl p-6 w-full max-w-md w-fit shadow-2xl space-y-4 font-sans text-xs text-zinc-100"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                <span className="font-extrabold uppercase tracking-wider text-[#a78bfa]">Edit Campaign Details</span>
                <button onClick={() => setEditingAd(null)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
              </div>

              <div className="space-y-3 font-semibold">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2.5 outline-none text-white focus:ring-1 focus:ring-purple-500"
                  >
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Headline</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2.5 outline-none text-white focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Pitch / Description</label>
                  <textarea 
                    value={editDesc}
                    rows={2}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2.5 outline-none text-white focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">CTA Label</label>
                    <select
                      value={editCta}
                      onChange={(e) => setEditCta(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2.5 outline-none text-white focus:ring-1 focus:ring-purple-500"
                    >
                      {CTA_OPTIONS.map(cta => (
                        <option key={cta} value={cta}>{cta}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">Budget Pool ($)</label>
                    <input 
                      type="number" 
                      value={editBudget}
                      onChange={(e) => setEditBudget(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2.5 outline-none text-white focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase">Destination Link</label>
                  <input 
                    type="text" 
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-850 rounded-xl p-2.5 outline-none text-white focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 select-none">
                <button onClick={() => setEditingAd(null)} className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-white cursor-pointer">Cancel</button>
                <button onClick={saveEditAd} className="flex-1 py-2.5 bg-[#7c3aed] text-white font-extrabold uppercase tracking-wide rounded-xl hover:bg-purple-600 cursor-pointer">Save Changes</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
