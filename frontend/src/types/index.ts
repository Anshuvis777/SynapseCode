export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  token?: string;
}

export type MessageRole = 'user' | 'assistant';

export interface FileReference {
  path: string;
  confidence: number;
  lines?: string;
  content?: string;
}

export interface AgentStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  durationMs?: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status?: 'done' | 'streaming' | 'error';
  // Context metadata shown in the right panel
  retrievedFiles?: FileReference[];
  agentSteps?: AgentStep[];
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  repositoryId?: string;
}

export type RepositoryStatus = 'indexed' | 'indexing' | 'failed' | 'not_indexed';

export interface Repository {
  id: string;
  name: string;
  owner: string;
  url?: string;
  language: string;
  indexedFiles: number;
  totalFiles: number;
  status: RepositoryStatus;
  progress?: number; // 0 to 100
  lastIndexedTime?: string;
  size?: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'markdown' | 'docx' | 'txt' | 'other';
  size: string;
  uploadProgress: number; // 0 to 100
  status: 'uploaded' | 'uploading' | 'failed';
  uploadedAt: string;
}

export interface SemanticSearchResult {
  id: string;
  filePath: string;
  repositoryId: string;
  repositoryName: string;
  chunkContent: string;
  confidence: number; // 0 to 1 (e.g. 0.92)
  startLine: number;
  endLine: number;
}

export interface DevMemory {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: string;
}

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
}

export interface AISettings {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  embeddingModel: string;
}
