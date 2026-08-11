import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Terminal, Lock, Mail, User, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 px-4 select-none">
      
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-xl shadow-blue-500/20 mb-4 animate-pulse-slow">
            <Terminal className="h-6 w-6 text-zinc-50" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 mt-0 mb-1">CodexRAG</h1>
          <p className="text-xs text-zinc-400">The Semantic Code Assistant & Developer Workspace</p>
        </div>

        {/* Login Box */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-8 backdrop-blur-md shadow-2xl">
          {/* Mode Selector Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={cn(
                "flex-grow text-xs py-1.5 font-bold rounded text-center transition cursor-pointer",
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
                "flex-grow text-xs py-1.5 font-bold rounded text-center transition cursor-pointer",
                mode === 'register'
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Register
            </button>
          </div>

          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-6 border-b border-zinc-850 pb-3">
            {mode === 'login' ? 'Authenticate Session' : 'Create Developer Account'}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Input Name */}
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
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
                    className="w-full pl-9.5 pr-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-blue-500/80 transition-colors"
                  />
                </div>
                {errors.name && (
                  <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.name.message}</p>
                )}
              </div>
            )}

            {/* Input Email */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-9.5 pr-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-blue-500/80 transition-colors"
                />
              </div>
              {errors.email && (
                <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.email.message}</p>
              )}
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Workspace Token / Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-9.5 pr-4 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-blue-500/80 transition-colors"
                />
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full text-xs font-bold uppercase tracking-wider h-10 mt-6 cursor-pointer"
              isLoading={isLoading}
            >
              {mode === 'login' ? 'Sign In' : 'Register'}
            </Button>
          </form>

          {/* Quick Notice */}
          <div className="mt-5 p-3 rounded-lg bg-zinc-950/60 border border-zinc-850 text-[10px] text-zinc-500 leading-normal space-y-1">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Zero-Retention Security Architecture</span>
            </div>
            <p>
              {mode === 'login' 
                ? 'Sign in to access your dashboard. For maximum privacy, your LLM API keys are never stored on the server and must be configured per browser session in your Profile.' 
                : 'Fill in your name, email, and a password (min 8 characters) to create an account.'}
            </p>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-zinc-600 mt-8">
          CodexRAG v1.0.0 © 2026. Built with React 19 & Tailwind CSS v4.
        </p>
      </div>
    </div>
  );
};
