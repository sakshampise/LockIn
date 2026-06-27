import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './features/dashboard/Dashboard';
import { Workspace } from './features/workspace/Workspace';
import { Tasks } from './features/tasks/Tasks';
import { FocusMode } from './features/focus/FocusMode';
import { Analytics } from './features/analytics/Analytics';
import { Settings } from './features/settings/Settings';
import { NotionImport } from './features/notion-import/NotionImport';
import { AppProvider, useApp } from './store/AppProvider';
import { AuthGate } from './services/auth/AuthGate';
import { AuthProvider } from './services/auth/AuthProvider';
import { Button } from './components/ui/Button';
import type { ViewId } from './types';

const VIEWS: Record<ViewId, React.FC> = {
  dashboard: Dashboard,
  workspace: Workspace,
  tasks: Tasks,
  focus: FocusMode,
  analytics: Analytics,
  settings: Settings,
  'notion-import': NotionImport,
};

function AppContent() {
  const { state, refreshData } = useApp();
  const View = VIEWS[state.activeView] ?? Dashboard;
  const hidePanel = state.activeView === 'focus';

  if (state.loading) {
    return (
      <div className="h-screen w-full bg-background text-foreground flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading workspace</p>
      </div>
    );
  }

  if (state.error && state.pages.length === 0 && state.tasks.length === 0) {
    return (
      <div className="h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold mb-2">Could not load workspace</h1>
          <p className="text-sm text-muted-foreground mb-4">{state.error}</p>
          <Button onClick={() => void refreshData()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell hidePanel={hidePanel}>
      <AnimatePresence mode="wait">
        <motion.div
          key={state.activeView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex-1 flex flex-col min-h-0"
        >
          <View />
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthGate>
    </AuthProvider>
  );
}

export default App;
