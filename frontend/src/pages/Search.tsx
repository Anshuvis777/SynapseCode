import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, FileText, ArrowRight, Sparkles, Loader2, Database } from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { useToast } from '../components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const Search: React.FC = () => {
  const { 
    searchResults, 
    isSearching, 
    searchQuery, 
    performSearch,
    repositories,
    activeRepositoryId,
    setActiveRepository
  } = useRepositoryStore();

  const { toast } = useToast();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery.trim() !== searchQuery) {
        performSearch(localQuery);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [localQuery]);

  const handleOpenSource = (filePath: string, startLine: number) => {
    toast('Opening Source File', {
      description: `Locating ${filePath} at line ${startLine} in your editor...`,
      type: 'success',
    });
  };

  const activeRepo = repositories.find((r) => r.id === activeRepositoryId);

  // Highlighting matching chunks in search results
  const highlightCode = (code: string) => {
    // Simple mock highlighting
    return (
      <pre className="p-3 text-[11px] font-mono overflow-x-auto text-zinc-300 bg-zinc-950/70 border border-zinc-850 rounded-md leading-relaxed select-text">
        {code}
      </pre>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto select-none">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-50 font-sans">Semantic search</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Perform a vector search across the entire indexed codebase using natural language concepts instead of keyword matching.
        </p>
      </div>

      {/* Search Bar & Workspace Context Picker */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        
        {/* Input Bar */}
        <div className="relative flex-grow flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden focus-within:border-blue-500/80 transition-colors">
          <span className="absolute left-3.5 text-zinc-500">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <SearchIcon className="w-4 h-4" />
            )}
          </span>
          
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Type concepts, e.g. 'auth middleware' or 'sse generator'..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent border-0 text-zinc-200 placeholder-zinc-550 focus:outline-none"
          />
        </div>

        {/* Workspace scope selector */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex-shrink-0">
          <Database className="w-4 h-4 text-blue-500" />
          <select
            value={activeRepositoryId || ''}
            onChange={(e) => setActiveRepository(e.target.value || null)}
            className="bg-transparent border-0 text-xs font-semibold text-zinc-300 focus:outline-none"
          >
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                Scope: {repo.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Result Display list */}
      <div className="space-y-4">
        {isSearching ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-zinc-400 font-semibold">Running cosine similarity queries...</p>
            <p className="text-[10px] text-zinc-500">Retrieving semantic vector spaces</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-4 max-w-4xl">
            <div className="flex justify-between items-center text-xs text-zinc-500 pb-1 border-b border-zinc-900">
              <span>Showing matches found in {activeRepo?.name || 'Workspace'}</span>
              <span>{searchResults.length} hits</span>
            </div>

            {searchResults.map((result) => (
              <Card key={result.id} className="hover:border-zinc-800/80 transition duration-300">
                <CardHeader className="flex flex-row items-start justify-between pb-2 border-b-0">
                  <div className="space-y-1 overflow-hidden pr-4">
                    
                    {/* File path heading */}
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <CardTitle className="text-xs font-bold font-mono text-zinc-200 truncate" title={result.filePath}>
                        {result.filePath}
                      </CardTitle>
                    </div>

                    {/* Repo Context */}
                    <p className="text-[10px] text-zinc-550 text-zinc-500">
                      Lines {result.startLine} - {result.endLine} • Repository: {result.repositoryName}
                    </p>
                  </div>

                  {/* Confidence Badge */}
                  <span className="flex-shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded font-mono">
                    {(result.confidence * 100).toFixed(0)}% match
                  </span>
                </CardHeader>

                <CardContent className="pt-2 space-y-3">
                  
                  {/* Code snippet chunk */}
                  {highlightCode(result.chunkContent)}

                  {/* Action footer */}
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[11px] font-semibold h-7.5 px-3"
                      onClick={() => handleOpenSource(result.filePath, result.startLine)}
                    >
                      <span>Open in Workspace</span>
                      <ArrowRight className="w-3 h-3 ml-1.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : localQuery.trim() ? (
          <EmptyState
            icon={SearchIcon}
            title="No matches found"
            description={`We searched across all indexed chunks in ${activeRepo?.name || 'this repo'} but couldn't find matches for "${localQuery}".`}
          />
        ) : (
          <div className="py-16 text-center max-w-sm mx-auto">
            <div className="h-10 w-10 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-450 mx-auto mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-xs font-bold text-zinc-300">Start Semantic Search</h3>
            <p className="text-[11px] text-zinc-500 leading-normal mt-1.5">
              Enter queries in natural language. Try searching for <code className="px-1 py-0.5 bg-zinc-900 border border-zinc-850 rounded text-blue-400 font-mono text-[9.5px]">chat store</code> or <code className="px-1 py-0.5 bg-zinc-900 border border-zinc-850 rounded text-blue-400 font-mono text-[9.5px]">fastapi stream</code> to verify retrieval vectors.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
