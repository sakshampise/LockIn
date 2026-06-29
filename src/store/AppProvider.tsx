import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AIInsightKind, AppState, FocusPreset, Page, Priority, Recurrence, Task, UserSettings, ViewId } from '@/types';


import { useAuth } from '@/services/auth/AuthProvider';
import * as pageService from '@/services/data/pageService';
import * as taskService from '@/services/data/taskService';
import * as profileService from '@/services/data/profileService';
import * as focusPresetService from '@/services/data/focusPresetService';
import * as focusSessionService from '@/services/data/focusSessionService';
import * as aiInsightService from '@/services/data/aiInsightService';
import * as enqueueService from '@/services/data/enqueueService';
import * as workflowRunsService from '@/services/data/workflowRunsService';
import { ensureUserProfile } from '@/services/auth/authService';
import { supabase } from '@/lib/supabase/client';

const defaultSettings: UserSettings = {
  name: '',
  dailyFocusGoalMinutes: 120,
  theme: 'dark',
  cloudAiEnabled: true,
};

const initialState: AppState = {
  pages: [],
  tasks: [],
  focusPresets: [],
  sessions: [],
  interruptions: [],
  aiInsights: [],
  workflowRuns: [],
  settings: defaultSettings,
  activeView: 'dashboard',
  activePageId: null,
  activeFocusSessionId: null,
  activeFocusPresetId: null,
  activeFocusSessionPlan: null,
  loading: true,
  error: null,
};

