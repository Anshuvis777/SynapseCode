import { create } from 'zustand';
import { apiClient } from '../api/client';
import type { Repository, Document, SemanticSearchResult, RepositoryStatus } from '../types';

interface RepositoryState {
  repositories: Repository[];
  documents: Document[];
  searchResults: SemanticSearchResult[];
  isSearching: boolean;
  searchQuery: string;
  activeRepositoryId: string | null;
  
  // Hydration Actions
  fetchRepositories: () => Promise<void>;
  fetchDocuments: () => Promise<void>;

  // Repo Actions
  connectGithubRepo: (owner: string, name: string, language: string) => Promise<void>;
  uploadLocalRepo: (name: string, size: string, language: string) => Promise<void>;
  deleteRepo: (id: string) => Promise<void>;
  reindexRepo: (id: string) => Promise<void>;
  setActiveRepository: (id: string | null) => void;
  
  // Doc Actions
  uploadDocument: (file: File, repoId?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  
  // Search Actions
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
}

// Map backend repository status to frontend repository status type
function mapRepoStatus(backendStatus: string): RepositoryStatus {
  switch (backendStatus) {
    case 'completed':
      return 'indexed';
    case 'failed':
      return 'failed';
    case 'pending':
    case 'cloning':
    case 'parsing':
    case 'embedding':
    case 'indexing':
      return 'indexing';
    default:
      return 'not_indexed';
  }
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  repositories: [],
  documents: [],
  searchResults: [],
  isSearching: false,
  searchQuery: '',
  activeRepositoryId: null,

  fetchRepositories: async () => {
    try {
      const response = await apiClient.get('/repos');
      const repositories: Repository[] = response.data.map((r: any) => ({
        id: r.id,
        name: r.name,
        owner: r.url ? r.url.split('github.com/')[1]?.split('/')[0] || 'owner' : 'local',
        url: r.url,
        language: 'Generic',
        indexedFiles: r.file_count || 0,
        totalFiles: r.file_count || 0,
        status: mapRepoStatus(r.status),
        progress: r.progress,
        lastIndexedTime: r.updated_at ? new Date(r.updated_at).toLocaleString() : undefined,
        size: 'N/A',
      }));

      set({ repositories });
      
      // Auto-set active repo if not set
      if (repositories.length > 0 && !get().activeRepositoryId) {
        set({ activeRepositoryId: repositories[0].id });
      }
    } catch (e) {
      console.error('Failed to fetch repositories', e);
    }
  },

  fetchDocuments: async () => {
    try {
      const response = await apiClient.get('/documents');
      const documents: Document[] = response.data.map((d: any) => {
        const sizeStr = d.file_size > 1024 * 1024
          ? `${(d.file_size / (1024 * 1024)).toFixed(1)} MB`
          : `${(d.file_size / 1024).toFixed(0)} KB`;
        return {
          id: d.id,
          name: d.filename,
          type: d.file_type as Document['type'],
          size: sizeStr,
          uploadProgress: d.status === 'ready' ? 100 : d.status === 'processing' ? 50 : 0,
          status: d.status === 'ready' ? 'uploaded' : d.status === 'processing' ? 'uploading' : 'failed',
          uploadedAt: new Date(d.created_at).toLocaleString(),
        };
      });
      set({ documents });
    } catch (e) {
      console.error('Failed to fetch documents', e);
    }
  },

  connectGithubRepo: async (owner, name, language) => {
    const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`;
    const newRepo: Repository = {
      id: tempId,
      name,
      owner,
      url: `https://github.com/${owner}/${name}`,
      language,
      indexedFiles: 0,
      totalFiles: 0,
      status: 'indexing',
      progress: 0,
      lastIndexedTime: 'Just now',
    };

    set((state) => ({
      repositories: [newRepo, ...state.repositories],
    }));

    try {
      const response = await apiClient.post('/repos', {
        name,
        url: `https://github.com/${owner}/${name}`,
        source_type: 'github',
        description: `GitHub repository ${owner}/${name}`,
      });
      
      const created = response.data;
      set((state) => ({
        repositories: state.repositories.map((r) =>
          r.id === tempId
            ? {
                ...r,
                id: created.id,
                status: mapRepoStatus(created.status),
                progress: created.progress,
              }
            : r
        ),
      }));

      // Start status polling for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await apiClient.get(`/repos/${created.id}`);
          const updated = pollRes.data;
          
          set((state) => ({
            repositories: state.repositories.map((r) =>
              r.id === created.id
                ? {
                    ...r,
                    status: mapRepoStatus(updated.status),
                    progress: updated.progress,
                    indexedFiles: updated.file_count || 0,
                    totalFiles: updated.file_count || 0,
                  }
                : r
            ),
          }));

          if (updated.status === 'completed' || updated.status === 'failed') {
            clearInterval(pollInterval);
            get().fetchRepositories();
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 3000);

    } catch (e) {
      console.error('Failed to connect GitHub repository', e);
      set((state) => ({
        repositories: state.repositories.map((r) =>
          r.id === tempId ? { ...r, status: 'failed' } : r
        ),
      }));
    }
  },

