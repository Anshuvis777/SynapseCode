import React, { useState } from 'react';
import { 
  Info, 
  Plus, 
  Search, 
  Pin, 
  PinOff, 
  Trash2, 
  Brain 
} from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useToast } from '../components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const Memory: React.FC = () => {
  const { memories, addMemory, deleteMemory, togglePinMemory } = useChatStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [newMemory, setNewMemory] = useState('');

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.trim()) return;

    addMemory(newMemory);
    setNewMemory('');
    toast('Memory Item Added', {
      description: 'The instruction will now be sent as background context on each chat turn.',
      type: 'success',
    });
  };

  const handleTogglePin = (id: string, currentlyPinned: boolean) => {
    togglePinMemory(id);
    toast(currentlyPinned ? 'Instruction Unpinned' : 'Instruction Pinned', {
      description: currentlyPinned 
        ? 'Removed priority flag. This will be sent as standard memory.'
        : 'Priority flag set. This rule will sit at the very top of context system prompts.',
      type: 'info',
    });
  };

  const handleDelete = (id: string) => {
    deleteMemory(id);
    toast('Memory Item Removed', {
      description: 'The agent will no longer recall this instruction.',
      type: 'warning',
    });
  };

  // Filter memories
  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by pinned
  const pinnedMemories = filteredMemories.filter((m) => m.pinned);
  const unpinnedMemories = filteredMemories.filter((m) => !m.pinned);

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto select-none">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">Developer Memory</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Review and manage the persistent memory rules injected into the AI agent prompt. Pin vital project directives.
        </p>
      </div>

      {/* Info Warning */}
      <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 text-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-normal">
          <span className="font-bold text-blue-300">Contextual Reinforcement:</span> Memories are user-defined commands, coding conventions, or backend secrets that you want the LLM agent to respect dynamically, without repeating them on every prompt query.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Create memory item */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Inject New Instruction</CardTitle>
              <CardDescription>Specify project rules, architectural layouts, or preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMemory} className="space-y-4">
                <div>
                  <textarea
                    rows={4}
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    placeholder="e.g. 'Always use clean architecture with separate routers' or 'Database uses PostgreSQL, not SQLite'"
                    className="w-full p-3 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                  />
                </div>
                <Button type="submit" size="sm" className="w-full text-xs font-semibold" disabled={!newMemory.trim()}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Save Directive</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Search and display items */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search bar */}
          <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden focus-within:border-blue-500/80 transition-colors">
            <span className="absolute left-3 text-zinc-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search current developer memory pool..."
              className="w-full pl-9.5 pr-4 py-2 text-xs bg-transparent border-0 text-zinc-200 placeholder-zinc-550 focus:outline-none"
            />
          </div>

          {/* List display */}
          <div className="space-y-4">
            {filteredMemories.length > 0 ? (
              <>
                {/* Pinned Section */}
                {pinnedMemories.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                      <Pin className="w-3.5 h-3.5 text-blue-500" />
                      Pinned Directives (Always Injected)
                    </h3>
                    <div className="space-y-2">
                      {pinnedMemories.map((mem) => (
                        <div 
                          key={mem.id}
                          className="p-4 rounded-lg bg-zinc-900/60 border border-blue-900/30 text-zinc-200 flex justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-semibold leading-relaxed text-zinc-100">{mem.content}</p>
                            <span className="text-[9px] text-zinc-500 font-mono">Created: {mem.createdAt}</span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-start gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleTogglePin(mem.id, mem.pinned)}
                              className="p-1 text-blue-450 hover:text-zinc-300 hover:bg-zinc-800 rounded transition"
                              title="Unpin rule"
                            >
                              <PinOff className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(mem.id)}
                              className="p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unpinned Section */}
                {unpinnedMemories.length > 0 && (
                  <div className="space-y-2">
                    {pinnedMemories.length > 0 && <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1 mt-4">General Memories</h3>}
                    <div className="space-y-2">
                      {unpinnedMemories.map((mem) => (
                        <div 
                          key={mem.id}
                          className="p-4 rounded-lg bg-zinc-900/20 border border-zinc-850 hover:border-zinc-800 text-zinc-200 flex justify-between gap-4 transition"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-semibold leading-relaxed text-zinc-300">{mem.content}</p>
                            <span className="text-[9px] text-zinc-500 font-mono">Created: {mem.createdAt}</span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-start gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleTogglePin(mem.id, mem.pinned)}
                              className="p-1 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded transition"
                              title="Pin rule"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(mem.id)}
                              className="p-1 text-zinc-650 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={Brain}
                title="No memories match your query"
                description="Try broadening your search term or add a new instruction using the input form on the left."
              />
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
