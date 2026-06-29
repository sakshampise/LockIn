import React from 'react';
import { LayoutDashboard, CheckSquare, BrainCircuit, BarChart2, Settings, PenTool, Plus, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import type { ViewId } from '@/types';

const NAV_ITEMS: { icon: typeof LayoutDashboard; label: string; id: ViewId }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: PenTool, label: 'Workspace', id: 'workspace' },
  { icon: CheckSquare, label: 'Tasks', id: 'tasks' },
  { icon: BrainCircuit, label: 'Focus', id: 'focus' },
  { icon: BarChart2, label: 'Analytics', id: 'analytics' },
  { icon: Activity, label: 'Automations', id: 'monitor' },
];

export const Sidebar: React.FC = () => {
  const { state, setView, addPage, setActivePage } = useApp();
  const favorites = state.pages.filter(p => !p.parentId).slice(0, 3);

  return (
    <aside className="w-60 border-r border-border bg-card/20 flex flex-col h-full overflow-y-auto select-none backdrop-blur-xl shrink-0">
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-foreground/10 flex items-center justify-center">
          <BrainCircuit className="w-4 h-4 text-foreground/80" />
        </div>
        <span className="font-semibold text-base tracking-tight">LockIn</span>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
              state.activeView === item.id ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            {state.activeView === item.id && (
              <motion.div layoutId="sidebar-active" className="absolute inset-0 bg-accent rounded-lg" transition={{ type: "spring", stiffness: 400, damping: 35 }} />
            )}
            <item.icon className="w-4 h-4 z-10" />
            <span className="z-10">{item.label}</span>
          </button>
        ))}

        <div className="pt-6 pb-2 px-3 flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          <span>Recent</span>
          <button onClick={() => { addPage('Untitled'); setView('workspace'); }} className="hover:text-foreground transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {favorites.map((page) => (
          <button
            key={page.id}
            onClick={() => { setActivePage(page.id); setView('workspace'); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all truncate"
          >
            <span className="text-xs">{page.icon ?? '📄'}</span>
            <span className="truncate">{page.title}</span>
          </button>
        ))}
      </nav>

      <div className="p-2 mt-auto border-t border-border/50">
        <button
          onClick={() => setView('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            state.activeView === 'settings' ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <div className="mt-2 p-3 rounded-xl bg-accent/30 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-semibold">
            {state.settings.name[0]}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{state.settings.name}</span>
            <span className="text-[10px] text-muted-foreground">Pro</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
