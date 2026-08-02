import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch, 
  FileText, 
  Brain, 
  MessageSquare, 
  Cpu, 
  Settings as SettingsIcon,
  Search,
  ArrowRight,
  Database,
  Zap
} from 'lucide-react';
import { useRepositoryStore } from '../store/repositoryStore';
import { useChatStore } from '../store/chatStore';
import { useSettingsStore } from '../store/settingsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { repositories, documents } = useRepositoryStore();
  const { sessions, memories, createSession } = useChatStore();
  const { settings } = useSettingsStore();

  const indexedRepos = repositories.filter(r => r.status === 'indexed');
  const indexingRepos = repositories.filter(r => r.status === 'indexing');

  const handleStartChat = () => {
    createSession(repositories[0]?.id);
    navigate('/chat');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">Developer Workspace</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Monitor your semantic codebase indices, active agent logs, and connected documentation.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Repositories */}
        <Card className="hover:border-zinc-700/60 transition duration-300">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b-0">
            <CardTitle className="text-xs font-bold text-zinc-450 uppercase tracking-wider text-zinc-400">
              Repositories
            </CardTitle>
            <GitBranch className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono">{repositories.length}</div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {indexedRepos.length} indexed • {indexingRepos.length} active
            </p>
          </CardContent>
        </Card>

        {/* Stat 2: Documents */}
        <Card className="hover:border-zinc-700/60 transition duration-300">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b-0">
            <CardTitle className="text-xs font-bold text-zinc-450 uppercase tracking-wider text-zinc-400">
              Corpus Docs
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono">{documents.length}</div>
            <p className="text-[10px] text-zinc-500 mt-1">
              RAG Knowledge Bases active
            </p>
          </CardContent>
        </Card>

        {/* Stat 3: Memory Items */}
        <Card className="hover:border-zinc-700/60 transition duration-300">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b-0">
            <CardTitle className="text-xs font-bold text-zinc-455 uppercase tracking-wider text-zinc-400">
              Dev Memory
            </CardTitle>
            <Brain className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono">{memories.length}</div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {memories.filter(m => m.pinned).length} pinned developer rules
            </p>
          </CardContent>
        </Card>

        {/* Stat 4: Active Chat sessions */}
        <Card className="hover:border-zinc-700/60 transition duration-300">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b-0">
            <CardTitle className="text-xs font-bold text-zinc-455 uppercase tracking-wider text-zinc-400">
              Active Chats
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold font-mono">{sessions.length}</div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Conversations indexed in history
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main layout splitting: Quick Actions & Connected Core Systems */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Repository index health & Recent activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Workspaces Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Workspace Indexing status</CardTitle>
              <CardDescription>Codebase semantic chunks ready for LLM retrieval</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-zinc-850">
              {repositories.map((repo) => (
                <div key={repo.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-200 font-mono">{repo.owner}/{repo.name}</h4>
                    <div className="flex gap-3 text-[10px] text-zinc-500">
                      <span>Lang: {repo.language}</span>
                      <span>Size: {repo.size}</span>
                      <span>Files: {repo.indexedFiles} / {repo.totalFiles}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    repo.status === 'indexed' 
                      ? 'bg-green-950/40 border-green-800/50 text-green-400' 
                      : repo.status === 'indexing' 
                      ? 'bg-blue-950/40 border-blue-800/50 text-blue-400 animate-pulse'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}>
                    {repo.status === 'indexing' ? `Indexing ${repo.progress || 0}%` : repo.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Launchpad Guide */}
          <div className="p-5 rounded-lg border border-blue-950/40 bg-blue-950/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Quickstart Prompting
              </h4>
              <p className="text-xs text-zinc-400 leading-normal max-w-lg">
                Ask DevAssist AI to debug, write test suites, explain architectural frameworks, or search semantic chunks across all connected files instantly.
              </p>
            </div>
            <Button size="sm" className="text-xs whitespace-nowrap" onClick={handleStartChat}>
              <span>Start AI Chat</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>

        </div>

        {/* Right 1 Col: Quick Links & Config Panel */}
        <div className="space-y-6">
          
          {/* Active LLM Parameters */}
          <Card>
            <CardHeader className="pb-3 border-b-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                Active LLM Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-xs">
              <div className="space-y-2 p-3 bg-zinc-950/50 border border-zinc-850 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold">LLM Provider:</span>
                  <span className="text-zinc-200 font-mono capitalize">{settings.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold">Active Model:</span>
                  <span className="text-zinc-200 font-mono">{settings.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold">Temperature:</span>
                  <span className="text-zinc-200 font-mono">{settings.temperature}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-semibold">Embedder:</span>
                  <span className="text-zinc-200 font-mono text-[10.5px] truncate max-w-[120px]" title={settings.embeddingModel}>
                    {settings.embeddingModel.split(' ')[0]}
                  </span>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs font-semibold"
                onClick={() => navigate('/settings')}
              >
                <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
                <span>Configure Settings</span>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Navigation Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              <button 
                onClick={() => navigate('/search')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-850 bg-zinc-900/10 hover:bg-zinc-850/40 text-left transition"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-200">Global Code Search</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <button 
                onClick={() => navigate('/repositories')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-850 bg-zinc-900/10 hover:bg-zinc-850/40 text-left transition"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-200">Index Repository</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
              <button 
                onClick={() => navigate('/memory')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-850 bg-zinc-900/10 hover:bg-zinc-850/40 text-left transition"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-200">Manage LLM Rules</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
