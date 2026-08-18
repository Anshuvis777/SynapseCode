import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch, 
  RotateCw, 
  Trash2, 
  Plus,
  MessageSquare,
  FolderGit,
  Files,
  Search,
  ArrowUpRight,
  Activity,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { useChatStore } from '../store/chatStore';
import { useUserStore } from '../store/userStore';

// Simple counter component with counting up animation
const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const duration = 800; // 800ms
    const stepTime = 16; // 60fps
    const steps = duration / stepTime;
    const increment = value / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <>{count}</>;
};

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { repositories, documents, deleteRepo, reindexRepo, activeRepositoryId } = useRepositoryStore();
  const { memories, sessions } = useChatStore();

  const activeRepo = repositories.find(r => r.id === activeRepositoryId);
  const workspaceTitle = activeRepo ? `${activeRepo.name}` : (user?.name ? `${user.name}'s Workspace` : 'Primary Workspace');

  const indexedRepos = repositories.filter(r => r.status === 'indexed');
  const indexingRepos = repositories.filter(r => r.status === 'indexing');

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this repository and its vector embeddings?")) {
      await deleteRepo(id);
    }
  };

  const handleReindex = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await reindexRepo(id);
  };

  // Compile dynamic activity list from stores
  const recentActivities = React.useMemo(() => {
    const items: { label: string; description: string; date: string; icon: any; color: string }[] = [];

    // Repositories
    repositories.slice(0, 2).forEach((repo) => {
      items.push({
        label: `Repo Synced: ${repo.name}`,
        description: repo.status === 'failed' ? 'Embedding generation failed' : `Indexed ${repo.indexedFiles} files in ${repo.language || 'codebase'}`,
        date: repo.lastIndexedTime || 'Just now',
        icon: GitBranch,
        color: repo.status === 'failed' ? 'text-red-400 bg-red-950/20' : 'text-blue-400 bg-blue-950/20'
      });
    });

    // Documents
    documents.slice(0, 2).forEach((doc) => {
      items.push({
        label: `Doc Ingested: ${doc.name}`,
        description: `Uploaded and embedded ${doc.size} document`,
        date: doc.uploadedAt || 'Recently',
        icon: Files,
        color: 'text-emerald-400 bg-emerald-950/20'
      });
    });

    // Chats
    sessions.slice(0, 2).forEach((session) => {
      items.push({
        label: `Chat Session: ${session.title}`,
        description: `Last conversation interaction`,
        date: session.updatedAt || 'Recently',
        icon: MessageSquare,
        color: 'text-purple-400 bg-purple-950/20'
      });
    });

    // Default item if empty
    if (items.length === 0) {
      items.push({
        label: 'Workspace Initialized',
        description: 'Developer RAG environment launched successfully',
        date: 'Just now',
        icon: CheckCircle2,
        color: 'text-emerald-400 bg-emerald-950/20'
      });
    }

    return items;
  }, [repositories, documents, sessions]);

  // Quick Action List
  const quickActions = [
    { label: 'Start AI Chat', description: 'Ask questions about codebase architecture', icon: MessageSquare, path: '/chat', border: 'hover:border-purple-500/20' },
    { label: 'Semantic Code Search', description: 'Query files via vector embeddings', icon: Search, path: '/search', border: 'hover:border-blue-500/20' },
    { label: 'Link Repository', description: 'Sync a new Git repo to vector DB', icon: FolderGit, path: '/repositories', border: 'hover:border-amber-500/20' },
    { label: 'Upload Document', description: 'Ingest reference PDFs and Markdown', icon: Files, path: '/documents', border: 'hover:border-emerald-500/20' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 h-full overflow-y-auto bg-[#060608]">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-[#1c1c21] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white heading-display">Dashboard / overview</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage your connected repository indices, code assets, and custom developer instructions.
          </p>
        </div>
        <button 
          onClick={() => navigate('/repositories')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#17171c] hover:bg-[#202027] border border-[#2e2e36] rounded-md transition-all cursor-pointer shadow-depth-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Repository</span>
        </button>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Stat 1: Active Workspace */}
        <div className="minimal-card p-4 space-y-1.5 shadow-depth-1">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Active Workspace</p>
          <h3 className="text-sm font-bold text-zinc-200 truncate">{workspaceTitle}</h3>
          <p className="text-[10px] text-zinc-500">{activeRepo ? `${activeRepo.language || 'Active'} codebase` : (user?.email || 'Local developer context')}</p>
        </div>

        {/* Stat 2: Repositories */}
        <div className="minimal-card p-4 space-y-1.5 shadow-depth-1">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Repositories</p>
          <h3 className="text-sm font-bold text-zinc-200 font-mono">
            <AnimatedCounter value={repositories.length} /> <span className="text-[10px] font-sans font-medium text-zinc-500">indexed</span>
          </h3>
          <p className="text-[10px] text-zinc-500">
            {indexingRepos.length} indexing active
          </p>
        </div>

        {/* Stat 3: Documents */}
        <div className="minimal-card p-4 space-y-1.5 shadow-depth-1">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Documents</p>
          <h3 className="text-sm font-bold text-zinc-200 font-mono">
            <AnimatedCounter value={documents.length} /> <span className="text-[10px] font-sans font-medium text-zinc-500">files</span>
          </h3>
          <p className="text-[10px] text-zinc-500">RAG knowledge bases active</p>
        </div>

        {/* Stat 4: Developer Rules */}
        <div className="minimal-card p-4 space-y-1.5 shadow-depth-1">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Developer Rules</p>
          <h3 className="text-sm font-bold text-zinc-200 font-mono">
            <AnimatedCounter value={memories.length} /> <span className="text-[10px] font-sans font-medium text-zinc-500">active</span>
          </h3>
          <p className="text-[10px] text-zinc-500">Pinned guidelines in memory</p>
        </div>

        {/* Stat 5: Recent Syncs */}
        <div className="minimal-card p-4 space-y-1.5 shadow-depth-1">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Recent Syncs</p>
          <h3 className="text-sm font-bold text-zinc-200 font-mono">
            <AnimatedCounter value={indexedRepos.length} /> <span className="text-[10px] font-sans font-medium text-zinc-500">ready</span>
          </h3>
          <p className="text-[10px] text-zinc-500">Synced to vector database</p>
        </div>
      </div>

      {/* Quick Start Actions Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <div
                key={i}
                onClick={() => navigate(action.path)}
                className={`minimal-card p-4 flex flex-col justify-between h-32 cursor-pointer transition-all duration-300 ${action.border} hover:-translate-y-0.5 group`}
              >
                <div className="flex justify-between items-start">
                  <span className="p-2 bg-zinc-950/40 border border-white/[0.04] text-zinc-450 rounded-lg group-hover:text-blue-400 transition-colors">
                    <Icon className="w-5 h-5" />
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">{action.label}</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal">{action.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split Grid: Repositories (Left) & Activity Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Repositories List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">Indexed Repositories</h2>
          <div className="minimal-card overflow-hidden shadow-depth-1">
            {repositories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-[#0a0a0c]/60 text-zinc-400 font-semibold">
                      <th className="px-5 py-3">Repository</th>
                      <th className="px-5 py-3">Sync Status</th>
                      <th className="px-5 py-3">Branches / Language</th>
                      <th className="px-5 py-3">Total Files</th>
                      <th className="px-5 py-3">Size / Chunks</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    {repositories.map((repo) => {
                      let statusBadgeClass = "badge-syncing";
                      let statusLabel = "indexing";
                      
                      if (repo.status === 'indexed') {
                        statusBadgeClass = "badge-synced";
                        statusLabel = "Synced";
                      } else if (repo.status === 'failed') {
                        statusBadgeClass = "badge-error";
                        statusLabel = "Error";
                      } else if (repo.status === 'indexing') {
                        statusBadgeClass = "badge-syncing";
                        statusLabel = `Syncing (${repo.progress || 0}%)`;
                      }

                      return (
                        <tr 
                          key={repo.id}
                          onClick={() => navigate('/chat')}
                          className="hover:bg-[#111115]/50 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <GitBranch className="w-4 h-4 text-zinc-500" />
                              <div>
                                <span className="font-bold text-zinc-200">{repo.name}</span>
                                <span className="text-[10px] text-zinc-500 block font-mono">{repo.owner || 'github'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={statusBadgeClass}>{statusLabel}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-[#17171c] border border-[#2e2e36] text-[10px] font-mono text-zinc-300 rounded">
                                main
                              </span>
                              <span className="px-2 py-0.5 bg-[#0a0a0c] border border-white/[0.05] text-[10px] font-mono text-zinc-400 rounded">
                                {repo.language || 'generic'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-zinc-455 text-zinc-400">
                            {repo.indexedFiles || repo.totalFiles || 0}
                          </td>
                          <td className="px-5 py-4 font-mono text-zinc-455 text-zinc-400">
                            {repo.size || 'N/A'}
                          </td>
                          <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => handleReindex(e, repo.id)}
                                disabled={repo.status === 'indexing'}
                                className="p-1.5 text-zinc-500 hover:text-white bg-[#0a0a0c] border border-white/[0.05] rounded hover:bg-[#17171c] transition"
                                title="Reindex Repository"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, repo.id)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 bg-[#0a0a0c] border border-white/[0.05] rounded hover:bg-[#17171c] transition"
                                title="Delete Repository"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center bg-[#0d0d10]/40 text-zinc-500 italic">
                No repositories registered yet. Add a repository to get started.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Workspace Activity</span>
          </h2>
          <div className="minimal-card p-5 space-y-4 shadow-depth-1 h-[320px] overflow-y-auto">
            {recentActivities.map((act, index) => {
              const Icon = act.icon;
              return (
                <div key={index} className="flex gap-3 items-start animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <span className={`p-2 rounded-lg ${act.color} flex-shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="space-y-0.5 overflow-hidden flex-grow">
                    <h3 className="text-xs font-bold text-zinc-200 truncate">{act.label}</h3>
                    <p className="text-[10px] text-zinc-500 truncate leading-normal">{act.description}</p>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-650 text-zinc-600 mt-1 font-semibold">
                      <Calendar className="w-3 h-3" />
                      <span>{act.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
