import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size = 'default',
  text,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 p-6', className)}>
      <Loader2
        className={cn(
          'animate-spin text-blue-500',
          size === 'sm' && 'w-4 h-4',
          size === 'default' && 'w-8 h-8',
          size === 'lg' && 'w-12 h-12'
        )}
      />
      {text && <p className="text-xs text-zinc-400 font-medium">{text}</p>}
    </div>
  );
};