  uploadLocalRepo: async (name, size, language) => {
    // Local uploads aren't directly implemented on the backend since it clones github URLs,
    // but we can register it as a local type or fallback.
    const tempId = `temp-local-${Math.random().toString(36).substring(2, 9)}`;
    const newRepo: Repository = {
      id: tempId,
      name,
      owner: 'local',
      language,
      indexedFiles: 0,
      totalFiles: 0,
      status: 'indexing',
      progress: 10,
      size,
    };
    set((state) => ({
      repositories: [newRepo, ...state.repositories],
    }));

    try {
      const response = await apiClient.post('/repos', {
        name,
        source_type: 'local',
        description: `Local uploaded workspace: ${name}`,
      });
      const created = response.data;
      set((state) => ({
        repositories: state.repositories.map((r) =>
          r.id === tempId
            ? {
                ...r,
                id: created.id,
                status: mapRepoStatus(created.status),
                progress: created.progress,
              }
            : r
        ),
      }));
      get().fetchRepositories();
    } catch (e) {
      console.error('Failed to create local repository configuration', e);
      set((state) => ({
        repositories: state.repositories.map((r) =>
          r.id === tempId ? { ...r, status: 'failed' } : r
        ),
      }));
    }
  },

  deleteRepo: async (id) => {
    try {
      await apiClient.delete(`/repos/${id}`);
      set((state) => ({
        repositories: state.repositories.filter((r) => r.id !== id),
        activeRepositoryId: state.activeRepositoryId === id ? null : state.activeRepositoryId,
      }));
    } catch (e) {
      console.error('Failed to delete repository', e);
    }
  },

  reindexRepo: async (id) => {
    try {
      await apiClient.post(`/repos/${id}/index`);
      
      set((state) => ({
        repositories: state.repositories.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'indexing',
                progress: 0,
              }
            : r
        ),
      }));

      // Status polling for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await apiClient.get(`/repos/${id}`);
          const pollData = pollRes.data;
          
          set((state) => ({
            repositories: state.repositories.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: mapRepoStatus(pollData.status),
                    progress: pollData.progress,
                  }
                : r
            ),
          }));

          if (pollData.status === 'completed' || pollData.status === 'failed') {
            clearInterval(pollInterval);
            get().fetchRepositories();
          }
        } catch {
          clearInterval(pollInterval);
        }
      }, 3000);
    } catch (e) {
      console.error('Failed to reindex repository', e);
    }
  },

  setActiveRepository: (id) => {
    set({ activeRepositoryId: id });
  },

  uploadDocument: async (file: File, repoId?: string) => {
    const tempId = `temp-doc-${Math.random().toString(36).substring(2, 9)}`;
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;

    const newDoc: Document = {
      id: tempId,
      name: file.name,
      type: (file.name.endsWith('.md') ? 'markdown' : file.type.includes('pdf') ? 'pdf' : file.type.includes('docx') ? 'docx' : 'txt') as Document['type'],
      size: sizeStr,
      uploadProgress: 20,
      status: 'uploading',
      uploadedAt: 'Just now',
    };

    set((state) => ({
      documents: [newDoc, ...state.documents],
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      const activeRepoId = repoId || get().activeRepositoryId;
      if (activeRepoId) {
        formData.append('repo_id', activeRepoId);
      }

      const response = await apiClient.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
          set((state) => ({
            documents: state.documents.map((d) =>
              d.id === tempId ? { ...d, uploadProgress: progress } : d
            ),
          }));
        },
      });

      const uploadedDoc = response.data;
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === tempId
            ? {
                ...d,
                id: uploadedDoc.id,
                status: 'uploaded',
                uploadProgress: 100,
                uploadedAt: new Date(uploadedDoc.created_at).toLocaleString(),
              }
            : d
        ),
      }));
    } catch (e) {
      console.error('Failed to upload document file', e);
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === tempId ? { ...d, status: 'failed' } : d
        ),
      }));
    }
  },

  deleteDocument: async (id) => {
    try {
      await apiClient.delete(`/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
    } catch (e) {
      console.error('Failed to delete document', e);
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  performSearch: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: query });
      return;
    }

    set({ isSearching: true, searchQuery: query });
    try {
      const activeRepoId = get().activeRepositoryId;
      const params: any = { q: query };
      if (activeRepoId) {
        params.repo_id = activeRepoId;
      }
      
      const response = await apiClient.get('/search', { params });
      
      const results: SemanticSearchResult[] = response.data.map((r: any, idx: number) => ({
        id: r.id || `search-res-${idx}`,
        filePath: r.file_path,
        repositoryId: r.repo_id || activeRepoId || '',
        repositoryName: get().repositories.find((rep) => rep.id === r.repo_id)?.name || 'repository',
        chunkContent: r.content,
        confidence: parseFloat(r.score ? r.score.toFixed(2) : '0.85'),
        startLine: r.start_line || 1,
        endLine: r.end_line || 1,
      }));

      set({ searchResults: results, isSearching: false });
    } catch (e) {
      console.error('Failed to perform semantic search query', e);
      set({ searchResults: [], isSearching: false });
    }
  },
}));
