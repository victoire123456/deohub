import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authService } from '../lib/authService';

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !password) {
      toast.error('Please fill in all requirements');
      return;
    }
    
    setIsLoading(true);
    try {
      await authService.register(name, email, password);
      toast.success('Account created successfully! Please sign in. 🎉');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-[80vh] flex-col justify-center px-4"
    >
      <div className="mx-auto w-full max-w-sm py-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-[#fafafa]">Join DeoHub</h1>
          <p className="mt-2 text-zinc-500 dark:text-[#71717a]">Start sharing your thoughts with the world</p>
        </div>

        <div className="mb-8 flex justify-center">
           <div className="relative">
              <div className="h-24 w-24 rounded-3xl bg-zinc-100 flex items-center justify-center dark:bg-[#18181b] border-2 border-dashed border-zinc-300 dark:border-[#27272a] overflow-hidden">
                <User size={32} className="text-zinc-400" />
              </div>
              <button className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-[#7c3aed] text-white flex items-center justify-center border-4 border-white dark:border-[#09090b] shadow-lg">
                <Camera size={18} />
              </button>
           </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 dark:text-[#71717a]">
              <User size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Full Name" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl bg-zinc-100 py-4 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 dark:bg-[#18181b] dark:text-[#fafafa] dark:border dark:border-[#27272a]"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 dark:text-[#71717a]">
              <Mail size={18} />
            </div>
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-zinc-100 py-4 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 dark:bg-[#18181b] dark:text-[#fafafa] dark:border dark:border-[#27272a]"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400 dark:text-[#71717a]">
              <Lock size={18} />
            </div>
            <input 
              type="password" 
              placeholder="Password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-zinc-100 py-4 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 dark:bg-[#18181b] dark:text-[#fafafa] dark:border dark:border-[#27272a]"
            />
          </div>

          <div className="pt-2">
            <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-[#71717a] text-center mb-6">
              By joining, you agree to our <span className="text-[#7c3aed] font-bold">Terms</span> and <span className="text-[#7c3aed] font-bold">Privacy Policy</span>.
            </p>
            
            <button 
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7c3aed] py-4 font-bold text-white shadow-lg shadow-[#7c3aed]/20 transition-all hover:bg-[#6d28d9] active:scale-95 disabled:opacity-55"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm font-medium text-zinc-500 dark:text-[#71717a]">
          Already a member?{' '}
          <Link to="/login" className="font-bold text-[#7c3aed] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
