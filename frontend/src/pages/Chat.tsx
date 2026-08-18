import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Trash2, Send, Bot, User as UserIcon, Database, Sparkles, ShieldCheck, Download, FileJson, FileText, Pencil, Check, X, ThumbsUp, ThumbsDown, RotateCcw, Copy } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useRepositoryStore } from '../store/repositoryStore';
import { useUserStore } from '../store/userStore';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../utils';
import { exportSessionAsMarkdown, exportSessionAsJSON, downloadFile } from '../utils/exportChat';

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

  const { repositories, activeRepositoryId, setActiveRepository, documents } = useRepositoryStore();
  const { user } = useUserStore();

  const [input, setInput] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down' | undefined>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  // Autofill pending prompts (e.g. from code search page clicks)
  useEffect(() => {
    const pending = localStorage.getItem('codexrag_pending_prompt');
    if (pending && activeSessionId) {
      setInput(pending);
      localStorage.removeItem('codexrag_pending_prompt');
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
        }
      }, 100);
    }
  }, [activeSessionId]);

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFeedback = (msgId: string, type: 'up' | 'down') => {
    setFeedbackMap((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? undefined : type,
    }));
  };

  const handleRegenerate = async () => {
    if (isStreaming || !activeSessionId) return;
    const userMessages = messages.filter((m) => m.role === 'user');
    if (userMessages.length === 0) return;
    const lastUserMsg = userMessages[userMessages.length - 1];
    const targetRepoId = activeSession?.repositoryId || activeRepositoryId || undefined;
    await sendMessage(lastUserMsg.content, targetRepoId);
  };

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasApiKey = !!(user?.geminiApiKey || (user as any)?.huggingfaceApiKey);

  const handleExportMarkdown = () => {
    if (!activeSession) return;
    const md = exportSessionAsMarkdown(activeSession);
    const safeName = activeSession.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    downloadFile(md, `${safeName}.md`, 'text/markdown');
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    if (!activeSession) return;
    const json = exportSessionAsJSON(activeSession);
    const safeName = activeSession.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    downloadFile(json, `${safeName}.json`, 'application/json');
    setShowExportMenu(false);
  };

  const handleContextChange = async (repoId: string | null, docId: string | null = null) => {
    setActiveRepository(repoId);
    if (activeSessionId) {
      await updateSessionRepository(activeSessionId, repoId, docId);
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

  // Session rename handlers
  const startRename = (sessionId: string, currentTitle: string) => {
    setRenamingSessionId(sessionId);
    setRenameValue(currentTitle);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const confirmRename = async () => {
    if (!renamingSessionId || !renameValue.trim()) return;
    // Update title in local state (sessions array)
    useChatStore.setState((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === renamingSessionId ? { ...s, title: renameValue.trim() } : s
      ),
    }));
    setRenamingSessionId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingSessionId(null);
    setRenameValue('');
  };

  // Auto-grow textarea
  const handleTextareaInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, []);

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
                  onClick={() => renamingSessionId !== session.id && selectSession(session.id)}
                  className={cn(
                    "group relative flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all",
                    isActive 
                      ? "bg-[#17171c] border border-[#2e2e36] text-zinc-100" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#111115]"
                  )}
                >
                  <div className="flex items-start gap-2.5 overflow-hidden pr-14">
                    <MessageSquare className={cn("w-4 h-4 mt-0.5 flex-shrink-0", isActive ? "text-blue-500" : "text-zinc-500")} />
                    <div className="overflow-hidden">
                      {renamingSessionId === session.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmRename();
                              if (e.key === 'Escape') cancelRename();
                            }}
                            className="text-xs font-semibold bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 outline-none focus:border-blue-500 w-32"
                          />
                          <button onClick={confirmRename} className="p-0.5 text-emerald-400 hover:text-emerald-300 transition">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={cancelRename} className="p-0.5 text-zinc-500 hover:text-zinc-300 transition">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-xs font-semibold truncate leading-tight">{session.title}</h4>
                      )}
                      <p className="text-[9px] text-zinc-500 mt-0.5 truncate">
                        {hasRepo ? `Repo: ${hasRepo.name}` : 'No Repository'}
                      </p>
                    </div>
                  </div>

                  <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                    {renamingSessionId !== session.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(session.id, session.title);
                        }}
                        className="p-1 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded transition"
                        title="Rename Chat"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition"
                      title="Delete Chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
            {/* Export Header Bar */}
            {messages.length > 0 && (
              <div className="flex items-center justify-end px-4 md:px-6 pt-3 pb-0">
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 bg-[#0d0d10]/65 backdrop-blur-xl border border-white/[0.06] rounded-lg hover:border-white/[0.1] transition-all shadow-depth-1"
                    title="Export chat session"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#0d0d10]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-depth-3 z-50 animate-fade-in-up overflow-hidden">
                      <button
                        onClick={handleExportMarkdown}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Export as Markdown</span>
                      </button>
                      <div className="border-t border-white/[0.04]" />
                      <button
                        onClick={handleExportJSON}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors"
                      >
                        <FileJson className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Export as JSON</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  {messages.map((message, msgIndex) => {
                    const isUser = message.role === 'user';
                    
                    return (
                      <div 
                        key={message.id}
                        className={cn(
                          "flex gap-4 p-4 rounded-xl border transition-colors max-w-[90%] animate-fade-in-up",
                          isUser 
                            ? "bg-[#18181b]/65 backdrop-blur-sm border-[#27272a] ml-auto" 
                            : "bg-[#0d0d10]/65 backdrop-blur-sm border-white/[0.06] mr-auto"
                        )}
                        style={{ animationDelay: `${Math.min(msgIndex * 0.05, 0.3)}s` }}
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
                                <div className="space-y-2.5 py-2">
                                  <div className="flex items-center gap-2 text-[11px] text-blue-400 font-semibold">
                                    <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                    <span>Thinking...</span>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="h-3 rounded-full animate-shimmer w-[85%]" />
                                    <div className="h-3 rounded-full animate-shimmer w-[60%]" style={{ animationDelay: '0.15s' }} />
                                    <div className="h-3 rounded-full animate-shimmer w-[72%]" style={{ animationDelay: '0.3s' }} />
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          {/* Streaming cursor */}
                          {message.status === 'streaming' && message.content && (
                            <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-400 rounded-sm animate-pulse-slow" />
                          )}

                          {/* Message actions */}
                          {message.content && !isStreaming && (
                            <div className="flex items-center gap-2.5 pt-1.5 border-t border-white/[0.03] mt-2">
                              {/* Copy message button */}
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(message.id, message.content)}
                                className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-white/[0.04] transition-all cursor-pointer"
                                title="Copy full message"
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Assistant only actions */}
                              {!isUser && (
                                <>
                                  {/* Thumbs up */}
                                  <button
                                    type="button"
                                    onClick={() => handleFeedback(message.id, 'up')}
                                    className={cn(
                                      "p-1 rounded hover:bg-white/[0.04] transition-all cursor-pointer",
                                      feedbackMap[message.id] === 'up' ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                    title="Thumbs up"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Thumbs down */}
                                  <button
                                    type="button"
                                    onClick={() => handleFeedback(message.id, 'down')}
                                    className={cn(
                                      "p-1 rounded hover:bg-white/[0.04] transition-all cursor-pointer",
                                      feedbackMap[message.id] === 'down' ? "text-red-400" : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                    title="Thumbs down"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Regenerate if it's the last assistant message */}
                                  {msgIndex === messages.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={handleRegenerate}
                                      className="p-1 text-zinc-500 hover:text-blue-400 rounded hover:bg-white/[0.04] transition-all ml-auto cursor-pointer"
                                      title="Regenerate response"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
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
                    value={activeSession?.repositoryId ? `repo:${activeSession.repositoryId}` : activeSession?.documentId ? `doc:${activeSession.documentId}` : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        handleContextChange(null, null);
                      } else if (val.startsWith('repo:')) {
                        handleContextChange(val.slice(5), null);
                      } else if (val.startsWith('doc:')) {
                        handleContextChange(null, val.slice(4));
                      }
                    }}
                    className="bg-[#060608] border border-[#1c1c21] text-[11px] rounded px-2.5 py-1 text-zinc-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No Active Context</option>
                    {repositories.length > 0 && (
                      <optgroup label="Code Repositories">
                        {repositories.map((repo) => (
                          <option key={repo.id} value={`repo:${repo.id}`}>
                            📁 {repo.name} ({repo.language})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {documents.length > 0 && (
                      <optgroup label="Uploaded Documents">
                        {documents.map((doc) => (
                          <option key={doc.id} value={`doc:${doc.id}`}>
                            📄 {doc.name} ({doc.type.toUpperCase()})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* API Key Missing Alert */}
                {!hasApiKey && (
                  <div className="mb-3 p-3 bg-amber-950/20 border border-amber-900/30 text-amber-200 rounded-lg text-xs leading-normal flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">LLM API Key Required (Zero-Retention Privacy): </span>
                       For your privacy and security, API keys are <strong>never stored on the server</strong>. Please click your profile card in the bottom-left sidebar to add your <strong>Google AI Studio (Gemini) API Key</strong> for this session. Get a free key at <strong>aistudio.google.com</strong>.
                    </div>
                  </div>
                )}

                {/* Input Text Box */}
                <div className={cn(
                  "relative flex items-center bg-[#0d0d10] border border-[#1c1c21] rounded-lg overflow-hidden focus-within:border-zinc-700 transition-colors",
                  !hasApiKey && "opacity-50 cursor-not-allowed bg-zinc-950/20"
                )}>
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onInput={handleTextareaInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                        // Reset textarea height
                        if (textareaRef.current) textareaRef.current.style.height = 'auto';
                      }
                    }}
                    placeholder={hasApiKey ? "Ask CodexRAG a question about your code or index..." : "Please configure your LLM API key in profile settings to chat..."}
                    className="flex-grow px-4 py-3 text-sm bg-transparent border-0 text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none min-h-[44px] max-h-[160px] transition-[height] duration-150"
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
