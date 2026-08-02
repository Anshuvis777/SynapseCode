import { create } from 'zustand';
import type { AISettings, LLMModel, LLMProvider } from '../types';

interface SettingsState {
  settings: AISettings;
  availableModels: LLMModel[];
  availableEmbeddingModels: string[];
  updateSettings: (updates: Partial<AISettings>) => void;
  getModelsForProvider: (provider: LLMProvider) => LLMModel[];
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.2,
  maxTokens: 4096,
  embeddingModel: 'text-embedding-3-small',
};

const MOCK_MODELS: LLMModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o (Omni)', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
  { id: 'llama-3-1-70b', name: 'Llama 3.1 70B (Ollama)', provider: 'ollama' },
  { id: 'codellama', name: 'CodeLlama 34B (Ollama)', provider: 'ollama' },
  { id: 'qwen-2-5-coder', name: 'Qwen 2.5 Coder 14B (Ollama)', provider: 'ollama' },
];

const MOCK_EMBEDDING_MODELS = [
  'text-embedding-3-small (OpenAI)',
  'text-embedding-3-large (OpenAI)',
  'cohere-embed-english-v3.0 (Cohere)',
  'voyage-code-2 (VoyageAI)',
  'nomic-embed-text (Ollama)',
];

export const useSettingsStore = create<SettingsState>((set, get) => {
  // Load initial settings from localStorage if available
  const storedSettings = localStorage.getItem('devassist_settings');
  const initialSettings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;

  return {
    settings: initialSettings,
    availableModels: MOCK_MODELS,
    availableEmbeddingModels: MOCK_EMBEDDING_MODELS,

    updateSettings: (updates) => {
      set((state) => {
        const newSettings = { ...state.settings, ...updates };
        
        // If provider changes, auto-select first model of that provider
        if (updates.provider && updates.provider !== state.settings.provider) {
          const providerModels = MOCK_MODELS.filter((m) => m.provider === updates.provider);
          if (providerModels.length > 0) {
            newSettings.model = providerModels[0].id;
          }
        }

        localStorage.setItem('devassist_settings', JSON.stringify(newSettings));
        return { settings: newSettings };
      });
    },

    getModelsForProvider: (provider) => {
      return get().availableModels.filter((m) => m.provider === provider);
    },
  };
});
