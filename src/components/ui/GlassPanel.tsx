import React from 'react';
import { cn } from '@/lib/utils';

export const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn(
    'rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl shadow-glass',
    className
  )}>
    {children}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string; hover?: boolean }> = ({ children, className, hover }) => (
  <div className={cn(
    'rounded-2xl border border-border bg-card shadow-sm',
    hover && 'hover:shadow-md hover:border-muted-foreground/20 transition-all duration-200',
    className
  )}>
    {children}
  </div>
);
