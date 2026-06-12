import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { geminiService } from '../lib/geminiService';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      text: input, 
      timestamp: new Date() 
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await geminiService.chat(input, messages.slice(-5));
      const aiMessage: Message = {
        role: 'model',
        text: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] px-4"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] shadow-lg shadow-[#7c3aed]/20">
                <Bot size={28} className="text-white" />
            </div>
            <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-[#fafafa]">DeoAssistant</h2>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-[#71717a]">Powered by Gemini</span>
                </div>
            </div>
        </div>
        <button 
            onClick={clearChat}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-[#18181b] transition-all"
            title="Clear Chat"
        >
            <Trash2 size={20} />
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-4"
      >
        {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
               <Sparkles size={48} className="text-[#7c3aed] mb-4 animate-pulse" />
               <p className="text-sm font-black text-zinc-900 dark:text-white mb-1">Welcome to DeoAI Assistant</p>
               <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-600 max-w-xs leading-relaxed">
                 I can advise on creator growth, suggest high-virality captions, audit safety levels, rewrite text, or translate posts.
               </p>

               <div className="grid grid-cols-2 gap-2.5 mt-6 max-w-md w-full px-2">
                 {[
                   { label: "💡 Creator Advice", hint: "Give me actionable advice on growing my follower count." },
                   { label: "✍️ Catchy Caption", hint: "Write a high-virality post caption for building a brand in tech." },
                   { label: "🌍 Translate Text", hint: "Translate this into French and Spanish: 'Exciting weekend, can't wait to share!'" },
                   { label: "🧘 Screen-Time Balance", hint: "Propose limits or tips to prevent endless scroll habits." }
                 ].map((pill, idx) => (
                   <button
                     key={idx}
                     type="button"
                     onClick={() => setInput(pill.hint)}
                     className="text-left p-3.5 rounded-2xl bg-white dark:bg-[#121214] border border-zinc-100 dark:border-zinc-800/80 hover:border-purple-500/50 text-[11px] text-zinc-500 dark:text-zinc-400 font-bold transition-all hover:scale-[1.02] shadow-sm cursor-pointer select-none"
                   >
                     <p className="text-zinc-800 dark:text-[#fafafa] mb-0.5 font-bold">{pill.label}</p>
                     <p className="text-[10px] font-medium text-zinc-500 truncate">{pill.hint}</p>
                   </button>
                 ))}
               </div>
            </div>
        ) : (
            messages.map((msg, idx) => (
                <div 
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            msg.role === 'user' 
                            ? 'bg-zinc-200 dark:bg-[#27272a]' 
                            : 'bg-[#7c3aed]/10 dark:bg-[#7c3aed]/20'
                        }`}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-[#7c3aed]" />}
                        </div>
                        <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                            msg.role === 'user' 
                            ? 'bg-[#7c3aed] text-white rounded-tr-none' 
                            : 'bg-white dark:bg-[#18181b] text-zinc-800 dark:text-[#d4d4d8] border border-zinc-100 dark:border-[#27272a] rounded-tl-none shadow-sm'
                        }`}>
                            {msg.text}
                            <div className={`text-[8px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                </div>
            ))
        )}
        {isLoading && (
            <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed]/10 dark:bg-[#7c3aed]/20">
                        <Bot size={16} className="text-[#7c3aed]" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#18181b] border border-zinc-100 dark:border-[#27272a] rounded-tl-none shadow-sm flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-[#7c3aed]" />
                        <span className="text-xs text-zinc-400">DeoAssistant is thinking...</span>
                    </div>
                </div>
            </div>
        )}
      </div>

      <form 
        onSubmit={handleSend}
        className="relative mt-4 mb-20 md:mb-6"
      >
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask DeoAssistant..."
          className="w-full rounded-2xl bg-white py-4 pl-6 pr-14 text-sm font-medium shadow-xl shadow-zinc-200/50 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 dark:bg-[#18181b] dark:text-[#fafafa] dark:shadow-none dark:border dark:border-[#27272a]"
        />
        <button 
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-xl bg-[#7c3aed] text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          <Send size={18} />
        </button>
      </form>
    </motion.div>
  );
}
