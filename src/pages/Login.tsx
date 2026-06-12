import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Image as ImageIcon, Mail, Lock, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { authService } from '../lib/authService';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Admin google authorization simulator states
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    try {
      await authService.login(email, password);
      toast.success('Welcome back to DeoHub!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setGoogleError('Please enter your Google email address.');
      return;
    }

    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      await authService.googleLogin(cleanEmail);
      if (cleanEmail === 'iradukundadeogratias33@gmail.com') {
        toast.success('Welcome back, admin! Logged in securely with Google. ✨');
      } else {
        toast.success(`Logged in securely with Google as ${cleanEmail}. ✨`);
      }
      setIsGoogleModalOpen(false);
      navigate('/');
    } catch (err: any) {
      setGoogleError(err.message || 'Google authentication failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-[80vh] flex-col justify-center px-4"
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] shadow-xl shadow-[#7c3aed]/20">
            <ImageIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-[#fafafa]">Welcome Back</h1>
          <p className="mt-2 text-zinc-500 dark:text-[#71717a]">Enter your details to continue your journey</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 dark:text-[#71717a]">
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl bg-zinc-100 py-4 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 dark:bg-[#18181b] dark:text-[#fafafa] dark:border dark:border-[#27272a]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 dark:text-[#71717a]">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-zinc-100 py-4 pl-10 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 dark:bg-[#18181b] dark:text-[#fafafa] dark:border dark:border-[#27272a]"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-zinc-400 dark:text-[#71717a] hover:text-zinc-600 dark:hover:text-[#fafafa]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs font-bold text-[#7c3aed] hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button 
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7c3aed] py-4 font-bold text-white shadow-lg shadow-[#7c3aed]/20 transition-all hover:bg-[#6d28d9] active:scale-95"
          >
            Sign In
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8">
          <div className="relative flex items-center justify-center">
            <div className="h-px w-full bg-zinc-200 dark:bg-[#27272a]"></div>
            <span className="absolute bg-[#fafafa] px-4 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:bg-[#09090b] dark:text-[#71717a]">Or continue with</span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => {
                setGoogleEmail('');
                setGoogleError(null);
                setIsGoogleModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 transition-all hover:bg-zinc-50 dark:border-[#27272a] dark:bg-[#18181b] dark:hover:bg-[#27272a]"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
              <span className="text-sm font-bold dark:text-[#fafafa]">Google</span>
            </button>
            <button 
              type="button"
              onClick={() => toast.info('Facebook authentication is reserved for future integration releases.')}
              className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white py-3 transition-all hover:bg-zinc-50 dark:border-[#27272a] dark:bg-[#18181b] dark:hover:bg-[#27272a]"
            >
              <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="h-5 w-5" alt="Facebook" />
              <span className="text-sm font-bold dark:text-[#fafafa]">Facebook</span>
            </button>
          </div>
        </div>

        <p className="mt-10 text-center text-sm font-medium text-zinc-500 dark:text-[#71717a]">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-[#7c3aed] hover:underline">
            Create Account
          </Link>
        </p>
      </div>

      {/* Google Authentication Administration Only Dialog */}
      <AnimatePresence>
        {isGoogleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isGoogleLoading) setIsGoogleModalOpen(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-6 w-6" alt="Google" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Sign in with Google</h3>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Enter your Google email address to proceed
                </p>
              </div>

              <form onSubmit={handleGoogleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Google Email Address
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isGoogleLoading}
                    placeholder="example@gmail.com"
                    value={googleEmail}
                    onChange={(e) => {
                      setGoogleEmail(e.target.value);
                      if (googleError) setGoogleError(null);
                    }}
                    className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>

                {/* Friendly Accounts selection Quick-Fill Badges */}
                <div className="flex flex-col gap-1.5 rounded-2xl bg-zinc-50 p-3.5 dark:bg-zinc-900/55 border border-zinc-100 dark:border-zinc-900">
                  <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest text-center">
                    Authorized Accounts Quick Match
                  </span>
                  <div className="flex flex-col gap-1 rounded-md">
                    <button 
                      type="button"
                      onClick={() => {
                        setGoogleEmail('iradukundadeogratias33@gmail.com');
                        setGoogleError(null);
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-[#7c3aed]/10 py-1.5 px-3 text-xs font-black text-[#7c3aed] transition-colors hover:bg-[#7c3aed]/15"
                    >
                      Use Admin: iradukundadeogratias33@gmail.com
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setGoogleEmail('uwizeyimanajoshua@gmail.com');
                        setGoogleError(null);
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 py-1.5 px-3 text-xs font-black text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/15"
                    >
                      Use Tester: uwizeyimanajoshua@gmail.com
                    </button>
                  </div>
                </div>

                {googleError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 rounded-xl bg-red-500/10 p-3.5 text-xs font-medium text-red-500 border border-red-500/20"
                  >
                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                    <span>{googleError}</span>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isGoogleLoading}
                    onClick={() => setIsGoogleModalOpen(false)}
                    className="flex-1 rounded-xl border border-zinc-200 py-3.5 text-xs font-bold text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-905"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGoogleLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#7c3aed] py-3.5 text-xs font-bold text-white transition-colors hover:bg-[#6d28d9] disabled:opacity-50"
                  >
                    {isGoogleLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : null}
                    {isGoogleLoading ? 'Verifying...' : 'Authorize'}
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
