import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-lg border border-red-950/40 bg-red-950/5 max-w-md mx-auto my-4',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-950/80 border border-red-900/50 text-red-400 mb-4">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-red-200 mb-1">{title}</h3>
      <p className="text-xs text-red-405 text-red-300 max-w-[280px] leading-normal mb-4">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-red-900/40 hover:bg-red-900/10 text-red-300">
          <RefreshCw className="h-3 w-3 mr-1.5" />
          <span>Retry Request</span>
        </Button>
      )}
    </div>
  );
};
