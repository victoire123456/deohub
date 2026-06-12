import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Socket } from 'socket.io-client';
import { getSocket } from './lib/socket';
import { 
  Home as HomeIcon, 
  MessageSquare, 
  PlusSquare, 
  Bell, 
  User as UserIcon,
  Search,
  Menu,
  Moon,
  Sun,
  Bot,
  Image as ImageIcon,
  Film,
  UploadCloud,
  Target,
  Database,
  X,
  Radio,
  StopCircle
} from 'lucide-react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  NavLink, 
  useLocation,
  useNavigate
} from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { authService } from './lib/authService';
import { liveService } from './lib/liveService';

// Pages - We will create these next
import Home from './pages/Home';
import Chats from './pages/Chats';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import CreatePost from './pages/CreatePost';
import AIChat from './pages/AIChat';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import SearchPage from './pages/SearchPage';
import Reels from './pages/Reels';
import VideoUpload from './pages/VideoUpload';
import AdCenter from './pages/AdCenter';
import DatabaseCenter from './pages/DatabaseCenter';
import Live from './pages/Live';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Header({ 
  onMenuOpen, 
  theme, 
  setTheme, 
  accent, 
  setAccent 
}: { 
  onMenuOpen: () => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  accent: string;
  setAccent: (a: any) => void;
}) {
  const navigate = useNavigate();
  const [showPicker, setShowPicker] = useState(false);

  const colors = [
    { id: 'violet', bg: 'bg-violet-600', name: 'Violet' },
    { id: 'blue', bg: 'bg-blue-600', name: 'Ocean' },
    { id: 'rose', bg: 'bg-rose-600', name: 'Rose' },
    { id: 'emerald', bg: 'bg-emerald-600', name: 'Emerald' },
    { id: 'amber', bg: 'bg-amber-600', name: 'Amber' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-lg items-center justify-between lg:max-w-none lg:px-4">
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => navigate('/')}>
          <img 
            src="/logo.png" 
            className="h-8 w-8 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800" 
            alt="DeoHub Logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallbackEl = document.getElementById('header-logo-fallback');
              if (fallbackEl) fallbackEl.style.display = 'flex';
            }}
          />
          <div id="header-logo-fallback" className="hidden h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <ImageIcon className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-[#fafafa]">DeoHub</h1>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Theme Toggler */}
          <button 
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full p-2 text-zinc-650 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-zinc-650" />}
          </button>

          {/* Accent Color Palette Switcher */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center"
              title="Change Accent Color"
            >
              <div className="w-5 h-5 rounded-full bg-brand border border-black/10 dark:border-white/20 shadow" />
            </button>
            
            {showPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
                <div className="absolute right-0 mt-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl shadow-xl flex items-center gap-2.5 min-w-[210px]">
                  <span className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 mr-1">Hue:</span>
                  <div className="flex items-center gap-1.5">
                    {colors.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setAccent(c.id);
                          setShowPicker(false);
                        }}
                        className={cn(
                          "w-5.5 h-5.5 rounded-full transition-transform hover:scale-115 active:scale-90 border border-transparent shadow-sm flex items-center justify-center",
                          c.bg,
                          accent === c.id ? "scale-115 border-zinc-900 dark:border-white" : ""
                        )}
                        title={c.name}
                      >
                        {accent === c.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            type="button"
            onClick={() => navigate('/search')}
            className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-[#a1a1aa] dark:hover:bg-[#18181b] dark:hover:text-[#fafafa]"
          >
            <Search size={20} />
          </button>
          <button 
            type="button"
            onClick={onMenuOpen}
            className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-[#a1a1aa] dark:hover:bg-[#18181b] dark:hover:text-[#fafafa] md:hidden"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

function CreatorBar() {
  const navigate = useNavigate();
  const creatorItems = [
    { icon: Radio, label: 'Live', path: '/live' },
    { icon: Film, label: 'Reels', path: '/reels' },
    { icon: UploadCloud, label: 'Upload', path: '/upload' },
    { icon: Target, label: 'Ad Center', path: '/adcenter' },
  ];
  return (
    <div className="sticky top-[57px] z-30 flex md:hidden items-center justify-around bg-[#09090b]/95 backdrop-blur border-b border-zinc-850 py-3 px-2 gap-1 overflow-x-auto no-scrollbar">
      {creatorItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all border",
            isActive 
              ? "bg-zinc-900 text-[#7c3aed] border-zinc-800 shadow-inner" 
              : "text-zinc-400 border-transparent hover:text-white"
          )}
        >
          <item.icon size={13} className="text-[#7c3aed]" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

function BottomNav({ unreadCount, notificationCount }: { unreadCount: number, notificationCount: number }) {
  const currentUser = authService.getCurrentUser();
  const profilePath = currentUser?.username ? `/profile/${currentUser.username}` : '/profile';
  const navItems = [
    { icon: HomeIcon, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: MessageSquare, label: 'Chats', path: '/chats', badge: unreadCount },
    { icon: Bot, label: 'Assists', path: '/ai-chat' },
    { icon: Bell, label: 'Alerts', path: '/notifications', badge: notificationCount },
    { icon: UserIcon, label: 'Profile', path: profilePath },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-40 w-full border-t border-zinc-200 bg-white/90 pb-safe backdrop-blur-lg dark:border-[#27272a] dark:bg-[#09090b]/90 md:hidden">
      <div className="mx-auto flex max-w-lg justify-around py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-colors relative",
              isActive 
                ? "text-[#7c3aed]" 
                : "text-zinc-500 hover:text-zinc-900 dark:text-[#a1a1aa] dark:hover:text-[#fafafa]"
            )}
          >
            <div className="relative">
              <item.icon size={24} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#7c3aed] text-[8px] font-bold text-white ring-2 ring-white dark:ring-[#09090b]">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Sidebar for desktop
function Sidebar({ 
  unreadCount, 
  notificationCount,
  theme,
  setTheme,
  accent,
  setAccent
}: { 
  unreadCount: number; 
  notificationCount: number;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => any;
  accent: string;
  setAccent: (a: any) => any;
}) {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const profilePath = currentUser?.username ? `/profile/${currentUser.username}` : '/profile';
    const navItems = [
        { icon: HomeIcon, label: 'Home', path: '/' },
        { icon: Search, label: 'Search', path: '/search' },
        { icon: MessageSquare, label: 'Messages', path: '/chats', badge: unreadCount },
        { icon: Bot, label: 'AI Assistant', path: '/ai-chat' },
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: notificationCount },
        { icon: UserIcon, label: 'Profile', path: profilePath },
    ];

    const creatorItems = [
        { icon: Radio, label: 'Live Broadcast', path: '/live' },
        { icon: Film, label: 'Reels Feed', path: '/reels' },
        { icon: UploadCloud, label: 'Video Upload', path: '/upload' },
        { icon: Target, label: 'Advertisement Center', path: '/adcenter' },
    ];

    const colors = [
        { id: 'violet', bg: 'bg-violet-600', name: 'Violet' },
        { id: 'blue', bg: 'bg-blue-600', name: 'Ocean' },
        { id: 'rose', bg: 'bg-rose-600', name: 'Rose' },
        { id: 'emerald', bg: 'bg-emerald-600', name: 'Emerald' },
        { id: 'amber', bg: 'bg-amber-600', name: 'Amber' },
    ];

    return (
        <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-[#27272a]/25 dark:border-[#27272a] bg-zinc-50 dark:bg-[#09090b] px-6 py-8 md:block overflow-y-auto scrollbar-none transition-colors duration-200">
            <div className="mb-6 flex items-center gap-3">
                <img 
                    src="/logo.png" 
                    className="h-10 w-10 rounded-xl object-cover border border-zinc-200 dark:border-[#27272a]" 
                    alt="DeoHub Logo"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallbackEl = document.getElementById('sidebar-logo-fallback');
                        if (fallbackEl) fallbackEl.style.display = 'flex';
                    }}
                />
                <div id="sidebar-logo-fallback" className="hidden h-10 w-10 items-center justify-center rounded-xl bg-brand">
                    <ImageIcon className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-[#fafafa]">DeoHub</h1>
            </div>

            {/* Customize panel inside desktop sidebar */}
            <div className="mb-6 rounded-xl border border-zinc-200/60 bg-white p-3 dark:border-zinc-850 dark:bg-zinc-900/40 space-y-3 shadow-xs transition-colors">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400 dark:text-zinc-500">Appearance</span>
                    <button
                        type="button"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-850 text-[10px] font-black hover:scale-105 active:scale-95 transition-all text-zinc-800 dark:text-zinc-200"
                    >
                        {theme === 'dark' ? (
                            <>
                                <Sun size={11} className="text-amber-400" />
                                <span>Light</span>
                            </>
                        ) : (
                            <>
                                <Moon size={11} className="text-zinc-500" />
                                <span>Dark</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400 dark:text-zinc-500 block">Theme Hue</span>
                    <div className="flex items-center gap-1.5 pt-0.5">
                        {colors.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setAccent(c.id)}
                                className={cn(
                                    "w-5 h-5 rounded-full border transition-all hover:scale-110 active:scale-90 flex items-center justify-center",
                                    c.bg,
                                    accent === c.id ? "border-zinc-900 dark:border-white scale-110 shadow-sm" : "border-transparent"
                                )}
                                title={c.name}
                            >
                                {accent === c.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <nav className="space-y-6">
                <div>
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Main hub</p>
                    <div className="space-y-1.5">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 font-bold text-xs uppercase tracking-wider transition-all",
                                    isActive 
                                        ? "bg-white dark:bg-zinc-900 text-brand border border-zinc-200 dark:border-zinc-800 shadow-sm" 
                                        : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white"
                                )}
                            >
                                <div className="relative">
                                    <item.icon size={18} />
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[8px] font-bold text-white ring-2 ring-white dark:ring-[#09090b]">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Creator panels</p>
                    <div className="space-y-1.5">
                        {creatorItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 font-bold text-xs uppercase tracking-wider transition-all",
                                    isActive 
                                        ? "bg-white dark:bg-zinc-900 text-brand border border-zinc-200 dark:border-zinc-800 shadow-sm" 
                                        : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white"
                                )}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
                
                <div className="pt-8">
                  <button 
                    id="create-post-nav-btn"
                    onClick={() => navigate('/create')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-bold text-white shadow-lg focus:outline-none hover:opacity-90 active:scale-95 transition-all"
                  >
                      <PlusSquare size={20} />
                      <span>Create Post</span>
                  </button>
                </div>
            </nav>

            <div className="absolute bottom-8 left-6 right-6 pt-6 border-t border-zinc-200 dark:border-[#27272a]">
               <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                onClick={() => {
                    const user = authService.getCurrentUser();
                    if (user?.username) navigate(`/profile/${user.username}`);
                }}
               >
                  <div className="h-10 w-10 rounded-full bg-brand p-[1px]">
                     <img 
                        src={authService.getCurrentUser()?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authService.getCurrentUser()?.username || 'Guest'}`} 
                        className="h-full w-full rounded-full bg-white dark:bg-[#18181b] border-2 border-white dark:border-[#09090b] object-cover" 
                        alt="Profile"
                     />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-zinc-850 dark:text-[#fafafa]">
                        {authService.getCurrentUser()?.username || 'Guest'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate dark:text-[#71717a]">
                        @{authService.getCurrentUser()?.username || 'guest'}
                    </p>
                  </div>
               </div>
            </div>
        </aside>
    );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUserLiveStream, setCurrentUserLiveStream] = useState<any | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  // Check if current user is live and keep in sync
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user || isAuthPage) {
      setCurrentUserLiveStream(null);
      return;
    }

    const checkActiveLive = async () => {
      try {
        const active = await liveService.getActiveStreams();
        const myStream = Array.isArray(active) ? active.find((s: any) => String(s.user_id) === String(user.id) && s.status === 'active') : null;
        setCurrentUserLiveStream(myStream || null);
      } catch (err) {
        console.error('Failed to get active streams:', err);
      }
    };

    checkActiveLive();

    const socket = getSocket();
    const handleStreamStartedGlobal = (stream: any) => {
      if (String(stream.user_id) === String(user.id) && stream.status === 'active') {
        setCurrentUserLiveStream(stream);
      }
    };

    const handleStreamStoppedGlobal = ({ streamId }: { streamId: number }) => {
      setCurrentUserLiveStream(prev => (prev?.id === streamId ? null : prev));
    };

    socket.on('live_stream_started', handleStreamStartedGlobal);
    socket.on('live_stream_stopped_global', handleStreamStoppedGlobal);

    return () => {
      socket.off('live_stream_started', handleStreamStartedGlobal);
      socket.off('live_stream_stopped_global', handleStreamStoppedGlobal);
    };
  }, [location.pathname, isAuthPage]);

  const handleStopMyStreamGlobally = async () => {
    if (!currentUserLiveStream) return;
    const confirmStop = window.confirm("Are you sure you want to stop your active live stream?");
    if (!confirmStop) return;

    try {
      await liveService.stopStream(currentUserLiveStream.id);
      setCurrentUserLiveStream(null);
      toast.success('Your live stream has ended.');
      if (location.pathname === '/live') {
        window.location.reload();
      }
    } catch (err: any) {
      toast.error('Failed to stop live stream: ' + err.message);
    }
  };

  // Smoothly hide the pre-rendering splash screen once initial app layout settled
  useEffect(() => {
    const timer = setTimeout(() => {
      const splash = document.getElementById('initial-splash-screen');
      if (splash) {
        splash.classList.add('fade-out');
        const hiddenTimer = setTimeout(() => {
          splash.style.display = 'none';
        }, 400); // matching 0.4s transition duration defined in style tag
        return () => clearTimeout(hiddenTimer);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Dynamic Theme (Light/Dark Mode) and Accent color state definition
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  const [accent, setAccent] = useState<'violet' | 'blue' | 'rose' | 'emerald' | 'amber'>(() => {
    return (localStorage.getItem('accentColor') as any) || 'violet';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('accentColor', accent);
  }, [accent]);

  // Guard routing: if user is not logged in, or token has expired, log out & redirect immediately to login.
  useEffect(() => {
    if (isAuthPage) return;

    const checkAuthStatus = () => {
      const user = authService.getCurrentUser();
      const token = authService.getToken();
      if (!user || !token || authService.isTokenExpired()) {
        authService.logout();
        navigate('/login');
      }
    };

    checkAuthStatus();

    // Check auth status periodically (every 5 seconds) to handle active session expirations
    const interval = setInterval(checkAuthStatus, 5000);
    return () => clearInterval(interval);
  }, [location.pathname, isAuthPage, navigate]);

  // Handle global unauthorized session events cleanly without hacking window.fetch
  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("Session expired or invalid token. Automatic logout triggered.");
      authService.logout();
      toast.error("Session expired. Please log in again.");
      navigate('/login');
    };

    window.addEventListener('unauthorized_session', handleUnauthorized);
    return () => {
      window.removeEventListener('unauthorized_session', handleUnauthorized);
    };
  }, [navigate]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) return;

    const socket = getSocket();
    socketRef.current = socket;

    // Join room for real-time notifications and messages
    socket.emit('join_room', { roomId: `user_${user.id}`, userId: user.id });

    const handleReceiveMessage = (data: any) => {
      if (location.pathname !== '/chats') {
        setUnreadCount(prev => prev + 1);
        toast.message('New Message', {
          description: data.message,
        });
      }
    };

    const handleNewNotification = (data: any) => {
      if (location.pathname !== '/notifications') {
        setNotificationCount(prev => prev + 1);
        let message = '';
        if (data.type === 'like') message = `${data.sender_username} liked your post`;
        if (data.type === 'comment') message = `${data.sender_username} commented on your post`;
        if (data.type === 'follow') message = `${data.sender_username} started following you`;
        
        if (message) {
          toast.info(message);
        }
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('new_notification', handleNewNotification);
    };
  }, [location.pathname]);

  // Reset counts when visiting pages
  useEffect(() => {
    if (location.pathname === '/chats') {
      setUnreadCount(0);
    }
    if (location.pathname === '/notifications') {
        setNotificationCount(0);
    }
  }, [location.pathname]);

  return (
    <div className={cn(
      "min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-[#fafafa] transition-colors duration-200",
      !isAuthPage && "md:pl-64"
    )}>
      <ScrollToTop />
      {!isAuthPage && <Header onMenuOpen={() => setIsMenuOpen(true)} theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />}
      {!isAuthPage && <CreatorBar />}
      {!isAuthPage && <Sidebar unreadCount={unreadCount} notificationCount={notificationCount} theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />}
      
      <main className={cn(
        "mx-auto pb-24 pt-4 md:pb-8",
        isAuthPage ? "max-w-none px-0 pt-0" : "max-w-lg md:max-w-2xl lg:max-w-3xl"
      )}>
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/chats" element={<Chats />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/upload" element={<VideoUpload />} />
            <Route path="/adcenter" element={<AdCenter />} />
            <Route path="/live" element={<Live />} />
            <Route path="/database-setup" element={<DatabaseCenter />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Mobile Right Edge Menu Drawer Overlay with Creator Links */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end md:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            {/* Drawer Body */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 max-w-[80vw] h-full bg-[#09090b] border-l border-zinc-800 p-6 flex flex-col justify-between text-white z-10 shadow-2xl animate-none"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-zinc-850">
                  <span className="font-black uppercase tracking-widest text-[#7c3aed] text-xs">Hub Portal</span>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Creator Panels</p>
                    <div className="space-y-1.5">
                      <NavLink
                        to="/live"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) => cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                          isActive ? "bg-zinc-900 text-[#7c3aed] border border-zinc-800" : "text-zinc-400 hover:bg-zinc-900/40 hover:text-white"
                        )}
                      >
                        <Radio size={16} />
                        <span>Live Broadcast</span>
                      </NavLink>
                      <NavLink
                        to="/reels"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) => cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                          isActive ? "bg-zinc-900 text-[#7c3aed] border border-zinc-800" : "text-zinc-400 hover:bg-zinc-900/40 hover:text-white"
                        )}
                      >
                        <Film size={16} />
                        <span>Reels Feed</span>
                      </NavLink>
                      <NavLink
                        to="/upload"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) => cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                          isActive ? "bg-zinc-900 text-[#7c3aed] border border-zinc-800" : "text-zinc-400 hover:bg-zinc-900/40"
                        )}
                      >
                        <UploadCloud size={16} />
                        <span>Video Upload</span>
                      </NavLink>
                      <NavLink
                        to="/adcenter"
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) => cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                          isActive ? "bg-zinc-900 text-[#7c3aed] border border-zinc-800" : "text-[#a1a1aa] hover:bg-zinc-900/40 hover:text-white"
                        )}
                      >
                        <Target size={16} />
                        <span>Ad Center</span>
                      </NavLink>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Fast Action</p>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/create');
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#3b82f6] py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all"
                    >
                      <PlusSquare size={14} />
                      <span>Create Post</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer footer profile */}
              <div 
                className="pt-4 border-t border-zinc-850 flex items-center gap-3 cursor-pointer hover:opacity-85"
                onClick={() => {
                  setIsMenuOpen(false);
                  const user = authService.getCurrentUser();
                  if (user?.username) navigate(`/profile/${user.username}`);
                }}
              >
                <img 
                  src={authService.getCurrentUser()?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authService.getCurrentUser()?.username || 'Guest'}`} 
                  className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 object-cover" 
                  alt="avatar" 
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">@{authService.getCurrentUser()?.username || 'guest'}</p>
                  <p className="text-[9px] text-zinc-500 font-extrabold uppercase">View Profile</p>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!isAuthPage && <BottomNav unreadCount={unreadCount} notificationCount={notificationCount} />}
      <Toaster richColors position="top-right" theme="dark" />
    </div>
  );
}
