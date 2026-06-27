import React from 'react';
import { Sidebar } from './Sidebar';
import { ContextPanel } from './ContextPanel';
interface AppShellProps {
  children: React.ReactNode;
  hidePanel?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, hidePanel }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-foreground/10">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
      {!hidePanel && <ContextPanel />}
    </div>
  );
};
