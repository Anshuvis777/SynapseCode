import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  Code2,
  FileCode,
  Sparkles,
  MessageSquare,
  Copy,
  Check
} from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { useChatStore } from '../store/chatStore';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    repositories,
    activeRepositoryId,
    setActiveRepository,
    searchResults,
    isSearching,
    performSearch
  } = useRepositoryStore();

  const { createSession, selectSession } = useChatStore();

  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-perform search on repository change if query is present
  const handleRepoChange = (repoId: string) => {
    setActiveRepository(repoId || null);
    if (query.trim()) {
      performSearch(query.trim());
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRepositoryId) {
      toast('Repository Required', {
        description: 'Please connect and select a repository context to search.',
        type: 'error',
      });
      return;
    }
    if (!query.trim()) return;
    performSearch(query.trim());
  };

  const handleCopyCode = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast('Code Copied', {
      description: 'Code snippet copied to clipboard.',
      type: 'success',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAskAI = async (filePath: string, startLine: number, endLine: number, content: string) => {
    if (!activeRepositoryId) return;
    
    toast('Creating AI Session', {
      description: 'Opening chat scoped to this codebase...',
      type: 'info',
    });

    // Create prompt structure referencing the search result context
    const aiPrompt = `Regarding the code in \`${filePath}\` (lines ${startLine}-${endLine}):\n\n\`\`\`\n${content}\n\`\`\`\n\nCan you explain what this code does and suggest any potential optimizations or bugs?`;

    // Create a new session and auto-load the prompt context
    const newSessionId = await createSession(activeRepositoryId, `Search context: ${filePath.split('/').pop()}`);
    if (newSessionId) {
      selectSession(newSessionId);
      // We pass the prompt through local storage or a transient window store so Chat page can read and auto-fill it
      localStorage.setItem('codexrag_pending_prompt', aiPrompt);
      navigate('/chat');
    }
  };



  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto select-none">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">Semantic Code Search</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Perform vector-based semantic search across your codebase chunks to find function usages, designs, or features.
        </p>
      </div>

      {/* Main Search Bar Form */}
      <Card className="glass-card-accent">
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Repository Selector */}
              <div className="w-full md:w-64 flex-shrink-0 space-y-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Target Codebase
                </label>
                <div className="relative">
                  <select
                    value={activeRepositoryId || ''}
                    onChange={(e) => handleRepoChange(e.target.value)}
                    className="w-full bg-[#060608]/90 border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-blue-500/50 transition"
                  >
                    <option value="">Select a Repository</option>
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        📁 {repo.owner}/{repo.name} ({repo.language})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Query Input */}
              <div className="flex-grow space-y-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Semantic Query
                </label>
                <div className="relative flex items-center bg-[#060608]/90 border border-white/[0.06] rounded-lg overflow-hidden focus-within:border-blue-500/50 transition">
                  <span className="absolute left-3 text-zinc-500">
                    <SearchIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. 'How is user validation handled?' or 'find database schema definition'"
                    className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-transparent border-0 text-zinc-250 placeholder-zinc-550 focus:outline-none"
                  />
                  <div className="pr-2 flex items-center gap-1">
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8.5px] font-mono font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 rounded">
                      ↵ ENTER
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex justify-between items-center pt-1 border-t border-white/[0.04] text-[10px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Powered by Qdrant dense vector embeddings & lexical keyword boosting</span>
              </div>
              <Button
                type="submit"
                size="sm"
                className="text-xs px-5 bg-blue-600 hover:bg-blue-500 font-semibold"
                isLoading={isSearching}
                disabled={!query.trim()}
              >
                <span>Find Matches</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Viewport */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.05] pb-2.5">
          <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Semantic Hits
          </h2>
          {searchResults.length > 0 && (
            <span className="text-[10px] bg-zinc-950 border border-white/[0.05] px-2 py-0.5 rounded font-mono text-zinc-400 font-semibold">
              {searchResults.length} chunks matched
            </span>
          )}
        </div>

        {isSearching ? (
          /* Search Skeletons */
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-2 w-28" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-20 w-full rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          /* Render Hits */
          <div className="space-y-4">
            {searchResults.map((result) => (
              <Card key={result.id} className="overflow-hidden hover:border-blue-500/20 hover:shadow-[0_0_16px_rgba(59,130,246,0.05)] transition-all">
                {/* Result header */}
                <div className="px-5 py-3 border-b border-white/[0.05] bg-[#0d0d10]/40 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="p-1.5 bg-blue-950/40 border border-blue-900/30 text-blue-400 rounded-md">
                      <FileCode className="w-4 h-4" />
                    </span>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-zinc-200 font-mono truncate" title={result.filePath}>
                        {result.filePath}
                      </p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">
                        Lines {result.startLine} to {result.endLine} • {result.repositoryName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Similarity Badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      {(result.confidence * 100).toFixed(0)}% Match
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyCode(result.id, result.chunkContent)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 bg-zinc-950/80 border border-white/[0.05] rounded-md transition"
                        title="Copy code snippet"
                      >
                        {copiedId === result.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleAskAI(result.filePath, result.startLine, result.endLine, result.chunkContent)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/20 border border-blue-900/30 rounded-md transition cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Ask AI</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Snippet display */}
                <CardContent className="p-0">
                  <pre className="p-4 text-xs font-mono overflow-x-auto text-zinc-300 bg-zinc-950/20 leading-relaxed select-text max-h-72">
                    <code>{result.chunkContent}</code>
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="p-12 text-center bg-[#0d0d10]/45 backdrop-blur-sm border border-white/[0.05] rounded-xl flex flex-col items-center justify-center max-w-lg mx-auto">
            <div className="h-10 w-10 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
              <Code2 className="w-5 h-5 text-zinc-350" />
            </div>
            <p className="text-xs text-zinc-200 font-semibold mb-1">
              No Search Query Executed
            </p>
            <p className="text-[10px] text-zinc-500 leading-normal max-w-[280px] mx-auto">
              Select an indexed repository and enter a semantic query to search through vector indices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
