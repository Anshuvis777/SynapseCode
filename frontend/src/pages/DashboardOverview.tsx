import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch, 
  RotateCw, 
  Trash2, 
  Plus
} from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { useChatStore } from '../store/chatStore';
import { useUserStore } from '../store/userStore';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { repositories, documents, deleteRepo, reindexRepo, activeRepositoryId } = useRepositoryStore();
  const { memories } = useChatStore();

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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#17171c] hover:bg-[#202027] border border-[#2e2e36] rounded-md transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Repository</span>
        </button>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Stat 1: Active Workspace */}
        <div className="minimal-card p-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Active Workspace</p>
          <h3 className="text-sm font-bold text-zinc-200 truncate">{workspaceTitle}</h3>
          <p className="text-[10px] text-zinc-500">{activeRepo ? `${activeRepo.language || 'Active'} codebase` : (user?.email || 'Local developer context')}</p>
        </div>

        {/* Stat 2: Repositories */}
        <div className="minimal-card p-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Repositories</p>
          <h3 className="text-sm font-bold text-zinc-250 font-mono text-zinc-200">
            {repositories.length} <span className="text-[10px] font-sans font-medium text-zinc-500">indexed</span>
          </h3>
          <p className="text-[10px] text-zinc-500">
            {indexingRepos.length} indexing active
          </p>
        </div>

        {/* Stat 3: Documents */}
        <div className="minimal-card p-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Documents</p>
          <h3 className="text-sm font-bold text-zinc-250 font-mono text-zinc-200">
            {documents.length} <span className="text-[10px] font-sans font-medium text-zinc-500">files</span>
          </h3>
          <p className="text-[10px] text-zinc-500">RAG knowledge bases active</p>
        </div>

        {/* Stat 4: Developer Rules */}
        <div className="minimal-card p-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Developer Rules</p>
          <h3 className="text-sm font-bold text-zinc-250 font-mono text-zinc-200">
            {memories.length} <span className="text-[10px] font-sans font-medium text-zinc-500">active</span>
          </h3>
          <p className="text-[10px] text-zinc-500">Pinned guidelines in memory</p>
        </div>

        {/* Stat 5: Recent Syncs */}
        <div className="minimal-card p-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Recent Syncs</p>
          <h3 className="text-sm font-bold text-zinc-250 font-mono text-zinc-200">
            {indexedRepos.length} <span className="text-[10px] font-sans font-medium text-zinc-500">ready</span>
          </h3>
          <p className="text-[10px] text-zinc-500">Synced to vector database</p>
        </div>
      </div>

      {/* Main Table: Indexed Repositories */}
      <div className="minimal-card overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="px-5 py-4 border-b border-[#1c1c21] bg-[#0d0d10]">
          <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Indexed Repositories</h2>
        </div>

        {/* Table Viewport */}
        {repositories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1c1c21] bg-[#0a0a0c] text-zinc-450 text-zinc-400 font-semibold">
                  <th className="px-5 py-3">Repository</th>
                  <th className="px-5 py-3">Sync Status</th>
                  <th className="px-5 py-3">Branches / Language</th>
                  <th className="px-5 py-3">Total Files</th>
                  <th className="px-5 py-3">Size / Chunks</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c21] text-zinc-300">
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
                      className="hover:bg-[#111115] cursor-pointer transition-colors"
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <GitBranch className="w-4 h-4 text-zinc-500" />
                          <div>
                            <span className="font-bold text-zinc-200">{repo.name}</span>
                            <span className="text-[10px] text-zinc-500 block font-mono">{repo.owner || 'github'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={statusBadgeClass}>{statusLabel}</span>
                      </td>

                      {/* Branches / Language */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-[#17171c] border border-[#2e2e36] text-[10px] font-mono text-zinc-300 rounded">
                            main
                          </span>
                          <span className="px-2 py-0.5 bg-[#0a0a0c] border border-[#1c1c21] text-[10px] font-mono text-zinc-400 rounded">
                            {repo.language || 'generic'}
                          </span>
                        </div>
                      </td>

                      {/* Total Files */}
                      <td className="px-5 py-4 font-mono text-zinc-400">
                        {repo.indexedFiles || repo.totalFiles || 0}
                      </td>

                      {/* Size */}
                      <td className="px-5 py-4 font-mono text-zinc-400">
                        {repo.size || 'N/A'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => handleReindex(e, repo.id)}
                            disabled={repo.status === 'indexing'}
                            className="p-1.5 text-zinc-500 hover:text-white bg-[#0a0a0c] border border-[#1c1c21] rounded hover:bg-[#17171c] transition"
                            title="Reindex Repository"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, repo.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 bg-[#0a0a0c] border border-[#1c1c21] rounded hover:bg-[#17171c] transition"
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
          <div className="p-8 text-center bg-[#0d0d10] text-zinc-500 italic">
            No repositories registered yet. Add a repository to get started.
          </div>
        )}
      </div>

    </div>
  );
};
