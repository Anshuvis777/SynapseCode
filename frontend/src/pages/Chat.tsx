import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Send, Bot, User as UserIcon, Database, Sparkles } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useRepositoryStore } from '../store/repositoryStore';
import { useUserStore } from '../store/userStore';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../utils';

export const Chat: React.FC = () => {
  const { 
    sessions, 
    activeSessionId, 
    isStreaming, 
    createSession, 
    selectSession, 
    deleteSession, 
    sendMessage 
  } = useChatStore();

  const { repositories, activeRepositoryId, setActiveRepository } = useRepositoryStore();
  const { user } = useUserStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  // Scroll to bottom on new messages or streaming
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isStreaming]);

  // Initial scroll
  useEffect(() => {
    if (activeSessionId) {
      setTimeout(scrollToBottom, 50);
    }
  }, [activeSessionId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !activeSessionId) return;

    const messageText = input;
    setInput('');
    await sendMessage(messageText, activeRepositoryId || undefined);
  };

  const handleNewSession = async () => {
    const newId = await createSession(activeRepositoryId || '');
    selectSession(newId);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      
      {/* 1. CHAT HISTORY LEFT SIDEBAR */}
      <div className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col h-full flex-shrink-0">
        
        {/* New Session Button */}
        <div className="p-3 border-b border-zinc-900 bg-zinc-950">
          <Button 
            onClick={handleNewSession}
            className="w-full text-xs font-bold justify-center"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Chat</span>
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-grow overflow-y-auto p-2 space-y-1">
          {sessions.length > 0 ? (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const hasRepo = repositories.find((r) => r.id === session.repositoryId);
              
              return (
                <div
                  key={session.id}
                  onClick={() => selectSession(session.id)}
                  className={cn(
                    "group relative flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all",
                    isActive 
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-100" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                  )}
                >
                  <div className="flex items-start gap-2.5 overflow-hidden pr-6">
                    <MessageSquare className={cn("w-4 h-4 mt-0.5 flex-shrink-0", isActive ? "text-blue-400" : "text-zinc-500")} />
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-semibold truncate leading-tight">{session.title}</h4>
                      <p className="text-[9px] text-zinc-500 mt-0.5 truncate">
                        {hasRepo ? `Repo: ${hasRepo.name}` : 'No Repository'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-zinc-650 text-[11px] italic">
              No chat history.
            </div>
          )}
        </div>
      </div>

      {/* 2. CHAT VIEWPORT */}
      <div className="flex-grow flex flex-col h-full bg-zinc-900/20 relative">
        
        {/* Active Session Content */}
        {activeSession ? (
          <>
            {/* Messages Scroll Area */}
            <div 
              ref={chatContainerRef}
              className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="max-w-md text-center p-8 space-y-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 mx-auto text-blue-400 shadow-md">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">Welcome to DevAssist Chat</h3>
                      <p className="text-xs text-zinc-450 text-zinc-400 mt-1 max-w-[280px] mx-auto leading-normal">
                        Select a repository or type a question about code architecture, documentation, or algorithm design.
                      </p>
                    </div>
                    {/* Suggested Prompts */}
                    <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                      {[
                        "How do I set up custom middleware in FastAPI?",
                        "Search my repository for authentication functions",
                        "Show me the design pattern for state management in Zustand"
                      ].map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => setInput(prompt)}
                          className="p-2.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 rounded-lg text-left transition"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {messages.map((message) => {
                    const isUser = message.role === 'user';
                    
                    return (
                      <div 
                        key={message.id} 
                        className={cn(
                          "flex gap-4 p-4 rounded-xl border transition-colors",
                          isUser 
                            ? "bg-zinc-950/20 border-zinc-900/50" 
                            : "bg-zinc-900/40 border-zinc-800/80 shadow-sm"
                        )}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {isUser ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                              <UserIcon className="h-4.5 w-4.5" />
                            </div>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-950 border border-blue-900 text-blue-400">
                              <Bot className="h-4.5 w-4.5" />
                            </div>
                          )}
                        </div>

                        {/* Message content */}
                        <div className="flex-grow overflow-hidden space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-300">
                              {isUser ? user?.name || 'Developer' : 'DevAssist Agent'}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {message.timestamp}
                            </span>
                          </div>

                          {/* Markdown message body */}
                          <div className="text-zinc-200">
                            {message.content ? (
                              <MarkdownRenderer content={message.content} />
                            ) : (
                              message.status === 'streaming' && (
                                <div className="flex items-center gap-1.5 py-2">
                                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" />
                                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                                </div>
                              )
                            )}
                          </div>

                          {/* Streaming cursor */}
                          {message.status === 'streaming' && message.content && (
                            <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-400 animate-pulse-slow" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Form input */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto space-y-2.5">
                
                {/* Context Selector controls */}
                <div className="flex flex-wrap items-center gap-3 text-xs bg-zinc-900/50 p-2 border border-zinc-850 rounded-lg">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>Workspace Context:</span>
                  </div>

                  <select
                    value={activeRepositoryId || ''}
                    onChange={(e) => setActiveRepository(e.target.value || null)}
                    className="bg-zinc-950 border border-zinc-800 text-[11px] rounded px-2.5 py-1 text-zinc-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No Active Repository</option>
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.name} ({repo.language})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Input Text Box */}
                <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden focus-within:border-blue-500/80 transition-colors">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder="Ask DevAssist a question about your code or index..."
                    className="flex-grow px-4 py-3 text-sm bg-transparent border-0 text-zinc-200 placeholder-zinc-550 focus:outline-none resize-none max-h-24 min-h-[44px]"
                    disabled={isStreaming}
                  />

                  <div className="flex items-center gap-2 pr-3">
                    <Button
                      type="submit"
                      disabled={!input.trim() || isStreaming}
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-6">
            <EmptyState
              icon={MessageSquare}
              title="No Chat Session Selected"
              description="Create a new workspace assistant chat session or select an existing conversation from the sidebar."
              action={
                <Button onClick={handleNewSession}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span>Start New Session</span>
                </Button>
              }
            />
          </div>
        )}
      </div>

    </div>
  );
};
