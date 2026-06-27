import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        variant === 'default' && 'bg-foreground text-background hover:opacity-90 shadow-sm',
        variant === 'ghost' && 'hover:bg-accent text-muted-foreground hover:text-foreground',
        variant === 'outline' && 'border border-border bg-transparent hover:bg-accent/50 text-foreground',
        variant === 'danger' && 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
