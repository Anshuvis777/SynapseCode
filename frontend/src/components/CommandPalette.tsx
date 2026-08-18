import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  MessageSquareCode,
  FolderGit,
  Files,
  Sparkles,
  Settings2,
  Plus,
  ArrowRight,
  Command
} from 'lucide-react';
import { cn } from '../utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navigation' | 'action';
  shortcut?: string;
}

interface CommandPaletteProps {
  onNewChat?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNewChat }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', label: 'Dashboard', description: 'View workspace overview', icon: LayoutGrid, action: () => navigate('/dashboard'), category: 'navigation' },
    { id: 'nav-chat', label: 'AI Chat', description: 'Open the chat interface', icon: MessageSquareCode, action: () => navigate('/chat'), category: 'navigation' },
    { id: 'nav-repos', label: 'Repositories', description: 'Manage code repositories', icon: FolderGit, action: () => navigate('/repositories'), category: 'navigation' },
    { id: 'nav-docs', label: 'Documents', description: 'Upload and manage documents', icon: Files, action: () => navigate('/documents'), category: 'navigation' },
    { id: 'nav-memory', label: 'Developer Memory', description: 'Manage AI memory rules', icon: Sparkles, action: () => navigate('/memory'), category: 'navigation' },
    { id: 'nav-search', label: 'Code Search', description: 'Perform semantic search on code', icon: Search, action: () => navigate('/search'), category: 'navigation' },
    { id: 'nav-settings', label: 'Settings', description: 'Configure AI preferences', icon: Settings2, action: () => navigate('/settings'), category: 'navigation' },
    // Actions
    { id: 'act-new-chat', label: 'New Chat Session', description: 'Start a fresh conversation', icon: Plus, action: () => { if (onNewChat) onNewChat(); navigate('/chat'); }, category: 'action', shortcut: 'Ctrl+N' },
  ], [navigate, onNewChat]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        (cmd.description && cmd.description.toLowerCase().includes(q))
    );
  }, [query, commands]);

  const navCommands = filteredCommands.filter((c) => c.category === 'navigation');
  const actionCommands = filteredCommands.filter((c) => c.category === 'action');

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      }

      // New chat: Ctrl+N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isOpen) {
        e.preventDefault();
        if (onNewChat) onNewChat();
        navigate('/chat');
      }

      // Close: Escape
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, navigate, onNewChat]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Arrow key navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && filteredCommands.length > 0) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleArrowKeys);
    return () => window.removeEventListener('keydown', handleArrowKeys);
  }, [isOpen, selectedIndex, filteredCommands]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-[#0d0d10]/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl shadow-depth-3 overflow-hidden animate-fade-in-up">

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <Search className="w-4.5 h-4.5 text-zinc-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-grow bg-transparent text-sm text-zinc-200 placeholder-zinc-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500 text-xs italic">
              No commands found for "{query}"
            </div>
          ) : (
            <>
              {/* Navigation Section */}
              {navCommands.length > 0 && (
                <div className="px-3 pb-1">
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-1 py-1.5">
                    Navigation
                  </p>
                  {navCommands.map((cmd) => {
                    flatIndex++;
                    const isActive = flatIndex === selectedIndex;
                    const Icon = cmd.icon;
                    const currentIndex = flatIndex;
                    return (
                      <button
                        key={cmd.id}
                        data-active={isActive}
                        onClick={() => { cmd.action(); setIsOpen(false); }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                          isActive ? 'bg-white/[0.06] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-400' : 'text-zinc-500')} />
                        <div className="flex-grow overflow-hidden">
                          <p className="text-xs font-semibold truncate">{cmd.label}</p>
                          {cmd.description && (
                            <p className="text-[10px] text-zinc-500 truncate">{cmd.description}</p>
                          )}
                        </div>
                        {isActive && <ArrowRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Actions Section */}
              {actionCommands.length > 0 && (
                <div className="px-3 pb-1">
                  {navCommands.length > 0 && <div className="border-t border-white/[0.04] my-1.5" />}
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-1 py-1.5">
                    Actions
                  </p>
                  {actionCommands.map((cmd) => {
                    flatIndex++;
                    const isActive = flatIndex === selectedIndex;
                    const Icon = cmd.icon;
                    const currentIndex = flatIndex;
                    return (
                      <button
                        key={cmd.id}
                        data-active={isActive}
                        onClick={() => { cmd.action(); setIsOpen(false); }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                          isActive ? 'bg-white/[0.06] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-400' : 'text-zinc-500')} />
                        <div className="flex-grow overflow-hidden">
                          <p className="text-xs font-semibold truncate">{cmd.label}</p>
                          {cmd.description && (
                            <p className="text-[10px] text-zinc-500 truncate">{cmd.description}</p>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-[9px] font-mono font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between text-[9px] text-zinc-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono">Esc</kbd>
              Close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>+K to toggle</span>
          </span>
        </div>
      </div>
    </div>
  );
};
