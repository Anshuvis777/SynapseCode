import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { ChatSession, Message, DevMemory, FileReference } from '../types';

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  memories: DevMemory[];
  isStreaming: boolean;
  activeContextPanelTab: 'context' | 'reasoning' | 'tokens';
  
  // Async Hydration Actions
  fetchSessions: (repositoryId?: string) => Promise<void>;
  fetchMemories: () => Promise<void>;
  
  // Chat Actions
  createSession: (repositoryId?: string, title?: string) => Promise<string>;
  selectSession: (id: string | null) => Promise<void>;
  updateSessionRepository: (sessionId: string, repositoryId: string | null) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (content: string, repositoryId?: string) => Promise<void>;
  
  // Memory Actions
  addMemory: (content: string, category?: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  togglePinMemory: (id: string) => void;
  
  // UI Actions
  setContextPanelTab: (tab: 'context' | 'reasoning' | 'tokens') => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  memories: [],
  isStreaming: false,
  activeContextPanelTab: 'context',

  fetchSessions: async (repositoryId) => {
    try {
      const response = await apiClient.get('/chat/sessions', {
        params: repositoryId ? { repository_id: repositoryId } : {},
      });
      const sessions = response.data.map((s: any) => ({
        id: s.id,
        title: s.title,
        repositoryId: s.repository_id,
        createdAt: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        updatedAt: new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [],
      }));
      set({ sessions });

      // Automatically select first session if available
      if (sessions.length > 0 && !get().activeSessionId) {
        get().selectSession(sessions[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch chat sessions', e);
    }
  },

  fetchMemories: async () => {
    try {
      const response = await apiClient.get('/memories');
      const memories = response.data.map((m: any) => ({
        id: m.id,
        content: m.content,
        category: m.category,
        pinned: false,
        createdAt: new Date().toLocaleString(),
      }));
      set({ memories });
    } catch (e) {
      console.error('Failed to fetch memories', e);
    }
  },

  createSession: async (repositoryId, title = 'New Conversation') => {
    try {
      const response = await apiClient.post('/chat/sessions', {
        repository_id: repositoryId,
        title,
      });
      const s = response.data;
      const newSession: ChatSession = {
        id: s.id,
        title: s.title,
        repositoryId: s.repository_id,
        createdAt: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        updatedAt: new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [],
      };

      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
      }));

      return newSession.id;
    } catch (e) {
      console.error('Failed to create chat session', e);
      return '';
    }
  },

  selectSession: async (id) => {
    if (!id) {
      set({ activeSessionId: null });
      return;
    }
    set({ activeSessionId: id });
    try {
      const response = await apiClient.get(`/chat/sessions/${id}`);
      const sessionData = response.data;
      
      const messages: Message[] = sessionData.messages.map((m: any) => {
        const total = (m.input_tokens || 0) + (m.output_tokens || 0);
        return {
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'done',
          tokensUsed: total > 0 ? {
            prompt: m.input_tokens || 0,
            completion: m.output_tokens || 0,
            total,
          } : undefined,
          retrievedFiles: m.sources ? m.sources.map((src: any) => ({
            path: src.file_path,
            confidence: 0.95,
            lines: `${src.start_line}-${src.end_line}`,
          })) : [],
          agentSteps: total > 0 ? [
            { id: 'step-1', title: 'Searching repository codebase...', status: 'completed', durationMs: 400 },
            { id: 'step-2', title: 'Formulating solution...', status: 'completed', durationMs: 1200 }
          ] : undefined,
        };
      });

      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, repositoryId: sessionData.repository_id || undefined, messages } : s
        ),
      }));
    } catch (e) {
      console.error('Failed to fetch session detail', e);
    }
  },

  updateSessionRepository: async (sessionId: string, repositoryId: string | null) => {
    try {
      await apiClient.patch(`/chat/sessions/${sessionId}`, {
        repository_id: repositoryId,
      });
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, repositoryId: repositoryId || undefined } : s
        ),
      }));
    } catch (e) {
      console.error('Failed to update session repository context', e);
    }
  },

  deleteSession: async (id) => {
    try {
      await apiClient.delete(`/chat/sessions/${id}`);
      set((state) => {
        const remainingSessions = state.sessions.filter((s) => s.id !== id);
        let nextActiveId = state.activeSessionId;
        if (state.activeSessionId === id) {
          nextActiveId = remainingSessions.length > 0 ? remainingSessions[0].id : null;
        }
        return {
          sessions: remainingSessions,
          activeSessionId: nextActiveId,
        };
      });
      // Hydrate messages for the new active session
      const nextId = get().activeSessionId;
      if (nextId) {
        get().selectSession(nextId);
      }
    } catch (e) {
      console.error('Failed to delete chat session', e);
    }
  },

  sendMessage: async (content, _repositoryId) => {
    const sessionId = get().activeSessionId;
    if (!sessionId) return;

    // 1. Instantly append user message to local state
    const userMsg: Message = {
      id: `temp-msg-${uuid4()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'done',
    };

    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, userMsg],
            updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        }
        return s;
      }),
    }));

    // 2. Insert temporary assistant message in streaming state
    const assistantMsgId = `assistant-msg-${uuid4()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'streaming',
      retrievedFiles: [],
      agentSteps: [
        { id: 'step-1', title: 'Searching repository codebase...', status: 'running' }
      ],
    };

    set((state) => ({
      isStreaming: true,
      sessions: state.sessions.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, initialAssistantMsg],
          };
        }
        return s;
      }),
    }));

    // 3. Initiate SSE connection via fetch
    try {
      const storedUser = localStorage.getItem('devassist_user');
      let token = '';
      let geminiKey = '';
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          token = parsed.token || '';
          geminiKey = parsed.geminiApiKey || parsed.huggingfaceApiKey || '';
        } catch {}
      }

      const baseURL = apiClient.defaults.baseURL || 'http://localhost:8000/api';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      if (geminiKey) {
        headers['X-LLM-Provider'] = 'gemini';
        headers['X-LLM-API-Key'] = geminiKey;
        headers['X-Embedding-API-Key'] = geminiKey;
      }

      const response = await fetch(`${baseURL}/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`SSE request failed with status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) {
        throw new Error('ReadableStream not supported by browser.');
      }

      let partial = '';
      let accumulatedResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partial + chunk).split('\n');
        partial = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const rawData = trimmedLine.slice(6).trim();
            if (!rawData) continue;

            try {
              const data = JSON.parse(rawData);

              // Standardize files list from backend
              if (data.sources) {
                const files: FileReference[] = data.sources.map((src: any) => ({
                  path: src.file_path,
                  confidence: 0.95,
                  lines: `${src.start_line}-${src.end_line}`,
                }));

                set((state) => ({
                  sessions: state.sessions.map((s) => {
                    if (s.id === sessionId) {
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantMsgId
                            ? {
                                ...m,
                                retrievedFiles: files,
                                agentSteps: [
                                  { id: 'step-1', title: 'Searching repository codebase...', status: 'completed', durationMs: 400 },
                                  { id: 'step-2', title: 'Formulating solution...', status: 'running' }
                                ]
                              }
                            : m
                        ),
                      };
                    }
                    return s;
                  }),
                }));
              }

              // Stream tokens
              if (data.token) {
                accumulatedResponse += data.token;
                set((state) => ({
                  sessions: state.sessions.map((s) => {
                    if (s.id === sessionId) {
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantMsgId
                            ? { ...m, content: accumulatedResponse }
                            : m
                        ),
                      };
                    }
                    return s;
                  }),
                }));
              }

              // Finalize completion
              if (data.done) {
                set((state) => ({
                  isStreaming: false,
                  sessions: state.sessions.map((s) => {
                    if (s.id === sessionId) {
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantMsgId
                            ? {
                                ...m,
                                id: data.message_id,
                                status: 'done',
                                tokensUsed: data.tokens_used ? {
                                  prompt: data.tokens_used.prompt,
                                  completion: data.tokens_used.completion,
                                  total: data.tokens_used.total,
                                } : undefined,
                                agentSteps: [
                                  { id: 'step-1', title: 'Searching repository codebase...', status: 'completed', durationMs: 400 },
                                  { id: 'step-2', title: 'Formulating solution...', status: 'completed', durationMs: 1200 }
                                ]
                              }
                            : m
                        ),
                      };
                    }
                    return s;
                  }),
                }));
              }
            } catch (e) {
              console.error('Error parsing SSE line', e);
            }
          }
        }
      }

    } catch (err: any) {
      console.error('SSE Stream Error', err);
      // Mark assistant response as error
      set((state) => ({
        isStreaming: false,
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      status: 'error',
                      content: `Error: ${err.message || 'Failed to generate response.'}`,
                      agentSteps: [
                        { id: 'step-1', title: 'Searching repository codebase...', status: 'failed' }
                      ]
                    }
                  : m
              ),
            };
          }
          return s;
        }),
      }));
    }
  },

  addMemory: async (content, category = 'general') => {
    try {
      const response = await apiClient.post('/memories', {
        content,
        category,
      });
      const m = response.data;
      const newMemory: DevMemory = {
        id: m.id,
        content: m.content,
        pinned: false,
        createdAt: new Date().toLocaleString(),
      };
      set((state) => ({
        memories: [newMemory, ...state.memories],
      }));
    } catch (e) {
      console.error('Failed to save memory', e);
    }
  },

  deleteMemory: async (id) => {
    try {
      await apiClient.delete(`/memories/${id}`);
      set((state) => ({
        memories: state.memories.filter((m) => m.id !== id),
      }));
    } catch (e) {
      console.error('Failed to delete memory', e);
    }
  },

  togglePinMemory: (id) => {
    set((state) => ({
      memories: state.memories.map((m) =>
        m.id === id ? { ...m, pinned: !m.pinned } : m
      ),
    }));
  },

  setContextPanelTab: (tab) => {
    set({ activeContextPanelTab: tab });
  },
}));

// Inline UUID generator helper
function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
