import React from 'react';
import { cn } from '../../utils';

interface SkeletonProps {
  className?: string;
}

/** A single shimmer bar */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div
    className={cn(
      'rounded-md animate-shimmer bg-white/[0.03]',
      className
    )}
  />
);

/** Skeleton for a stat card (used on Dashboard) */
export const SkeletonStatCard: React.FC = () => (
  <div className="minimal-card p-4 space-y-3">
    <Skeleton className="h-2.5 w-24" />
    <Skeleton className="h-5 w-16" />
    <Skeleton className="h-2 w-32" />
  </div>
);

/** Skeleton for a repository row in a table */
export const SkeletonTableRow: React.FC = () => (
  <tr>
    <td className="px-5 py-4"><div className="flex items-center gap-2.5"><Skeleton className="h-4 w-4 rounded" /><div className="space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2 w-16" /></div></div></td>
    <td className="px-5 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
    <td className="px-5 py-4"><div className="flex gap-1.5"><Skeleton className="h-5 w-12 rounded" /><Skeleton className="h-5 w-14 rounded" /></div></td>
    <td className="px-5 py-4"><Skeleton className="h-3 w-8" /></td>
    <td className="px-5 py-4"><Skeleton className="h-3 w-12" /></td>
    <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1.5"><Skeleton className="h-6 w-6 rounded" /><Skeleton className="h-6 w-6 rounded" /></div></td>
  </tr>
);

/** Skeleton for a chat session entry in the sidebar */
export const SkeletonSessionItem: React.FC = () => (
  <div className="flex items-start gap-2.5 p-2.5 rounded-lg">
    <Skeleton className="w-4 h-4 rounded flex-shrink-0 mt-0.5" />
    <div className="space-y-1.5 flex-grow">
      <Skeleton className="h-3 w-[80%]" />
      <Skeleton className="h-2 w-[50%]" />
    </div>
  </div>
);

/** Skeleton for a repository card on the Repositories page */
export const SkeletonRepoCard: React.FC = () => (
  <div className="p-4 bg-zinc-900/10 border border-zinc-800/80 rounded-xl space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-20" />
      </div>
    </div>
    <div className="border-t border-zinc-800/40 pt-3 flex gap-4">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-2.5 w-20" />
      <div className="flex-grow" />
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  </div>
);

/** Skeleton for a document table row */
export const SkeletonDocRow: React.FC = () => (
  <tr>
    <td className="py-3 px-3"><div className="flex items-center gap-2.5"><Skeleton className="h-9 w-9 rounded-lg" /><div className="space-y-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-2 w-16" /></div></div></td>
    <td className="py-3 px-3"><Skeleton className="h-3 w-10" /></td>
    <td className="py-3 px-3"><Skeleton className="h-3 w-14" /></td>
    <td className="py-3 px-3"><Skeleton className="h-5 w-16 rounded" /></td>
    <td className="py-3 px-3 text-right"><Skeleton className="h-6 w-6 rounded ml-auto" /></td>
  </tr>
);

/** Skeleton for a memory item */
export const SkeletonMemoryItem: React.FC = () => (
  <div className="p-4 rounded-lg bg-zinc-900/20 border border-zinc-800/40 space-y-2">
    <Skeleton className="h-3 w-[90%]" />
    <Skeleton className="h-3 w-[60%]" />
    <Skeleton className="h-2 w-24 mt-1" />
  </div>
);

/** Full-page skeleton with multiple stat cards */
export const SkeletonDashboard: React.FC = () => (
  <div className="p-6 md:p-8 space-y-8">
    {/* Header skeleton */}
    <div className="flex items-center justify-between border-b border-zinc-800/40 pb-5">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-8 w-32 rounded-md" />
    </div>

    {/* Stat cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>

    {/* Table skeleton */}
    <div className="minimal-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/40">
        <Skeleton className="h-3 w-36" />
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
