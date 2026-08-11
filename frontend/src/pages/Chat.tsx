import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Send, Bot, User as UserIcon, Database, Sparkles, ShieldCheck } from 'lucide-react';
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
    updateSessionRepository,
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isStreaming]);

  useEffect(() => {
    if (activeSession) {
      setActiveRepository(activeSession.repositoryId || null);
    }
    if (activeSessionId) {
      setTimeout(scrollToBottom, 50);
    }
  }, [activeSessionId, activeSession?.repositoryId]);

  const activeProvider = user?.llmProvider || 'groq';
  const activeKey = activeProvider === 'openai' ? user?.openaiApiKey : user?.groqApiKey;
  const hasApiKey = !!activeKey;

  const handleContextChange = async (repoId: string | null) => {
    setActiveRepository(repoId);
    if (activeSessionId) {
      await updateSessionRepository(activeSessionId, repoId);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasApiKey || !input.trim() || isStreaming || !activeSessionId) return;

    const messageText = input;
    setInput('');
    const targetRepoId = activeSession?.repositoryId || activeRepositoryId || undefined;
    await sendMessage(messageText, targetRepoId);
  };

  const handleNewSession = async () => {
    const newId = await createSession(activeRepositoryId || undefined);
    selectSession(newId);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#060608]">
      
      {/* 1. CHAT HISTORY LEFT SIDEBAR */}
      <aside className="w-64 border-r border-[#1c1c21] bg-[#0a0a0c] flex flex-col h-full flex-shrink-0">
        
        {/* New Session Button */}
        <div className="p-3 border-b border-[#1c1c21]">
          <Button 
            onClick={handleNewSession}
            className="w-full text-xs font-semibold justify-center bg-[#17171c] hover:bg-[#202027] border border-[#2e2e36] text-white"
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
                      ? "bg-[#17171c] border border-[#2e2e36] text-zinc-100" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#111115]"
                  )}
                >
                  <div className="flex items-start gap-2.5 overflow-hidden pr-6">
                    <MessageSquare className={cn("w-4 h-4 mt-0.5 flex-shrink-0", isActive ? "text-blue-500" : "text-zinc-500")} />
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
            <div className="py-8 text-center text-zinc-600 text-[11px] italic">
              No chat history.
            </div>
          )}
        </div>
      </aside>

      {/* 2. CHAT VIEWPORT */}
      <div className="flex-grow flex flex-col h-full bg-[#060608] relative">
        
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
                  <div className="max-w-md text-center p-8 space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d0d10] border border-[#1c1c21] mx-auto text-blue-500 shadow-sm">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">Welcome to CodexRAG Chat</h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-[280px] mx-auto leading-normal">
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
                          className="p-2.5 text-xs text-zinc-450 hover:text-zinc-200 bg-[#0d0d10] border border-[#1c1c21] hover:border-[#2e2e36] rounded-lg text-left transition"
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
                          "flex gap-4 p-4 rounded-xl border transition-colors max-w-[90%]",
                          isUser 
                            ? "bg-[#18181b] border-[#27272a] ml-auto" 
                            : "bg-[#0d0d10] border-[#1c1c21] mr-auto"
                        )}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {isUser ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                              <UserIcon className="h-4.5 w-4.5" />
                            </div>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-950/40 border border-blue-900/50 text-blue-500">
                              <Bot className="h-4.5 w-4.5" />
                            </div>
                          )}
                        </div>

                        {/* Message content */}
                        <div className="flex-grow overflow-hidden space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-300">
                              {isUser ? user?.name || 'Developer' : 'CodexRAG Agent'}
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
            <div className="p-4 border-t border-[#1c1c21] bg-[#060608] pb-6">
              <form onSubmit={handleSend} className="max-w-3xl mx-auto space-y-2.5">
                
                {/* Context Selector controls */}
                <div className="flex flex-wrap items-center gap-3 text-xs bg-[#0d0d10] p-2 border border-[#1c1c21] rounded-lg">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-semibold">
                    <Database className="w-3.5 h-3.5 text-blue-500" />
                    <span>Workspace Context:</span>
                  </div>

                  <select
                    value={activeSession?.repositoryId || ''}
                    onChange={(e) => handleContextChange(e.target.value || null)}
                    className="bg-[#060608] border border-[#1c1c21] text-[11px] rounded px-2.5 py-1 text-zinc-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No Active Repository</option>
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.name} ({repo.language})
                      </option>
                    ))}
                  </select>
                </div>

                {/* API Key Missing Alert */}
                {!hasApiKey && (
                  <div className="mb-3 p-3 bg-amber-950/20 border border-amber-900/30 text-amber-200 rounded-lg text-xs leading-normal flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">LLM API Key Required (Zero-Retention Privacy): </span>
                      For your privacy and security, API keys are <strong>never stored on the server</strong>. Please click your profile card in the bottom-left sidebar to provide your <strong>{activeProvider === 'openai' ? 'OpenAI' : 'Groq'} API Key</strong> for this session.
                    </div>
                  </div>
                )}

                {/* Input Text Box */}
                <div className={cn(
                  "relative flex items-center bg-[#0d0d10] border border-[#1c1c21] rounded-lg overflow-hidden focus-within:border-zinc-700 transition-colors",
                  !hasApiKey && "opacity-50 cursor-not-allowed bg-zinc-950/20"
                )}>
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
                    placeholder={hasApiKey ? "Ask CodexRAG a question about your code or index..." : "Please configure your LLM API key in profile settings to chat..."}
                    className="flex-grow px-4 py-3 text-sm bg-transparent border-0 text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none max-h-24 min-h-[44px]"
                    disabled={isStreaming || !hasApiKey}
                  />

                  <div className="flex items-center gap-2 pr-3">
                    <Button
                      type="submit"
                      disabled={!input.trim() || isStreaming || !hasApiKey}
                      size="icon"
                      className="h-8 w-8 bg-[#17171c] hover:bg-[#202027] border border-[#2e2e36]"
                    >
                      <Send className="h-4 w-4 text-zinc-200" />
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
                <Button onClick={handleNewSession} className="bg-[#17171c] hover:bg-[#202027] border border-[#2e2e36] text-white">
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
