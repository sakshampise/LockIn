import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm',
      'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-muted-foreground/50 transition-all',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
