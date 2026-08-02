import React from 'react';
import { 
  Cpu, 
  Sliders, 
  Database, 
  Save, 
  ShieldAlert
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useToast } from '../components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../utils';
import type { LLMProvider } from '../types';

export const Settings: React.FC = () => {
  const { 
    settings, 
    availableEmbeddingModels, 
    updateSettings, 
    getModelsForProvider 
  } = useSettingsStore();

  const { toast } = useToast();

  const handleProviderChange = (provider: LLMProvider) => {
    updateSettings({ provider });
    toast('LLM Provider Changed', {
      description: `Default model auto-selected for ${provider}.`,
      type: 'info',
    });
  };

  const handleModelChange = (model: string) => {
    updateSettings({ model });
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ temperature: parseFloat(e.target.value) });
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ maxTokens: parseInt(e.target.value, 10) });
  };

  const handleEmbeddingChange = (embeddingModel: string) => {
    updateSettings({ embeddingModel });
    toast('Embedding Model Updated', {
      description: `Embedding structures set to: ${embeddingModel}.`,
      type: 'info',
    });
  };

  const handleSaveConfigs = () => {
    toast('Configuration Saved', {
      description: 'DevAssist AI backend parameters updated successfully.',
      type: 'success',
    });
  };

  const currentModels = getModelsForProvider(settings.provider);

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto select-none max-w-3xl">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">System Configurations</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Adjust artificial intelligence parameters, model choices, hyperparameters, and vector embedders.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Card 1: Core Model Select */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <Cpu className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <CardTitle className="text-sm">Language Completion Model</CardTitle>
              <CardDescription>Select completion LLM provider and engine</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Provider selection */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['openai', 'anthropic', 'google', 'ollama'] as LLMProvider[]).map((p) => {
                const isActive = settings.provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProviderChange(p)}
                    className={cn(
                      "px-3 py-2 text-xs font-bold rounded-lg border capitalize transition text-center",
                      isActive
                        ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-sm"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                    )}
                  >
                    {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : p === 'google' ? 'Google' : 'Ollama (Local)'}
                  </button>
                );
              })}
            </div>

            {/* Model select */}
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Active Inference Engine
              </label>
              <select
                value={settings.model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                {currentModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

          </CardContent>
        </Card>

        {/* Card 2: Inference parameters */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <Sliders className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <CardTitle className="text-sm">Engine Hyperparameters</CardTitle>
              <CardDescription>Calibrate temperature and context size</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            
            {/* Temperature Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-zinc-350 text-zinc-300">Temperature</label>
                <span className="font-mono bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded text-blue-400 font-bold">
                  {settings.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={settings.temperature}
                onChange={handleTemperatureChange}
                className="w-full h-1.5 bg-zinc-950 border border-zinc-850 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] text-zinc-550 text-zinc-500">
                <span>Deterministic (Code, Logic)</span>
                <span>Creative (Drafting, Brainstorming)</span>
              </div>
            </div>

            {/* Max Tokens Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-zinc-330 text-zinc-300">Max Completion Tokens</label>
                <span className="font-mono bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded text-blue-400 font-bold">
                  {settings.maxTokens}
                </span>
              </div>
              <input
                type="range"
                min="512"
                max="8192"
                step="256"
                value={settings.maxTokens}
                onChange={handleMaxTokensChange}
                className="w-full h-1.5 bg-zinc-950 border border-zinc-850 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] text-zinc-550 text-zinc-500">
                <span>Short Snippets (512)</span>
                <span>Full Refactors (8192)</span>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Card 3: Embeddings */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-3">
            <Database className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <CardTitle className="text-sm">Semantic Embedding Model</CardTitle>
              <CardDescription>Vector dimensions configuration for codebase chunks search</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Vector Embedding Engine
              </label>
              <select
                value={settings.embeddingModel}
                onChange={(e) => handleEmbeddingChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                {availableEmbeddingModels.map((em) => (
                  <option key={em} value={em}>
                    {em}
                  </option>
                ))}
              </select>
            </div>

            {/* Warning block about switching embedders */}
            <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-amber-200 rounded-lg flex items-start gap-2.5">
              <ShieldAlert className="w-4.5 h-4.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] leading-normal">
                <span className="font-bold text-amber-300">Warning:</span> Changing vector models requires re-indexing connected repositories to generate corresponding dimension vectors. Already-indexed repos will mismatch until re-indexed.
              </p>
            </div>

          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSaveConfigs} className="text-xs font-bold uppercase tracking-wider h-9">
            <Save className="w-4 h-4 mr-1.5" />
            <span>Apply Configurations</span>
          </Button>
        </div>

      </div>

    </div>
  );
};
