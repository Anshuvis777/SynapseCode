import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Terminal, Lock, Mail, User, ShieldCheck, Code, GitBranch, Database, Sparkles } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

import { cn } from '../utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login, registerUser, isLoading, error } = useUserStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = React.useState<'login' | 'register'>('login');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (mode === 'register' && (!data.name || data.name.trim().length < 2)) {
      toast('Validation Error', { 
        description: 'Developer Name is required and must be at least 2 characters.',
        type: 'error' 
      });
      return;
    }

    let success = false;
    if (mode === 'register') {
      success = await registerUser(data.email, data.name || '', data.password);
    } else {
      success = await login(data.email, data.password);
    }

    if (success) {
      toast(mode === 'register' ? 'Registration Successful' : 'Login Successful', { 
        description: mode === 'register' ? `Account registered and logged in successfully!` : `Welcome back to CodexRAG!`,
        type: 'success' 
      });
      navigate('/dashboard');
    } else {
      toast(mode === 'register' ? 'Registration Failed' : 'Login Failed', { 
        description: error || 'Verify your credentials and try again.',
        type: 'error' 
      });
    }
  };

  const features = [
    { icon: Code, title: 'RAG-Powered Chat', description: 'Ask questions about your codebase with semantic retrieval' },
    { icon: GitBranch, title: 'Git Repository Indexing', description: 'Connect repos and auto-index code into vector embeddings' },
    { icon: Database, title: 'Document Knowledge Bases', description: 'Upload PDFs, Markdown, and DOCX for augmented retrieval' },
    { icon: Sparkles, title: 'Developer Memory', description: 'Persistent AI instructions and project-specific rules' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#060608] select-none">

      {/* ──── LEFT PANEL: Branding & Features ──── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-950/40 via-[#060608] to-purple-950/20" />
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[160px] animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/6 rounded-full blur-[140px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Floating code snippets (decorative) */}
        <div className="absolute top-[12%] left-[8%] opacity-[0.07] text-xs font-mono text-blue-300 leading-relaxed select-none animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <pre>{`async function search(query) {\n  const embeddings = await embed(query);\n  const results = await qdrant.search({\n    vector: embeddings,\n    limit: 10\n  });\n  return results;\n}`}</pre>
        </div>
        <div className="absolute bottom-[15%] right-[10%] opacity-[0.06] text-xs font-mono text-purple-300 leading-relaxed select-none animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <pre>{`class RetrievalService:\n    async def retrieve_context(\n        self, query: str,\n        repo_id: UUID\n    ) -> list[CodeChunk]:\n        return await self.vector_store\n            .search(query)`}</pre>
        </div>

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        {/* Main content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24 max-w-2xl">
          
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
              <Terminal className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">CodexRAG</h1>
              <p className="text-[10px] text-blue-400/80 font-semibold tracking-wider uppercase">Semantic Code Intelligence</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Your AI-powered
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">
              code assistant
            </span>
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-10 max-w-md">
            Index your repositories, upload documentation, and chat with an AI that truly understands your codebase through RAG-powered semantic search.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.05] transition-all duration-300 group animate-fade-in-up"
                  style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-3 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.15)] transition-shadow">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-bold text-zinc-200 mb-1">{feature.title}</h3>
                  <p className="text-[10px] text-zinc-500 leading-normal">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ──── RIGHT PANEL: Auth Form ──── */}
      <div className="flex-grow flex items-center justify-center px-6 lg:px-16 relative">
        
        {/* Mobile-only subtle glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none lg:hidden" />

        <div className="w-full max-w-[400px] z-10">
          
          {/* Mobile-only branding */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-xl shadow-blue-500/20 mb-4">
              <Terminal className="h-6 w-6 text-zinc-50" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50 mb-1">CodexRAG</h1>
            <p className="text-xs text-zinc-400">The Semantic Code Assistant</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-lg font-bold text-zinc-100 mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-xs text-zinc-500">
              {mode === 'login' ? 'Sign in to access your developer workspace' : 'Get started with CodexRAG in seconds'}
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-[#0d0d10]/65 backdrop-blur-xl border border-white/[0.06] rounded-xl p-7 shadow-depth-3">
            
            {/* Mode Selector Tabs */}
            <div className="flex bg-zinc-950/80 p-1 rounded-lg border border-white/[0.04] mb-6">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={cn(
                  "flex-grow text-xs py-2 font-bold rounded-md text-center transition-all duration-200 cursor-pointer",
                  mode === 'login'
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={cn(
                  "flex-grow text-xs py-2 font-bold rounded-md text-center transition-all duration-200 cursor-pointer",
                  mode === 'register'
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Name Input (Register only) */}
              {mode === 'register' && (
                <div className="animate-fade-in-up">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Developer Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      {...register('name')}
                      placeholder="e.g. Ada Lovelace"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-950/80 border border-white/[0.06] rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.name.message}</p>
                  )}
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="dev@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-950/80 border border-white/[0.06] rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.email.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-950/80 border border-white/[0.06] rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] transition-all"
                  />
                </div>
                {errors.password && (
                  <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full text-xs font-bold uppercase tracking-wider h-10 mt-2 cursor-pointer"
                isLoading={isLoading}
              >
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            {/* Privacy Notice */}
            <div className="mt-5 p-3 rounded-lg bg-zinc-950/60 border border-white/[0.04] text-[10px] text-zinc-500 leading-normal space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Zero-Retention Security Architecture</span>
              </div>
              <p>
                {mode === 'login' 
                  ? 'Sign in to access your dashboard. Your LLM API keys are never stored on the server and must be configured per browser session.' 
                  : 'Create an account to get started. Your credentials are encrypted and API keys are stored strictly in your browser.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-zinc-600 mt-6">
            CodexRAG v1.0.0 © 2026 — Built with React 19 & FastAPI
          </p>
        </div>
      </div>
    </div>
  );
};
