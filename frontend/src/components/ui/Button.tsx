import React from 'react';
import { cn } from '../../utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium text-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          // Variants
          variant === 'default' && 'bg-blue-600 text-zinc-50 hover:bg-blue-500 shadow-sm shadow-blue-900/10',
          variant === 'secondary' && 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/50',
          variant === 'outline' && 'border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100',
          variant === 'ghost' && 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
          variant === 'destructive' && 'bg-red-950/80 border border-red-900/50 text-red-200 hover:bg-red-900',
          
          // Sizes
          size === 'default' && 'h-9 px-4 py-2',
          size === 'sm' && 'h-7.5 px-3 rounded text-xs',
          size === 'lg' && 'h-10 px-8 rounded-md',
          size === 'icon' && 'h-9 w-9 p-0',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
