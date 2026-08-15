import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  MessageSquareCode, 
  FolderGit, 
  Files, 
  Sparkles, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useChatStore } from '../store/chatStore';
import { useRepositoryStore } from '../store/repositoryStore';
import { Button } from '../components/ui/Button';
import { cn } from '../utils';

export const DashboardLayout: React.FC = () => {
  const { user, logout, updateProfile } = useUserStore();
  const { 
    fetchSessions,
    fetchMemories 
  } = useChatStore();
  const { 
    repositories, 
    activeRepositoryId,
    fetchRepositories,
    fetchDocuments 
  } = useRepositoryStore();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileProvider, setProfileProvider] = useState<'groq' | 'openai'>('groq');
  const [profileGroqKey, setProfileGroqKey] = useState('');
  const [profileOpenAIKey, setProfileOpenAIKey] = useState('');
  const [profileHuggingFaceKey, setProfileHuggingFaceKey] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(profileName, profileEmail, profileProvider, profileGroqKey, profileOpenAIKey, profileHuggingFaceKey);
    setIsProfileOpen(false);
  };

  // Trigger hydration from backend
  useEffect(() => {
    fetchRepositories();
    fetchDocuments();
    fetchSessions();
    fetchMemories();
  }, []);

  const activeRepo = repositories.find((r) => r.id === activeRepositoryId) || null;

  // Resizing effect removed

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { to: '/chat', label: 'AI Chat', icon: MessageSquareCode },
    { to: '/repositories', label: 'Repositories', icon: FolderGit },
    { to: '/documents', label: 'Documents', icon: Files },
    { to: '/memory', label: 'Developer Memory', icon: Sparkles },
  ];

  // Right panel removed

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060608] text-zinc-100 select-none">
      
      {/* 1. LEFT SIDEBAR */}
      <aside 
        className={cn(
          "flex flex-col h-full bg-[#0a0a0c] border-r border-[#1c1c21] transition-all duration-300 z-10",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#1c1c21] bg-[#0a0a0c]">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-md shadow-blue-500/10">
                <Terminal className="h-4.5 w-4.5 text-zinc-50" />
              </div>
              <span className="font-bold text-sm tracking-tight text-zinc-100">CodexRAG</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Terminal className="h-4.5 w-4.5 text-zinc-50" />
            </div>
          )}
          
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800/80 transition hidden md:block"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-grow py-4 px-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-md transition-all",
                    isActive 
                      ? "bg-[#17171c] text-white border-l-2 border-blue-500 shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-[#111115]"
                  )
                }
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-[#1c1c21] bg-[#0a0a0c]">
          {!sidebarCollapsed ? (
            <div className="flex flex-col gap-2">
              <div 
                className="flex items-center gap-3 px-2 py-1 cursor-pointer hover:bg-zinc-900 rounded-md transition"
                onClick={() => {
                  setProfileName(user?.name || '');
                  setProfileEmail(user?.email || '');
                  setProfileProvider(user?.llmProvider || 'groq');
                  setProfileGroqKey(user?.groqApiKey || '');
                  setProfileOpenAIKey(user?.openaiApiKey || '');
                  setProfileHuggingFaceKey(user?.huggingfaceApiKey || '');
                  setIsProfileOpen(true);
                }}
                title="View/Edit Profile"
              >
                <img 
                  src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=user`} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800"
                />
                <div className="overflow-hidden">
                  <h4 className="text-xs font-semibold text-zinc-200 truncate">{user?.name}</h4>
                  <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="w-full justify-start text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Log out</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <img 
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=user`} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 cursor-pointer hover:opacity-85 transition"
                onClick={() => {
                  setProfileName(user?.name || '');
                  setProfileEmail(user?.email || '');
                  setProfileProvider(user?.llmProvider || 'groq');
                  setProfileGroqKey(user?.groqApiKey || '');
                  setProfileOpenAIKey(user?.openaiApiKey || '');
                  setProfileHuggingFaceKey(user?.huggingfaceApiKey || '');
                  setIsProfileOpen(true);
                }}
                title="View/Edit Profile"
              />
              <button 
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 p-2 rounded hover:bg-zinc-800 transition"
                title="Log out"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. CENTER PANEL (MAIN CONTENT VIEWPORT) */}
      <main className="flex-grow flex flex-col h-full bg-[#060608] relative overflow-hidden">
        {/* Floating Top Header bar for active Workspace / Repo */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-[#1c1c21] bg-[#060608] z-10">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <Database className="w-4 h-4 text-blue-500" />
              <span>Active Repository:</span>
            </div>
            {activeRepo ? (
              <span className="px-2 py-0.5 bg-[#0d0d10] border border-[#1c1c21] text-[11px] font-mono text-zinc-300 rounded font-semibold">
                {activeRepo.owner}/{activeRepo.name}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-zinc-500 italic">None selected</span>
            )}
          </div>
          
        </header>

        {/* Content outlet view */}
        <div className="flex-grow overflow-hidden select-text">
          <Outlet />
        </div>
      </main>

      {/* 3. PROFILE DETAILS MODAL */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text">
          <div className="w-full max-w-sm bg-[#0d0d10] border border-[#1c1c21] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-[#1c1c21] flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-100">Developer Profile</h3>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs transition"
              >
                Close
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-2 pb-2">
                <img 
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profileEmail || 'user')}`} 
                  alt="Avatar" 
                  className="w-16 h-16 rounded-full border border-[#1c1c21] bg-zinc-950 p-1 shadow-inner animate-pulse"
                />
                <span className="text-[10px] text-zinc-500 font-mono">Dynamic Gravatar</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide">Developer Name</label>
                <input 
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-[#060608] border border-[#1c1c21] rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 transition"
                  placeholder="Enter name..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide">Email Address</label>
                <input 
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full bg-[#060608] border border-[#1c1c21] rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 transition"
                  placeholder="Enter email address..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide">Active LLM Provider</label>
                <select 
                  value={profileProvider}
                  onChange={(e) => setProfileProvider(e.target.value as 'groq' | 'openai')}
                  className="w-full bg-[#060608] border border-[#1c1c21] rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 transition cursor-pointer"
                >
                  <option value="groq">Groq (Default)</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>

              {profileProvider === 'groq' ? (
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide">Groq API Key</label>
                  <input 
                    type="password"
                    value={profileGroqKey}
                    onChange={(e) => setProfileGroqKey(e.target.value)}
                    className="w-full bg-[#060608] border border-[#1c1c21] rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 transition"
                    placeholder="gsk_... (Optional)"
                  />
                  <span className="text-[9px] text-zinc-500 block leading-normal">
                    Provide your own Groq API key to override default server settings.
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide">OpenAI API Key</label>
                  <input 
                    type="password"
                    value={profileOpenAIKey}
                    onChange={(e) => setProfileOpenAIKey(e.target.value)}
                    className="w-full bg-[#060608] border border-[#1c1c21] rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 transition"
                    placeholder="sk-... (Optional)"
                  />
                  <span className="text-[9px] text-zinc-500 block leading-normal">
                    Provide your own OpenAI API key to override default server settings.
                  </span>
                </div>
              )}

              <div className="space-y-1.5 border-t border-zinc-800/60 pt-3">
                <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide">Hugging Face API Token</label>
                <input 
                  type="password"
                  value={profileHuggingFaceKey}
                  onChange={(e) => setProfileHuggingFaceKey(e.target.value)}
                  className="w-full bg-[#060608] border border-[#1c1c21] rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 transition"
                  placeholder="hf_... (Optional)"
                />
                <span className="text-[9px] text-zinc-500 block leading-normal">
                  Provide your own Hugging Face token to run free cloud embeddings when syncing codebases.
                </span>
              </div>

              {/* Privacy & Zero-Retention Security Badge */}
              <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg text-[10.5px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Zero-Retention Privacy Architecture</span>
                </div>
                <p className="text-[9.5px] text-zinc-500 leading-normal">
                  For your privacy and security, your API key is stored <strong>strictly in your local browser session</strong> and is never saved to our database or server logs.
                </p>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" className="w-full text-xs font-semibold">
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
