import React from 'react';
import { cn } from '../../utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-white/[0.06] bg-[#0d0d10]/65 backdrop-blur-xl text-zinc-100 transition-all duration-300 ease-out',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_4px_24px_-4px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.3)]',
        'hover:border-white/[0.1] hover:bg-[#111115]/75 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_8px_32px_-4px_rgba(0,0,0,0.6),0_2px_4px_rgba(0,0,0,0.3)]',
        'hover:-translate-y-px',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5 border-b border-white/[0.05]', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base font-semibold leading-none tracking-tight text-zinc-50', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-xs text-zinc-400', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-4', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-5 pt-0 border-t border-white/[0.05]', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';