interface AppContextValue {
  state: AppState;
  setView: (view: ViewId) => void;
  setActivePage: (pageId: string | null) => void;
  refreshData: () => Promise<void>;
  updatePage: (page: Page) => Promise<void>;
  addPage: (title: string, parentId?: string | null) => Promise<string>;
  deletePage: (pageId: string) => Promise<void>;
  addTask: (title: string, opts?: Partial<Pick<Task, 'priority' | 'dueDate' | 'recurrence' | 'pageId' | 'description' | 'done'>>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  reorderTasks: (taskIds: string[]) => Promise<void>;
  createFocusPreset: (preset: Omit<FocusPreset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFocusPreset: (preset: FocusPreset) => Promise<void>;
  deleteFocusPreset: (presetId: string) => Promise<void>;
  selectFocusPreset: (presetId: string | null) => void;
  startFocus: (targetId: string, targetType: 'page' | 'task', targetTitle: string, durationMinutes: number, breakMode: 'auto' | 'off') => Promise<void>;
  endFocus: (completed: boolean, interrupted: boolean, reason?: string) => Promise<void>;
  generateLocalInsights: (kind: AIInsightKind, options?: { sessionId?: string; taskId?: string }) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function getDefaultPresetId(presets: FocusPreset[]): string | null {
  return presets.find(preset => preset.isDefault)?.id ?? presets[0]?.id ?? null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(initialState);

  const refreshData = useCallback(async () => {
    if (!user) return;

    setState(current => ({ ...current, loading: true, error: null }));

    try {
      await ensureUserProfile(user.id, user.email, user.user_metadata.display_name as string | undefined);
      const [settings, pages, tasks, loadedPresets, sessions, interruptions, loadedInsights] = await Promise.all([
        profileService.getProfile(user.id),
        pageService.listPages(),
        taskService.listTasks(),
        focusPresetService.listFocusPresets(),
        focusSessionService.listFocusSessions(),
        focusSessionService.listInterruptions(),
        aiInsightService.listAIInsights().catch(() => []),
        workflowRunsService.listWorkflowRuns().catch(() => [])
      ]);
      const focusPresets = loadedPresets.length > 0
        ? loadedPresets
        : [await focusPresetService.createFocusPreset({
          name: 'Focus Configuration',
          focusDurationMinutes: 25,
          breakCount: 3,
          breakDurationMinutes: 5,
          longBreakDurationMinutes: 15,
          sessionsBeforeLongBreak: 4,
          sortOrder: 0,
          isDefault: true,
        })];

      const activeSession = sessions.find(session => !session.endedAt);

      setState(current => ({
        ...current,
        pages,
        tasks,
        focusPresets,
        sessions,
        interruptions,
        aiInsights: loadedInsights,
        workflowRuns: loadedInsights[3] as any || [],
        settings: {
          ...settings,
          cloudAiEnabled: localStorage.getItem('lockin_cloud_ai_enabled') !== 'false'
        },
        activePageId: pages.some(page => page.id === current.activePageId)
          ? current.activePageId
          : pages[0]?.id ?? null,
        activeFocusSessionId: activeSession?.id ?? null,
        activeFocusPresetId: current.activeFocusPresetId ?? getDefaultPresetId(focusPresets),
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState(current => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load workspace data.',
      }));
    }
  }, [user]);

  useEffect(() => {
    void refreshData();

    if (!user) return;
    
    const insightsSub = supabase.channel('ai-insights-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_insights', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        const newInsight = payload.new as any;
        setState(current => ({
          ...current,
          aiInsights: [newInsight, ...current.aiInsights.filter(i => !(i.kind === newInsight.kind && i.kind !== 'session_reflection'))]
        }));
      })
      .subscribe();
      
    const workflowsSub = supabase.channel('workflow-runs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_runs', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        setState(current => {
          if (payload.eventType === 'INSERT') {
            return { ...current, workflowRuns: [payload.new as any, ...current.workflowRuns] };
          }
          if (payload.eventType === 'UPDATE') {
            return { ...current, workflowRuns: current.workflowRuns.map(w => w.id === payload.new.id ? payload.new as any : w) };
          }
          if (payload.eventType === 'DELETE') {
            return { ...current, workflowRuns: current.workflowRuns.filter(w => w.id !== payload.old.id) };
          }
          return current;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(insightsSub);
      supabase.removeChannel(workflowsSub);
    };
  }, [refreshData, user]);

  const setView = useCallback((view: ViewId) => {
    setState(current => ({ ...current, activeView: view }));
  }, []);

  const setActivePage = useCallback((pageId: string | null) => {
    setState(current => ({ ...current, activePageId: pageId }));
  }, []);

  const updatePage = useCallback(async (page: Page) => {
    const previous = state.pages;
    setState(current => ({ ...current, pages: current.pages.map(p => p.id === page.id ? page : p) }));
    try {
      const updated = await pageService.updatePage(page);
      setState(current => ({ ...current, pages: current.pages.map(p => p.id === updated.id ? updated : p), error: null }));
    } catch (error) {
      setState(current => ({ ...current, pages: previous, error: error instanceof Error ? error.message : 'Could not update page.' }));
    }
  }, [state.pages]);

  const addPage = useCallback(async (title: string, parentId: string | null = null): Promise<string> => {
    try {
      const page = await pageService.createPage(title, parentId);
      setState(current => ({ ...current, pages: [...current.pages, page], activePageId: page.id, error: null }));
      return page.id;
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not create page.' }));
      throw error;
    }
  }, []);

  const deletePage = useCallback(async (pageId: string) => {
    const previous = state.pages;
    setState(current => ({
      ...current,
      pages: current.pages.filter(page => page.id !== pageId && page.parentId !== pageId),
      activePageId: current.activePageId === pageId ? null : current.activePageId,
    }));
    try {
      await pageService.deletePage(pageId);
      setState(current => ({ ...current, error: null }));
    } catch (error) {
      setState(current => ({ ...current, pages: previous, error: error instanceof Error ? error.message : 'Could not delete page.' }));
    }
  }, [state.pages]);

  const addTask = useCallback(async (title: string, opts = {}) => {
    try {
      const task = await taskService.createTask(title, {
        priority: 'medium' as Priority,
        dueDate: null,
        recurrence: 'none' as Recurrence,
        sortOrder: state.tasks.length,
        ...opts,
      });
      setState(current => ({ ...current, tasks: [...current.tasks, task], error: null }));
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not create task.' }));
    }
  }, [state.tasks.length]);

  const updateTask = useCallback(async (task: Task) => {
    const previous = state.tasks;
    setState(current => ({ ...current, tasks: current.tasks.map(t => t.id === task.id ? task : t) }));
    try {
      const updated = await taskService.updateTask(task);
      setState(current => ({ ...current, tasks: current.tasks.map(t => t.id === updated.id ? updated : t), error: null }));
    } catch (error) {
      setState(current => ({ ...current, tasks: previous, error: error instanceof Error ? error.message : 'Could not update task.' }));
    }
  }, [state.tasks]);

  const toggleTask = useCallback(async (taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const done = !task.done;
    const updated: Task = { ...task, done, completedAt: done ? new Date().toISOString() : null };
    await updateTask(updated);

    if (done && task.recurrence !== 'none') {
      await addTask(task.title, {
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        recurrence: task.recurrence,
        pageId: task.pageId,
      });
    }
  }, [addTask, state.tasks, updateTask]);

  const deleteTask = useCallback(async (taskId: string) => {
    const previous = state.tasks;
    setState(current => ({ ...current, tasks: current.tasks.filter(task => task.id !== taskId) }));
    try {
      await taskService.deleteTask(taskId);
      setState(current => ({ ...current, error: null }));
    } catch (error) {
      setState(current => ({ ...current, tasks: previous, error: error instanceof Error ? error.message : 'Could not delete task.' }));
    }
  }, [state.tasks]);

  const reorderTasks = useCallback(async (taskIds: string[]) => {
    const byId = new Map(state.tasks.map(task => [task.id, task]));
    const reordered = taskIds
      .map((id, index) => {
        const task = byId.get(id);
        return task ? { ...task, sortOrder: index } : null;
      })
      .filter((task): task is Task => Boolean(task));
    const remaining = state.tasks.filter(task => !taskIds.includes(task.id));
    const previous = state.tasks;
    setState(current => ({ ...current, tasks: [...reordered, ...remaining] }));
    try {
      const updated = await taskService.reorderTasks(reordered);
      setState(current => ({
        ...current,
        tasks: current.tasks.map(task => updated.find(t => t.id === task.id) ?? task),
        error: null,
      }));
    } catch (error) {
      setState(current => ({ ...current, tasks: previous, error: error instanceof Error ? error.message : 'Could not reorder tasks.' }));
    }
  }, [state.tasks]);

  const createFocusPreset = useCallback(async (preset: Omit<FocusPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await focusPresetService.createFocusPreset(preset);
      setState(current => ({
        ...current,
        focusPresets: [...current.focusPresets, created],
        activeFocusPresetId: current.activeFocusPresetId ?? created.id,
        error: null,
      }));
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not create focus preset.' }));
    }
  }, []);

  const updateFocusPreset = useCallback(async (preset: FocusPreset) => {
    const previous = state.focusPresets;
    setState(current => ({ ...current, focusPresets: current.focusPresets.map(p => p.id === preset.id ? preset : p) }));
    try {
      const updated = await focusPresetService.updateFocusPreset(preset);
      setState(current => ({ ...current, focusPresets: current.focusPresets.map(p => p.id === updated.id ? updated : p), error: null }));
    } catch (error) {
      setState(current => ({ ...current, focusPresets: previous, error: error instanceof Error ? error.message : 'Could not update focus preset.' }));
    }
  }, [state.focusPresets]);

  const deleteFocusPreset = useCallback(async (presetId: string) => {
    const previous = state.focusPresets;
    setState(current => ({
      ...current,
      focusPresets: current.focusPresets.filter(preset => preset.id !== presetId),
      activeFocusPresetId: current.activeFocusPresetId === presetId ? getDefaultPresetId(current.focusPresets.filter(p => p.id !== presetId)) : current.activeFocusPresetId,
    }));
    try {
      await focusPresetService.deleteFocusPreset(presetId);
      setState(current => ({ ...current, error: null }));
    } catch (error) {
      setState(current => ({ ...current, focusPresets: previous, error: error instanceof Error ? error.message : 'Could not delete focus preset.' }));
    }
  }, [state.focusPresets]);

  const selectFocusPreset = useCallback((presetId: string | null) => {
    setState(current => ({ ...current, activeFocusPresetId: presetId }));
  }, []);

  const startFocus = useCallback(async (targetId: string, targetType: 'page' | 'task', targetTitle: string, durationMinutes: number, breakMode: 'auto' | 'off') => {
    const presetId = state.activeFocusPresetId ?? getDefaultPresetId(state.focusPresets);
    const plan = { focusDurationMinutes: durationMinutes, breakMode };
    try {
      const session = await focusSessionService.startFocusSession({
        targetId,
        targetType,
        targetTitle,
        presetId,
        durationMinutes,
      });
      setState(current => ({
        ...current,
        sessions: [session, ...current.sessions],
        activeFocusSessionId: session.id,
        activeFocusPresetId: presetId,
        activeFocusSessionPlan: plan,
        activeView: 'focus',
        error: null,
      }));
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not start focus session.' }));
    }
  }, [state.activeFocusPresetId, state.focusPresets]);

  // Use a ref so endFocus always reads latest cloudAiEnabled without stale closure
  const cloudAiEnabledRef = useRef(state.settings.cloudAiEnabled);
  useEffect(() => { cloudAiEnabledRef.current = state.settings.cloudAiEnabled; }, [state.settings.cloudAiEnabled]);

  const endFocus = useCallback(async (completed: boolean, interrupted: boolean, reason?: string) => {
    const session = state.sessions.find(s => s.id === state.activeFocusSessionId);
    if (!session) return;

    try {
      const result = await focusSessionService.endFocusSession({ session, completed, interrupted, reason });
      setState(current => ({
        ...current,
        sessions: current.sessions.map(s => s.id === result.session.id ? result.session : s),
        interruptions: result.interruption ? [result.interruption, ...current.interruptions] : current.interruptions,
        activeFocusSessionId: null,
        activeFocusSessionPlan: null,
        error: null,
      }));

      // Enqueue session reflection asynchronously - backend handles Sarvam directly
      if (cloudAiEnabledRef.current) {
        void enqueueService.enqueueSessionReflection(result.session.id);
      }

    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not end focus session.' }));
    }
  }, [state.activeFocusSessionId, state.sessions]);

  const generateLocalInsights = useCallback(async (kind: AIInsightKind, options?: { sessionId?: string; taskId?: string }) => {
    try {
      const insights = await aiInsightService.generateAIInsight({ kind, ...options });
      if (insights.length > 0) {
        setState(current => {
          // Deduplicate: replace existing insights of same kind (except session_reflection which is per-session)
          const isPerSession = kind === 'session_reflection' && options?.sessionId;
          const filtered = isPerSession
            ? current.aiInsights
            : current.aiInsights.filter(existing => existing.kind !== kind);
          return { ...current, aiInsights: [...insights, ...filtered], error: null };
        });
      }
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not generate AI insights.' }));
    }
  }, [state.settings.cloudAiEnabled]);
  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) return;
    try {
      if (settings.cloudAiEnabled !== undefined) {
        localStorage.setItem('lockin_cloud_ai_enabled', String(settings.cloudAiEnabled));
      }
      
      const { cloudAiEnabled, ...dbSettings } = settings;
      
      let updatedSettings = state.settings;
      if (Object.keys(dbSettings).length > 0) {
        const dbResult = await profileService.updateProfile(user.id, dbSettings);
        updatedSettings = { ...updatedSettings, ...dbResult };
      }
      
      if (settings.cloudAiEnabled !== undefined) {
        updatedSettings.cloudAiEnabled = settings.cloudAiEnabled;
      }
      
      setState(current => ({ ...current, settings: updatedSettings, error: null }));
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not update settings.' }));
    }
  }, [state.settings, user]);

  const value = useMemo<AppContextValue>(() => ({
    state,
    setView,
    setActivePage,
    refreshData,
    updatePage,
    addPage,
    deletePage,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    reorderTasks,
    createFocusPreset,
    updateFocusPreset,
    deleteFocusPreset,
    selectFocusPreset,
    startFocus,
    endFocus,
    generateLocalInsights,
    updateSettings,
  }), [
    addPage,
    addTask,
    createFocusPreset,
    deleteFocusPreset,
    deletePage,
    deleteTask,
    endFocus,
    refreshData,
    reorderTasks,
    selectFocusPreset,
    setActivePage,
    setView,
    startFocus,
    state,
    toggleTask,
    updateFocusPreset,
    updatePage,
    updateSettings,
    generateLocalInsights,
    updateTask,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
