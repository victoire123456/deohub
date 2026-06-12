import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    toast.success('Recovery link sent to your email!');
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex min-h-[80vh] flex-col justify-center px-4"
    >
      <div className="mx-auto w-full max-w-sm">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-sm font-bold text-zinc-500 dark:text-[#a1a1aa] hover:text-[#7c3aed]"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-[#fafafa]">Reset Password</h1>
          <p className="mt-2 text-zinc-500 dark:text-[#71717a]">Enter your email to receive recovery instructions</p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
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

          <button 
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7c3aed] py-4 font-bold text-white shadow-lg shadow-[#7c3aed]/20 transition-all hover:bg-[#6d28d9] active:scale-95"
          >
            Send Recovery Link
            <Send size={18} />
          </button>
        </form>

        <p className="mt-10 text-center text-sm font-medium text-zinc-500 dark:text-[#71717a]">
          Remember your password?{' '}
          <Link to="/login" className="font-bold text-[#7c3aed] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
