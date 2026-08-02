import React, { useState } from 'react';
import { 
  FolderUp, 
  Trash2, 
  RefreshCw, 
  Clock, 
  Database, 
  HardDrive,
  Info
} from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../components/ui/Dialog';

export const Repositories: React.FC = () => {
  const { 
    repositories, 
    connectGithubRepo, 
    uploadLocalRepo, 
    deleteRepo, 
    reindexRepo 
  } = useRepositoryStore();

  const { toast } = useToast();

  const [githubOpen, setGithubOpen] = useState(false);
  const [localOpen, setLocalOpen] = useState(false);

  // Form states
  const [ghOwner, setGhOwner] = useState('facebook');
  const [ghRepo, setGhRepo] = useState('react');
  const [ghLang, setGhLang] = useState('TypeScript');

  const [localName, setLocalName] = useState('my-flask-server');
  const [localSize, setLocalSize] = useState('2.4 MB');
  const [localLang, setLocalLang] = useState('Python');

  const handleConnectGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghOwner.trim() || !ghRepo.trim()) return;

    setGithubOpen(false);
    toast('Connecting GitHub Repository', {
      description: `Starting index routine for ${ghOwner}/${ghRepo}...`,
      type: 'info',
    });
    
    await connectGithubRepo(ghOwner, ghRepo, ghLang);
  };

  const handleUploadLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) return;

    setLocalOpen(false);
    toast('Uploading Local Directory', {
      description: `Analyzing and chunking folder ${localName}...`,
      type: 'info',
    });

    await uploadLocalRepo(localName, localSize, localLang);
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

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto select-none">
      
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">Repositories Chunks</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Connect local directories or remote Git repositories to partition and index code chunks into the vector store.
          </p>
        </div>

        {/* Connect Action Controls */}
        <div className="flex items-center gap-2">
          
          {/* Dialog 1: Github Connect */}
          <Dialog open={githubOpen} onOpenChange={setGithubOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                <span>Connect GitHub</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Index Remote Git Repo</DialogTitle>
                <DialogDescription>
                  Import remote repository files to run AST token splitting and vector embeddings creation.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleConnectGithub} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Repository Owner
                    </label>
                    <input
                      type="text"
                      value={ghOwner}
                      onChange={(e) => setGhOwner(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. google"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Repository Name
                    </label>
                    <input
                      type="text"
                      value={ghRepo}
                      onChange={(e) => setGhRepo(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. angular"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Primary Language
                  </label>
                  <select
                    value={ghLang}
                    onChange={(e) => setGhLang(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 focus:outline-none focus:border-blue-500"
                  >
                    {['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby'].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setGithubOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Connect Remote
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog 2: Local Upload */}
          <Dialog open={localOpen} onOpenChange={setLocalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FolderUp className="w-4 h-4 mr-1.5" />
                <span>Upload Local Directory</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Index Local Codebase</DialogTitle>
                <DialogDescription>
                  Select a local directory folder from disk. DevAssist will securely index it locally.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUploadLocal} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Folder Name
                  </label>
                  <input
                    type="text"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. backend-api"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Estimated Size
                    </label>
                    <input
                      type="text"
                      value={localSize}
                      onChange={(e) => setLocalSize(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 5.1 MB"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Primary Language
                    </label>
                    <select
                      value={localLang}
                      onChange={(e) => setLocalLang(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-300 focus:outline-none focus:border-blue-500"
                    >
                      {['Python', 'Rust', 'TypeScript', 'JavaScript', 'Go', 'PHP', 'HTML/CSS'].map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Drag and Drop box */}
                <div className="border border-dashed border-zinc-800 rounded-lg p-6 text-center bg-zinc-900/10">
                  <HardDrive className="w-8 h-8 text-zinc-650 mx-auto mb-2 text-zinc-500" />
                  <p className="text-xs text-zinc-400 font-semibold">Select directory or drag it here</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Supports folders up to 50MB</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLocalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Begin Import
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* Info notice about indices */}
      <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 text-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-normal">
          <span className="font-bold text-blue-300">Semantic Search context:</span> Connected repositories are automatically parsed by the agent to index system definitions, functions, and interfaces, making them directly retrievable inside the AI Chat window.
        </p>
      </div>

      {/* Repos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
        {repositories.map((repo) => (
          <Card key={repo.id} className="flex flex-col hover:border-zinc-700/60 transition duration-300">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <CardTitle className="text-sm font-bold font-mono">
                    {repo.owner}/{repo.name}
                  </CardTitle>
                </div>
                <span className="inline-block text-[9.5px] font-bold bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
                  {repo.language}
                </span>
              </div>

              {/* Status Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                repo.status === 'indexed' 
                  ? 'bg-green-950/40 border-green-800/50 text-green-400' 
                  : repo.status === 'indexing' 
                  ? 'bg-blue-950/40 border-blue-800/50 text-blue-400 animate-pulse'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}>
                {repo.status === 'indexing' ? 'Indexing' : repo.status}
              </span>
            </CardHeader>
            
            <CardContent className="flex-grow pt-0 pb-4 space-y-4">
              
              {/* Telemetry info */}
              <div className="grid grid-cols-2 gap-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-850 text-xs">
                <div className="space-y-0.5">
                  <p className="text-zinc-500 font-semibold">Indexed Files</p>
                  <p className="font-bold text-zinc-300 font-mono">{repo.indexedFiles} / {repo.totalFiles}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-zinc-500 font-semibold">Corpus Size</p>
                  <p className="font-bold text-zinc-300 font-mono">{repo.size || 'N/A'}</p>
                </div>
              </div>

              {/* Indexing Progress bar */}
              {repo.status === 'indexing' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-blue-400">
                    <span>Compiling embeddings...</span>
                    <span>{repo.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${repo.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* URL and Index time details */}
              <div className="space-y-2 text-[10px] text-zinc-500 border-t border-zinc-850 pt-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Last indexed: {repo.lastIndexedTime || 'Never'}</span>
                </div>
                {repo.url && (
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-zinc-200 underline font-semibold truncate max-w-[150px]"
                  >
                    {repo.url.replace('https://', '')}
                  </a>
                )}
              </div>

            </CardContent>

            {/* Actions Footer */}
            <div className="px-5 py-3.5 border-t border-zinc-850 bg-zinc-900/10 flex items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={repo.status === 'indexing'}
                onClick={() => handleReindex(repo.id, repo.name)}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Re-index</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs"
                onClick={() => handleDelete(repo.id, repo.name)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Delete</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
