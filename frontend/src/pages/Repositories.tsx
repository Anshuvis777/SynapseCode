import React, { useState } from 'react';
import { 
  Trash2, 
  RefreshCw, 
  Clock, 
  Database, 
  Info,
  GitBranch,
  FileCode
} from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';

export const Repositories: React.FC = () => {
  const { 
    repositories, 
    connectGithubRepo, 
    deleteRepo, 
    reindexRepo 
  } = useRepositoryStore();

  const { toast } = useToast();

  // Form states
  const [repoUrl, setRepoUrl] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const handleLinkRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsLinking(true);
    toast('Linking Repository', {
      description: `Starting index routine for repository...`,
      type: 'info',
    });

    try {
      await connectGithubRepo(repoUrl.trim());
      setRepoUrl('');
      toast('Repository Connected', {
        description: `Successfully initiated background index`,
        type: 'success',
      });
    } catch {
      toast('Connection Failed', {
        description: `Could not connect to repository. Please verify the URL.`,
        type: 'error',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleReindex = (id: string, name: string) => {
    reindexRepo(id);
    toast('Re-indexing Codebase', {
      description: `Recalculating embeddings for ${name}...`,
      type: 'info',
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the index for ${name}?`)) {
      deleteRepo(id);
      toast('Repository Deleted', {
        description: `Index database for ${name} removed.`,
        type: 'warning',
      });
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded-full">
            Active
          </span>
        );
      case 'indexing':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded-full animate-pulse">
            Syncing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-900/30 px-2 py-0.5 rounded-full">
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-bold text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-full">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto select-none">
      
      {/* Top Title Bar */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">Git Repositories</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Connect and configure your codebases to synchronize semantic indexes with CodexRAG.
        </p>
      </div>

      {/* Info notice about indices */}
      <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 text-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-normal">
          <span className="font-bold text-blue-300">Semantic Search context:</span> Connected repositories are automatically parsed by the agent to index system definitions, functions, and interfaces, making them directly retrievable inside the AI Chat window.
        </p>
      </div>

      {/* Grid Layout matching mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column: Link New Repository Form */}
        <div className="lg:col-span-2">
          <Card className="border border-zinc-800/80 bg-zinc-900/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold text-zinc-200">Link New Repository</CardTitle>
              <CardDescription className="text-[11px] text-zinc-500">
                Paste your Git repository URL. Owner, repository name, branch, and language are autodetected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLinkRepository} className="space-y-4">
                
                {/* Repository URL input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Repository URL
                  </label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full bg-[#060608] border border-[#1c1c21] rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700 transition"
                    placeholder="https://github.com/facebook/react"
                    required
                  />
                  <span className="text-[9.5px] text-zinc-500 block">
                    Supports GitHub, GitLab, or any public Git repository link.
                  </span>
                </div>

                {/* Auto-detection badge notice */}
                <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-lg text-[10.5px] text-zinc-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                    <span>Automatic Repository Analysis</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal">
                    Owner, repository name, default branch, primary language, and code AST will be automatically detected and indexed into vector embeddings.
                  </p>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full text-xs font-semibold h-9.5 cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-950"
                    isLoading={isLinking}
                  >
                    Link Repository
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Repositories List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Active Repositories</h2>
            <span className="text-[10px] bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded font-mono text-zinc-400 font-semibold">
              {repositories.length} syncs
            </span>
          </div>

          <div className="space-y-3.5">
            {repositories.length > 0 ? (
              repositories.map((repo) => (
                <div 
                  key={repo.id} 
                  className="p-4 bg-zinc-900/10 border border-zinc-800/80 rounded-xl flex flex-col gap-3 hover:border-zinc-700/60 transition"
                >
                  {/* Title & Actions Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-center text-zinc-400">
                        {repo.url ? (
                          <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                        ) : (
                          <Database className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-zinc-200 font-mono">
                          {repo.owner} / {repo.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-550 text-zinc-500 font-semibold">
                          <GitBranch className="w-3 h-3 text-zinc-650" />
                          <span>main</span>
                          <span>·</span>
                          <span>{repo.language || 'Codebase'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleReindex(repo.id, repo.name)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950 rounded border border-transparent hover:border-zinc-850 transition"
                        title="Reindex Repository"
                        disabled={repo.status === 'indexing'}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(repo.id, repo.name)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-950 rounded border border-transparent hover:border-zinc-850 transition"
                        title="Delete Repository"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary / Stats details */}
                  <div className="flex items-center gap-4 text-[10px] text-zinc-500 border-t border-zinc-850 pt-3">
                    <span className="flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5 text-zinc-600" />
                      <span>{repo.indexedFiles || 0} files</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-600" />
                      <span>{repo.lastIndexedTime || 'Never'}</span>
                    </span>
                    <div className="flex-grow flex justify-end">
                      {getStatusPill(repo.status)}
                    </div>
                  </div>

                  {/* Indexing Progress Indicator */}
                  {repo.status === 'indexing' && (
                    <div className="space-y-1 mt-1">
                      <div className="flex justify-between text-[9px] font-bold text-amber-500">
                        <span>Syncing code chunks...</span>
                        <span>{repo.progress || 10}%</span>
                      </div>
                      <div className="h-1 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full transition-all duration-300"
                          style={{ width: `${repo.progress || 10}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Failed error messages */}
                  {repo.status === 'failed' && repo.errorMessage && (
                    <div className="bg-red-950/20 border border-red-900/30 text-red-300 p-2 rounded text-[10px] mt-1 leading-normal">
                      <span className="font-bold text-red-400">Error:</span> {repo.errorMessage}
                    </div>
                  )}

                </div>
              ))
            ) : (
              <div className="py-12 border border-dashed border-zinc-850 rounded-xl text-center bg-zinc-950/10">
                <Database className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-semibold">No repositories linked yet</p>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] mx-auto">
                  Provide your repository parameters on the left to begin indexing codebases.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
