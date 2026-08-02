import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  GitBranch, 
  FileText, 
  Brain, 
  Search, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  Terminal,
  Activity,
  PanelRightClose,
  PanelRight
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useChatStore } from '../store/chatStore';
import { useRepositoryStore } from '../store/repositoryStore';
import { Button } from '../components/ui/Button';
import { cn } from '../utils';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useUserStore();
  const { 
    sessions, 
    activeSessionId, 
    activeContextPanelTab, 
    setContextPanelTab,
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
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);

  // Trigger hydration from backend
  useEffect(() => {
    fetchRepositories();
    fetchDocuments();
    fetchSessions();
    fetchMemories();
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const activeRepo = repositories.find((r) => r.id === activeRepositoryId) || null;
  const latestMessage = activeSession?.messages[activeSession.messages.length - 1] || null;

  // Handle Right Panel Resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 260 && newWidth < 600) {
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/chat', label: 'AI Chat', icon: MessageSquare },
    { to: '/repositories', label: 'Repositories', icon: GitBranch },
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/search', label: 'Semantic Search', icon: Search },
    { to: '/memory', label: 'Developer Memory', icon: Brain },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  // Right context panel should only show on pages where contextual AI results are relevant (Chat page mostly)
  const showRightPanel = rightPanelOpen && (location.pathname === '/chat' || location.pathname === '/search');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      
      {/* 1. LEFT SIDEBAR */}
      <aside 
        className={cn(
          "flex flex-col h-full bg-zinc-900 border-r border-zinc-800 transition-all duration-300 z-10",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-800 bg-zinc-900/60">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-md shadow-blue-500/10">
                <Terminal className="h-4.5 w-4.5 text-zinc-50" />
              </div>
              <span className="font-bold text-sm tracking-tight text-zinc-100">DevAssist AI</span>
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
                      ? "bg-zinc-800/80 text-blue-400 border-l-2 border-blue-500 shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40"
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
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/40">
          {!sidebarCollapsed ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-2 py-1">
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
                className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800"
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
      <main className="flex-grow flex flex-col h-full bg-zinc-950 relative overflow-hidden">
        {/* Floating Top Header bar for active Workspace / Repo */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
              <Database className="w-4 h-4 text-blue-500" />
              <span>Active Repository:</span>
            </div>
            {activeRepo ? (
              <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 rounded font-semibold">
                {activeRepo.owner}/{activeRepo.name}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-zinc-500 italic">None selected</span>
            )}
          </div>
          
          {/* Right Panel Toggle Button (only on supported routes) */}
          {(location.pathname === '/chat' || location.pathname === '/search') && (
            <button 
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className="p-1.5 text-zinc-455 text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900 rounded border border-zinc-850 transition"
              title={rightPanelOpen ? "Close Context Panel" : "Open Context Panel"}
            >
              {rightPanelOpen ? <PanelRightClose className="w-4.5 h-4.5" /> : <PanelRight className="w-4.5 h-4.5" />}
            </button>
          )}
        </header>

        {/* Content outlet view */}
        <div className="flex-grow overflow-hidden select-text">
          <Outlet />
        </div>
      </main>

      {/* 3. RIGHT PANEL (RESIZABLE CONTEXT PANEL) */}
      {showRightPanel && (
        <>
          {/* Resize Handle / Dragger */}
          <div 
            onMouseDown={() => setIsResizing(true)}
            className={cn(
              "w-1 h-full cursor-col-resize hover:bg-blue-600/60 transition-colors z-20",
              isResizing ? "bg-blue-500" : "bg-zinc-900"
            )}
          />

          <aside 
            className="flex flex-col h-full bg-zinc-900 border-l border-zinc-850"
            style={{ width: `${rightPanelWidth}px` }}
          >
            {/* Header Tabs */}
            <div className="flex items-center h-14 border-b border-zinc-800 bg-zinc-900/60 px-2.5">
              <div className="flex w-full bg-zinc-950 p-1 rounded-lg border border-zinc-800/80">
                <button
                  onClick={() => setContextPanelTab('context')}
                  className={cn(
                    "flex-grow text-[11px] py-1 px-1.5 font-semibold rounded text-center transition",
                    activeContextPanelTab === 'context'
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Files Context
                </button>
                <button
                  onClick={() => setContextPanelTab('reasoning')}
                  className={cn(
                    "flex-grow text-[11px] py-1 px-1.5 font-semibold rounded text-center transition",
                    activeContextPanelTab === 'reasoning'
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Agent Reasoning
                </button>
                <button
                  onClick={() => setContextPanelTab('tokens')}
                  className={cn(
                    "flex-grow text-[11px] py-1 px-1.5 font-semibold rounded text-center transition",
                    activeContextPanelTab === 'tokens'
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Tokens Usage
                </button>
              </div>
            </div>

            {/* Panel Tab View Content */}
            <div className="flex-grow p-5 overflow-y-auto space-y-4">
              
              {/* TAB 1: RETRIEVED FILES & SOURCES */}
              {activeContextPanelTab === 'context' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Retrieved Files</h3>
                    <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 text-[10px] font-mono text-zinc-400 rounded">
                      {latestMessage?.retrievedFiles?.length || 0} hits
                    </span>
                  </div>

                  {latestMessage?.retrievedFiles && latestMessage.retrievedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {latestMessage.retrievedFiles.map((file, i) => (
                        <div key={i} className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg hover:border-zinc-800 transition">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[11.5px] font-mono font-semibold text-blue-400 truncate max-w-[200px]" title={file.path}>
                              {file.path.split('/').pop()}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded">
                              {(file.confidence * 100).toFixed(0)}% match
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-zinc-500 truncate" title={file.path}>
                            {file.path}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-zinc-950/20 border border-dashed border-zinc-800 rounded-lg">
                      <FileText className="w-8 h-8 text-zinc-650 mx-auto mb-2 text-zinc-600" />
                      <p className="text-xs text-zinc-400 font-medium">No files retrieved yet</p>
                      <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto">
                        Ask a codebase question to see retrieved semantic search contexts.
                      </p>
                    </div>
                  )}

                  {/* Active Repository context */}
                  <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-950/40 mt-6">
                    <h4 className="text-[11.5px] font-bold text-zinc-300 mb-2">Indexing Context</h4>
                    {activeRepo ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-semibold">Indexed Files:</span>
                          <span className="text-zinc-300 font-mono">{activeRepo.indexedFiles} / {activeRepo.totalFiles}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-semibold">Workspace Size:</span>
                          <span className="text-zinc-300 font-mono">{activeRepo.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500 font-semibold">Main Language:</span>
                          <span className="text-zinc-300 font-mono">{activeRepo.language}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10.5px] text-zinc-500 italic">No workspace connected</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: AGENT REASONING STATUS */}
              {activeContextPanelTab === 'reasoning' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Agent Reasoning Status</h3>
                    <span className="flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-950 border border-zinc-850 px-1.5 py-0.5 rounded font-semibold">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      Live Agent
                    </span>
                  </div>

                  {latestMessage?.agentSteps && latestMessage.agentSteps.length > 0 ? (
                    <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-4">
                      {latestMessage.agentSteps.map((step, idx) => (
                        <div key={idx} className="relative group">
                          {/* Timeline dot */}
                          <div className={cn(
                            "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border shadow-sm",
                            step.status === 'completed' && "bg-emerald-500 border-emerald-400",
                            step.status === 'running' && "bg-blue-500 border-blue-400 animate-pulse",
                            step.status === 'pending' && "bg-zinc-800 border-zinc-700"
                          )} />
                          
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className={cn(
                                "text-xs font-bold font-mono truncate max-w-[200px]",
                                step.status === 'completed' && "text-zinc-200",
                                step.status === 'running' && "text-blue-400",
                                step.status === 'pending' && "text-zinc-500"
                              )}>
                                {step.title}
                              </h4>
                              {step.durationMs && (
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {step.durationMs}ms
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 capitalize mt-0.5">
                              {step.status === 'running' ? 'Active Thought Process' : step.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-zinc-950/20 border border-dashed border-zinc-800 rounded-lg">
                      <Brain className="w-8 h-8 text-zinc-650 mx-auto mb-2 text-zinc-600" />
                      <p className="text-xs text-zinc-400 font-medium">No reasoning logs available</p>
                      <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto">
                        Reasoning steps will appear as the AI agent runs diagnostics and vector search queries.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TOKENS STATS */}
              {activeContextPanelTab === 'tokens' && (
                <div className="space-y-4">
                  <div className="border-b border-zinc-800 pb-2">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Tokens Usage Metadata</h3>
                  </div>

                  {latestMessage?.tokensUsed ? (
                    <div className="space-y-4">
                      {/* Metric cards */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg">
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Prompt</p>
                          <p className="text-lg font-bold font-mono text-zinc-200 mt-1">
                            {latestMessage.tokensUsed.prompt.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg">
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Completion</p>
                          <p className="text-lg font-bold font-mono text-zinc-200 mt-1">
                            {latestMessage.tokensUsed.completion.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Total Token display */}
                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-zinc-350 text-zinc-300">Total Context Window</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Prompt + Generation</p>
                        </div>
                        <span className="text-xl font-extrabold font-mono text-blue-400">
                          {latestMessage.tokensUsed.total.toLocaleString()}
                        </span>
                      </div>

                      {/* Token usage visual bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
                          <span>Usage Breakdown</span>
                          <span>
                            {((latestMessage.tokensUsed.total / 128000) * 100).toFixed(2)}% of 128k
                          </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850 flex">
                          <div 
                            className="bg-blue-600 h-full"
                            style={{ width: `${(latestMessage.tokensUsed.prompt / latestMessage.tokensUsed.total) * 100}%` }}
                            title="Prompt Tokens"
                          />
                          <div 
                            className="bg-emerald-600 h-full"
                            style={{ width: `${(latestMessage.tokensUsed.completion / latestMessage.tokensUsed.total) * 100}%` }}
                            title="Completion Tokens"
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-500">
                          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Prompt</span>
                          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Completion</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-zinc-950/20 border border-dashed border-zinc-800 rounded-lg">
                      <Activity className="w-8 h-8 text-zinc-650 mx-auto mb-2 text-zinc-600" />
                      <p className="text-xs text-zinc-400 font-medium">No token metrics</p>
                      <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto">
                        Token metrics populate once messages are generated by the LLM.
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </aside>
        </>
      )}

    </div>
  );
};
