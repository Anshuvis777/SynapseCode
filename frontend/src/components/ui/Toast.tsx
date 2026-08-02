import React, { useEffect } from 'react';
import { create } from 'zustand';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss
    const duration = toast.duration || 4000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Shortcut hook
export const useToast = () => {
  const addToast = useToastStore((state) => state.addToast);
  const dismissToast = useToastStore((state) => state.dismissToast);
  
  return {
    toast: (title: string, options?: { description?: string; type?: ToastType; duration?: number }) => {
      addToast({
        title,
        description: options?.description,
        type: options?.type || 'info',
        duration: options?.duration,
      });
    },
    dismiss: dismissToast,
  };
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastItemComponent: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const { id, title, description, type } = toast;

  useEffect(() => {
    // Component lifecycle check
  }, []);

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg border shadow-lg bg-zinc-950 pointer-events-auto transition-all duration-300 transform translate-y-0 animate-in slide-in-from-bottom-5',
        type === 'success' && 'border-green-800/80 text-green-200 shadow-green-950/10',
        type === 'error' && 'border-red-800/80 text-red-200 shadow-red-950/10',
        type === 'warning' && 'border-amber-800/80 text-amber-200 shadow-amber-950/10',
        type === 'info' && 'border-blue-900/80 text-blue-200 shadow-blue-950/10'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
        {type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
        {type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
        {type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
      </div>
      <div className="flex-grow">
        <h4 className="text-xs font-semibold">{title}</h4>
        {description && <p className="text-[11px] text-zinc-400 mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 self-start text-zinc-500 hover:text-zinc-300 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
