import { apiClient } from '../api/client';
import type { ChatSession, Repository, Document, SemanticSearchResult, DevMemory, AISettings } from '../types';

export const apiService = {
  // Authentication
  auth: {
    login: async (email: string, password?: string) => {
      try {
        const response = await apiClient.post('/auth/login', { email, password });
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Falling back to mockup authentication.');
        return {
          id: 'user-' + Math.random().toString(36).substring(2, 9),
          email,
          name: email.split('@')[0],
          token: 'mock-jwt-token-xyz',
        };
      }
    },
  },

  // Chat
  chat: {
    sendPrompt: async (chatId: string, message: string, settings: AISettings) => {
      try {
        const response = await apiClient.post(`/chat/send`, { chatId, message, settings });
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Mocking Chat response.');
        throw error; // Let the store handle the simulation
      }
    },
    
    getSessions: async (): Promise<ChatSession[]> => {
      try {
        const response = await apiClient.get('/chat/sessions');
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Returning local sessions.');
        return [];
      }
    },
  },

  // Repositories
  repositories: {
    list: async (): Promise<Repository[]> => {
      try {
        const response = await apiClient.get('/repositories');
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Returning local repositories.');
        return [];
      }
    },

    connectGithub: async (owner: string, name: string, language: string): Promise<Repository> => {
      try {
        const response = await apiClient.post('/repositories/github', { owner, name, language });
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Returning mock GitHub repository.');
        return {
          id: `repo-github-${Math.random().toString(36).substring(2, 9)}`,
          name,
          owner,
          url: `https://github.com/${owner}/${name}`,
          language,
          indexedFiles: 0,
          totalFiles: 150,
          status: 'indexing',
          progress: 5,
        };
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        await apiClient.delete(`/repositories/${id}`);
      } catch (error) {
        console.warn(`API connection failed. Mock deleted repository ${id}.`);
      }
    },

    reindex: async (id: string): Promise<void> => {
      try {
        await apiClient.post(`/repositories/${id}/reindex`);
      } catch (error) {
        console.warn(`API connection failed. Mock re-indexing repository ${id}.`);
      }
    },
  },

  // Documents
  documents: {
    list: async (): Promise<Document[]> => {
      try {
        const response = await apiClient.get('/documents');
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Returning local documents list.');
        return [];
      }
    },

    upload: async (file: File, onProgress: (progress: number) => void): Promise<Document> => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await apiClient.post('/documents/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
            onProgress(percentCompleted);
          },
        });
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Simulating document upload.');
        // Simulate progress intervals
        let p = 0;
        await new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            p += 25;
            onProgress(Math.min(p, 100));
            if (p >= 100) {
              clearInterval(interval);
              resolve();
            }
          }, 300);
        });

        return {
          id: `doc-upload-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.md') ? 'markdown' : file.name.endsWith('.docx') ? 'docx' : 'txt',
          size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`,
          uploadProgress: 100,
          status: 'uploaded',
          uploadedAt: new Date().toLocaleString(),
        };
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        await apiClient.delete(`/documents/${id}`);
      } catch (error) {
        console.warn(`API connection failed. Mock deleted document ${id}.`);
      }
    },
  },

  // Semantic Search
  search: {
    query: async (q: string, repositoryId?: string): Promise<SemanticSearchResult[]> => {
      try {
        const response = await apiClient.get('/search', {
          params: { q, repositoryId },
        });
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Falling back to local semantic search.');
        throw error; // Handled in repositoryStore mock
      }
    },
  },

  // Memories
  memories: {
    list: async (): Promise<DevMemory[]> => {
      try {
        const response = await apiClient.get('/memories');
        return response.data;
      } catch (error) {
        console.warn('API connection failed. Returning local memories.');
        return [];
      }
    },

    create: async (content: string): Promise<DevMemory> => {
      try {
        const response = await apiClient.post('/memories', { content });
        return response.data;
      } catch (error) {
        return {
          id: `mem-${Math.random().toString(36).substring(2, 9)}`,
          content,
          pinned: false,
          createdAt: new Date().toLocaleString(),
        };
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        await apiClient.delete(`/memories/${id}`);
      } catch (error) {
        console.warn(`API connection failed. Mock deleted memory ${id}.`);
      }
    },

    togglePin: async (id: string, pinned: boolean): Promise<void> => {
      try {
        await apiClient.put(`/memories/${id}/pin`, { pinned });
      } catch (error) {
        console.warn(`API connection failed. Mock toggled pin on memory ${id}.`);
      }
    },
  },
};
