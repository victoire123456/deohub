import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Link2, 
  Activity, 
  Server, 
  Settings, 
  ChevronRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  Copy,
  Check,
  Mail,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '../lib/authService';

interface TableStat {
  name: string;
  count: number;
}

interface DbConfigResponse {
  success: boolean;
  activeDb: string;
  connectionString: string;
  isFallback: boolean;
  isHealthy: boolean;
  errorMsg: string | null;
  tables: TableStat[];
}

interface SmtpConfigState {
  configured: boolean;
  host: string;
  port: number;
  user: string;
  maskedPass: string;
}

export default function DatabaseCenter() {
  const [config, setConfig] = useState<DbConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Database connection form
  const [newConnectionString, setNewConnectionString] = useState('');
  
  // SMTP configurations states
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigState | null>(null);
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  
  // SMTP Form fields
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [testRecipient, setTestRecipient] = useState('');

  const defaultNeonHint = "postgresql://neondb_owner:npg_KfIik80cXFQO@ep-fancy-dream-aqjle7ix-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/database/config');
      if (response.ok) {
        const data: DbConfigResponse = await response.json();
        setConfig(data);
      } else {
        toast.error('Could not fetch current database configurations.');
      }
    } catch (err) {
      console.error('Failed to fetch db config:', err);
      toast.error('Network error connecting to database status panel.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSmtpConfig = async () => {
    setSmtpLoading(true);
    try {
      const response = await authFetch('/api/database/smtp');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSmtpConfig(data);
          setSmtpHost(data.host || '');
          setSmtpPort(data.port || 587);
          setSmtpUser(data.user || '');
        }
      }
    } catch (err) {
      console.error('Failed to fetch SMTP configuration:', err);
    } finally {
      setSmtpLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchSmtpConfig();
    
    // Attempt to prefill test email with logged user details
    const storedUser = localStorage.getItem('deohub_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u && u.email) setTestRecipient(u.email);
      } catch (e) {}
    }
  }, []);

  const handleUpdateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnectionString.trim()) {
      toast.error('Please provide a database connection string URL.');
      return;
    }
    if (!newConnectionString.startsWith('postgresql://') && !newConnectionString.startsWith('postgres://')) {
      toast.error('Connection URL must start with "postgresql://" or "postgres://"');
      return;
    }

    setUpdating(true);
    const id = toast.loading('Re-connecting database and executing schema builders...');
    try {
      const response = await authFetch('/api/database/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: newConnectionString.trim() })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.dismiss(id);
        if (result.isFallback) {
          toast.warning(result.message + ' (Postgres test failed, falling back to local JSON)', { duration: 6000 });
        } else {
          toast.success('Database migrated and connected successfully! ✨', { duration: 5000 });
          setNewConnectionString('');
        }
        fetchConfig();
      } else {
        toast.dismiss(id);
        toast.error(result.error || 'Failed to update database configuration.');
      }
    } catch (err: any) {
      toast.dismiss(id);
      toast.error(err.message || 'Error occurred while updating pool configuration.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpHost.trim() || !smtpUser.trim() || !smtpPass.trim()) {
      toast.error('SMTP Host, Username, and Password are all required.');
      return;
    }

    setSmtpSaving(true);
    const toastId = toast.loading('Saving and activating SMTP credentials on server...');
    try {
      const response = await authFetch('/api/database/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: smtpPort,
          user: smtpUser.trim(),
          pass: smtpPass.trim()
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.dismiss(toastId);
        toast.success(result.message || 'SMTP settings saved successfully! ✨');
        setSmtpPass(''); // clear out password field
        fetchSmtpConfig();
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || 'Failed to persist SMTP configuration.');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Error updating SMTP parameters.');
    } finally {
      setSmtpSaving(false);
    }
  };

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) {
      toast.error('Please specify a recipient email address to receive the test verification packet.');
      return;
    }

    setSmtpTesting(true);
    const toastId = toast.loading(`Routing live SMTP verification test to ${testRecipient}...`);
    try {
      const response = await authFetch('/api/database/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: testRecipient.trim() })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.dismiss(toastId);
        toast.success(result.message || 'SMTP server authenticated and test message delivered! Check your inbox.');
      } else {
        toast.dismiss(toastId);
        toast.error(result.error || 'SMTP delivery failed. Verify host, ports, and authorization keys.');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Error running SMTP link validation.');
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleInitializeSchema = async () => {
    setMigrating(true);
    const toastId = toast.loading('Synchronizing table structures and indexes...');
    try {
      const r = await authFetch('/api/database/initialize', { method: 'POST' });
      const res = await r.json();
      if (r.ok && res.success) {
        toast.success(res.message || 'Database schema sync completed successfully!');
        fetchConfig();
      } else {
        toast.error(res.error || 'Failed to trigger schema synchronization.');
      }
    } catch (err: any) {
      toast.error('Error triggers: ' + err.message);
    } finally {
      toast.dismiss(toastId);
      setMigrating(false);
    }
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(defaultNeonHint);
    setCopied(true);
    toast.success('Neon Postgres URL copied to clipboard! Click to paste.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 px-4 py-3"
    >
      {/* Top Welcome Card */}
      <div className="rounded-3xl bg-gradient-to-tr from-[#121214] via-[#1a1a1f] to-[#141417] border border-zinc-800 p-6 shadow-xl relative overflow-hidden">
        {/* Decorative lighting */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-600/10 rounded-full blur-[60px]" />

        <div className="flex items-start gap-4 z-10 relative">
          <div className="p-3 bg-violet-600/20 text-[#9f75ff] rounded-2.5xl ring-1 ring-violet-500/30">
            <Database size={28} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Database & System Operations</h2>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Manage persistent storage, synchronize SQL database tables, and configure your mail server to dispatch verification codes securely.
            </p>
          </div>
        </div>
      </div>

      {/* Connection Monitor Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main Database Status */}
        <div className="rounded-2.5xl border border-zinc-200 bg-white p-5 dark:border-zinc-850 dark:bg-[#09090b]/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-zinc-400" />
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Storage Layer API</span>
            </div>
            <button 
              onClick={fetchConfig}
              disabled={loading}
              className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all text-zinc-500 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {loading ? (
            <div className="py-2 space-y-2">
              <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-lg font-black text-zinc-800 dark:text-white font-sans tracking-tight">
                  {config?.activeDb}
                </h3>
                {config?.isFallback && (
                  <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md">
                    Fallback Mode
                  </span>
                )}
              </div>

              {/* Health Indicator */}
              <div className="flex items-center gap-2.5">
                {config?.isHealthy ? (
                  <div className="flex h-5 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-550 border border-emerald-500/20">
                    <CheckCircle size={10} />
                    Connected & Healthy
                  </div>
                ) : (
                  <div className="flex h-5 items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-500 border border-rose-500/20">
                    <XCircle size={10} />
                    Service Error / Unreachable
                  </div>
                )}
                
                <div className="text-[10px] text-zinc-500 font-bold font-mono">
                  TLS / SSL required
                </div>
              </div>

              {/* Masked URL Display */}
              <div className="flex items-center gap-2 rounded-xl bg-zinc-100/60 p-2 text-xs font-semibold dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850">
                <Link2 size={13} className="text-zinc-400 shrink-0" />
                <span className="font-mono text-[10px] truncate text-zinc-650 dark:text-zinc-300">
                  {config?.connectionString || 'No database connected'}
                </span>
              </div>

              {config?.errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-mono text-rose-500 leading-snug break-all">
                  <span className="font-bold">Error log: </span> {config.errorMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Database Statistics */}
        <div className="rounded-2.5xl border border-zinc-200 bg-white p-5 dark:border-zinc-850 dark:bg-[#09090b]/40 space-y-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-zinc-400" />
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Database Stats & Row Counts</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 py-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {(config?.tables || []).map((t) => (
                <div 
                  key={t.name}
                  className="p-2 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-150 dark:border-zinc-850 flex flex-col justify-between"
                >
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase truncate">
                    {t.name}
                  </span>
                  <span className="text-md font-black font-mono text-zinc-750 dark:text-[#f4f4f5]">
                    {t.count} <span className="text-[9px] font-bold text-zinc-400">rows</span>
                  </span>
                </div>
              ))}
              {(!config?.tables || config.tables.length === 0) && (
                <p className="text-xs text-zinc-400 col-span-2 py-4 text-center">No active stats available.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SMTP Server Configuration & Status */}
      <div className="rounded-2.5xl border border-zinc-200 bg-white p-5 dark:border-zinc-850 dark:bg-[#09090b]/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={18} className="text-zinc-400" />
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">SMTP Server Relay Service</span>
          </div>
          <button 
            onClick={fetchSmtpConfig}
            disabled={smtpLoading}
            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all text-zinc-500 cursor-pointer"
          >
            <RefreshCw size={14} className={smtpLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {smtpLoading ? (
          <div className="py-2 space-y-2">
            <div className="h-6 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <h3 className="text-lg font-black text-zinc-800 dark:text-white font-sans tracking-tight">
                {smtpConfig?.configured ? `Dynamic relay via ${smtpConfig.host}` : 'Simulated Falling Back Node'}
              </h3>
              {!smtpConfig?.configured && (
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-violet-500/10 text-violet-500 border border-violet-500/20 rounded-md">
                  Simulation
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850">
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Host & Port</span>
                <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 font-semibold">
                  {smtpConfig?.configured ? `${smtpConfig.host}:${smtpConfig.port}` : 'None (Terminal Printout)'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850">
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">SMTP Username</span>
                <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200 font-semibold truncate block">
                  {smtpConfig?.configured ? smtpConfig.user : 'None'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850">
                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Credential Key</span>
                <span className="font-mono text-xs text-zinc-805 dark:text-zinc-300">
                  {smtpConfig?.configured ? smtpConfig.maskedPass : 'None'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form: Update SMTP Server */}
      <div className="rounded-2.5xl border border-zinc-200 bg-white p-6 dark:border-zinc-850 dark:bg-[#09090b]/40 space-y-5">
        <div className="flex items-center gap-2.5">
          <Mail size={20} className="text-violet-500" />
          <h3 className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-wider">
            Configure SMTP Relay (Brevo, AWS SES, Gmail, etc.)
          </h3>
        </div>

        <form onSubmit={handleUpdateSmtp} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-black uppercase text-[#a1a1aa] tracking-widest block">
                SMTP Server Host Name
              </label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp-relay.brevo.com"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[11.5px] text-zinc-850 shadow-inner focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-[#fafafa] dark:focus:bg-zinc-950 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-[#a1a1aa] tracking-widest block">
                Port (SSL/TLS)
              </label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value) || 587)}
                placeholder="587"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[11.5px] text-zinc-850 shadow-inner focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-[#fafafa] dark:focus:bg-zinc-950 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-[#a1a1aa] tracking-widest block">
                SMTP Authentication User
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="ae0db7001@smtp-brevo.com"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[11.5px] text-zinc-850 shadow-inner focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-[#fafafa] dark:focus:bg-zinc-950 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-[#a1a1aa] tracking-widest block">
                SMTP Password / Authorization Key
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••••••••••••••"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[11.5px] text-zinc-850 shadow-inner focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-[#fafafa] dark:focus:bg-zinc-950 focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={smtpSaving || smtpLoading}
            className="w-full rounded-xl bg-violet-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-violet-500 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {smtpSaving ? <RefreshCw className="animate-spin" size={12} /> : <CheckCircle size={12} />}
            {smtpSaving ? 'Updating mail protocols...' : 'Apply SMTP Configurations'}
          </button>
        </form>

        {smtpConfig?.configured && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/10 border border-zinc-150 dark:border-zinc-850/60 rounded-2xl space-y-3 pt-4 font-sans text-xs">
            <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold">
              <Send size={13} className="text-violet-500" />
              <span>Validate & Test Mail Transport Connection</span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 pl-4 text-[11px] leading-relaxed">
              Verify your SMTP configurations immediately by triggering a real activation test email delivered straight to your inbox.
            </p>
            <form onSubmit={handleTestSmtp} className="flex flex-col sm:flex-row gap-3 pl-4 pt-1">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="your-email@example.com"
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-850 shadow-inner focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-[#fafafa] focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="submit"
                disabled={smtpTesting}
                className="rounded-xl px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {smtpTesting ? <RefreshCw className="animate-spin" size={12} /> : <Send size={12} />}
                Test SMTP settings
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main Form: Update PostgreSQL connection */}
      <div className="rounded-2.5xl border border-zinc-200 bg-white p-6 dark:border-zinc-850 dark:bg-[#09090b]/40 space-y-5">
        <div className="flex items-center gap-2.5">
          <Settings size={20} className="text-violet-500" />
          <h3 className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-wider">
            Configure New PostgreSQL Database
          </h3>
        </div>

        {/* Database setup copy help section */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/10 border border-zinc-150 dark:border-zinc-850/60 rounded-2xl text-xs space-y-3">
          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-bold">
            <Zap size={13} className="text-amber-500" />
            <span>Step-by-step Connection Guide</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">
            You can use any PostgreSQL database provider (Neon.tech, Supabase, Aiven, or Google Cloud SQL). Put your connection link below, and your database tables will be automatically generated and provisioned.
          </p>
          <div className="space-y-1.5 pt-1">
            <span className="text-[9px] uppercase font-black tracking-wider text-zinc-400 dark:text-zinc-500 block">
              Test Connection PostgreSQL URL (Provided by User)
            </span>
            <div className="flex items-center justify-between gap-1 bg-white items-center dark:bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850">
              <span className="font-mono text-[9px] text-zinc-500 dark:text-zinc-400 truncate pr-2 mr-auto select-all">
                {defaultNeonHint}
              </span>
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="p-1 px-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-[10px] font-black uppercase text-zinc-650 dark:text-zinc-300 shrink-0 flex items-center gap-1 cursor-pointer transition-all"
              >
                {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                {copied ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateDatabase} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase text-[#a1a1aa] tracking-widest block">
              Database Connection URL (DATABASE_URL)
            </label>
            <textarea
              value={newConnectionString}
              onChange={(e) => setNewConnectionString(e.target.value)}
              placeholder="postgresql://neondb_owner:***@ep-fancy-***.us-east-1.aws.neon.tech/neondb?sslmode=require"
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[10.5px] text-zinc-850 shadow-inner focus:border-violet-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-[#fafafa] dark:focus:bg-zinc-950 focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={updating || loading}
              className="flex-1 rounded-xl bg-violet-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-violet-500 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {updating ? <RefreshCw className="animate-spin" size={12} /> : <Database size={12} />}
              {updating ? 'Verifying & Saving...' : 'Connect PostgreSQL Database'}
            </button>
            
            <button
              type="button"
              onClick={handleInitializeSchema}
              disabled={migrating || loading}
              className="px-5 py-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-zinc-300 dark:border-zinc-800 text-xs font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-350 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Manually synchronize database structures, indexes, and dependencies"
            >
              {migrating ? <RefreshCw className="animate-spin" size={12} /> : <ShieldCheck size={12} />}
              Sync Schema
            </button>
          </div>
        </form>
      </div>

      {/* Database FAQ / Troubleshooting tips */}
      <div className="rounded-2.5xl border border-zinc-200 bg-white p-5 dark:border-zinc-850 dark:bg-[#09090b]/40 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-[#a1a1aa]" />
          <h4 className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">Storage Troubleshooting & Configuration FAQs</h4>
        </div>
        
        <div className="space-y-3 text-xs divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
          <div className="pt-0 pb-3 space-y-1">
            <p className="font-bold text-zinc-805 dark:text-zinc-200 flex items-center gap-1.5">
              <ChevronRight size={11} className="text-violet-500" /> What happens if database crashes of quota limits?
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 pl-4 text-[11px] leading-relaxed">
              DeoHub will seamlessly trigger its built-in local persistent fallback database (running on Alasql + static JSON persistence) to guarantee your feeds, stories, likes, direct messaging, and visual counters never freeze or crash.
            </p>
          </div>

          <div className="pt-3 pb-3 space-y-1">
            <p className="font-bold text-zinc-805 dark:text-zinc-205 flex items-center gap-1.5">
              <ChevronRight size={11} className="text-violet-500" /> Will switching databases erase my local stories?
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 pl-4 text-[11px] leading-relaxed">
              No! Handlers for active and archived stories (like your <strong>Story Archive</strong>) are securely backed by robust browser <code>localStorage</code> (under keys such as <code>deohub_stories</code> and <code>deohub_stories_archive</code>) to safeguard them.
            </p>
          </div>

          <div className="pt-3 pb-0 space-y-1">
            <p className="font-bold text-zinc-805 dark:text-zinc-205 flex items-center gap-1.5">
              <ChevronRight size={11} className="text-violet-500" /> How do I verify tables inside my new Postgres DB?
            </p>
            <p className="text-zinc-500 dark:text-zinc-400 pl-4 text-[11px] leading-relaxed">
              Once connected, the <strong>Database Stats</strong> panel on this page will query your new database directly to output live row statistics so you can verify that data writes are flowing natively!
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
