import React from 'react';
import {
  Settings2,
  Cpu,
  Thermometer,
  Hash,
  Layers,
  Info,
  RotateCcw
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useToast } from '../components/ui/Toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { LLMProvider } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    availableModels,
    availableEmbeddingModels,
    updateSettings,
    getModelsForProvider,
  } = useSettingsStore();

  const { toast } = useToast();

  const providers: { id: LLMProvider; name: string; icon: string; description: string }[] = [
    { id: 'openai', name: 'OpenAI', icon: '🟢', description: 'GPT-4o, GPT-4 Turbo, GPT-3.5' },
    { id: 'anthropic', name: 'Anthropic', icon: '🟠', description: 'Claude 3.5, Claude 3 Opus' },
    { id: 'google', name: 'Google AI', icon: '🔵', description: 'Gemini 1.5 Pro, Gemini Flash' },
    { id: 'ollama', name: 'Ollama (Local)', icon: '🟣', description: 'Llama 3.1, CodeLlama, Qwen' },
  ];

  const currentModels = getModelsForProvider(settings.provider);

  const handleProviderChange = (provider: LLMProvider) => {
    updateSettings({ provider });
    toast('Provider Changed', {
      description: `Switched to ${providers.find((p) => p.id === provider)?.name || provider}`,
      type: 'info',
    });
  };

  const handleResetDefaults = () => {
    updateSettings({
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.2,
      maxTokens: 4096,
      embeddingModel: 'text-embedding-3-small',
    });
    toast('Settings Reset', {
      description: 'All AI settings restored to defaults.',
      type: 'info',
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full overflow-y-auto select-none">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-50">Settings</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure your AI model preferences, inference parameters, and embedding models.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetDefaults}
          className="text-xs gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-3.5 bg-blue-950/20 border border-blue-900/30 text-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-normal">
          <span className="font-bold text-blue-300">Session-Scoped Configuration:</span> These settings are stored in your browser's local storage and persist across sessions. They control which LLM provider and model are used for chat inference and code retrieval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Provider Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                LLM Provider
              </CardTitle>
              <CardDescription>Select the inference backend for chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    settings.provider === provider.id
                      ? 'bg-blue-950/30 border border-blue-900/40 shadow-[0_0_12px_-4px_rgba(59,130,246,0.2)]'
                      : 'bg-zinc-950/40 border border-white/[0.04] hover:border-white/[0.08] hover:bg-zinc-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{provider.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${
                        settings.provider === provider.id ? 'text-blue-300' : 'text-zinc-300'
                      }`}>
                        {provider.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{provider.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Model & Parameters */}
        <div className="lg:col-span-2 space-y-4">

          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-400" />
                Model Configuration
              </CardTitle>
              <CardDescription>Fine-tune inference parameters for your selected provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Model Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Chat Model
                </label>
                <select
                  value={settings.model}
                  onChange={(e) => updateSettings({ model: e.target.value })}
                  className="w-full bg-[#060608] border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-blue-500/50 transition backdrop-blur-sm"
                >
                  {currentModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <span className="text-[9px] text-zinc-500 block">
                  {currentModels.length} models available for {providers.find(p => p.id === settings.provider)?.name}
                </span>
              </div>

              {/* Temperature Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <Thermometer className="w-3 h-3 text-zinc-500" />
                    Temperature
                  </label>
                  <span className="text-xs font-mono text-blue-400 font-bold bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/30">
                    {settings.temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.temperature}
                  onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-500/30 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400"
                />
                <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
                  <span>0.00 — Precise</span>
                  <span>1.00 — Creative</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <Hash className="w-3 h-3 text-zinc-500" />
                  Max Output Tokens
                </label>
                <select
                  value={settings.maxTokens}
                  onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
                  className="w-full bg-[#060608] border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-blue-500/50 transition backdrop-blur-sm"
                >
                  <option value={1024}>1,024 tokens</option>
                  <option value={2048}>2,048 tokens</option>
                  <option value={4096}>4,096 tokens</option>
                  <option value={8192}>8,192 tokens</option>
                  <option value={16384}>16,384 tokens</option>
                  <option value={32768}>32,768 tokens</option>
                </select>
                <span className="text-[9px] text-zinc-500 block">
                  Controls the maximum length of generated responses.
                </span>
              </div>

            </CardContent>
          </Card>

          {/* Embedding Model */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Embedding Model
              </CardTitle>
              <CardDescription>Configure the vector embedding model used for RAG retrieval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Embedding Provider
                </label>
                <select
                  value={settings.embeddingModel}
                  onChange={(e) => updateSettings({ embeddingModel: e.target.value })}
                  className="w-full bg-[#060608] border border-white/[0.06] rounded-lg px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-blue-500/50 transition backdrop-blur-sm"
                >
                  {availableEmbeddingModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <span className="text-[9px] text-zinc-500 block leading-normal">
                  This model generates vector embeddings for your code chunks and documents. Higher-dimensional models provide better recall at the cost of storage.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Config Summary */}
          <div className="glass-card-accent p-4 space-y-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Active Configuration Summary
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Provider', value: providers.find(p => p.id === settings.provider)?.name || settings.provider },
                { label: 'Model', value: availableModels.find(m => m.id === settings.model)?.name || settings.model },
                { label: 'Temperature', value: settings.temperature.toFixed(2) },
                { label: 'Max Tokens', value: settings.maxTokens.toLocaleString() },
              ].map((item) => (
                <div key={item.label} className="space-y-0.5">
                  <p className="text-[9px] text-zinc-500 font-semibold">{item.label}</p>
                  <p className="text-[11px] font-mono font-bold text-zinc-300 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
