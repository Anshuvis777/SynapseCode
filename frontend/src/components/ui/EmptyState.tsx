import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/10 max-w-md mx-auto my-4',
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 mb-4 shadow-sm">
        <Icon className="h-5 w-5 text-zinc-300" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h3>
      <p className="text-xs text-zinc-450 text-zinc-400 max-w-[280px] leading-normal mb-4">
        {description}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
