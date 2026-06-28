import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppState, FocusPreset, Page, Priority, Recurrence, Task, UserSettings, ViewId } from '@/types';

type FocusSessionConfig = Pick<FocusPreset, 'id' | 'focusDurationMinutes' | 'breakCount' | 'breakDurationMinutes' | 'longBreakDurationMinutes' | 'sessionsBeforeLongBreak'>;
import { useAuth } from '@/services/auth/AuthProvider';
import * as pageService from '@/services/data/pageService';
import * as taskService from '@/services/data/taskService';
import * as profileService from '@/services/data/profileService';
import * as focusPresetService from '@/services/data/focusPresetService';
import * as focusSessionService from '@/services/data/focusSessionService';
import { ensureUserProfile } from '@/services/auth/authService';

const defaultSettings: UserSettings = {
  name: 'User',
  dailyFocusGoalMinutes: 360,
  defaultSessionMinutes: 25,
  theme: 'dark',
};

const initialState: AppState = {
  pages: [],
  tasks: [],
  focusPresets: [],
  sessions: [],
  interruptions: [],
  settings: defaultSettings,
  activeView: 'dashboard',
  activePageId: null,
  activeFocusSessionId: null,
  activeFocusPresetId: null,
  loading: true,
  error: null,
};

interface AppContextValue {
  state: AppState;
  setView: (view: ViewId) => void;
  setActivePage: (pageId: string | null) => void;
  refreshData: () => Promise<void>;
  updatePage: (page: Page) => Promise<void>;
  addPage: (title: string, parentId?: string | null) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  addTask: (title: string, opts?: Partial<Pick<Task, 'priority' | 'dueDate' | 'recurrence' | 'pageId' | 'description'>>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  reorderTasks: (taskIds: string[]) => Promise<void>;
  createFocusPreset: (preset: Omit<FocusPreset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFocusPreset: (preset: FocusPreset) => Promise<void>;
  deleteFocusPreset: (presetId: string) => Promise<void>;
  selectFocusPreset: (presetId: string | null) => void;
  startFocus: (targetId: string, targetType: 'page' | 'task', targetTitle: string, presetId?: string | null, config?: FocusSessionConfig) => Promise<void>;
  endFocus: (completed: boolean, interrupted: boolean, reason?: string) => Promise<void>;
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
      const [settings, pages, tasks, loadedPresets, sessions, interruptions] = await Promise.all([
        profileService.getProfile(user.id),
        pageService.listPages(),
        taskService.listTasks(),
        focusPresetService.listFocusPresets(),
        focusSessionService.listFocusSessions(),
        focusSessionService.listInterruptions(),
      ]);
      const focusPresets = loadedPresets.length > 0
        ? loadedPresets
        : [await focusPresetService.createFocusPreset({
          name: 'Deep Work',
          focusDurationMinutes: settings.defaultSessionMinutes,
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
        settings,
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
  }, [refreshData]);

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

  const addPage = useCallback(async (title: string, parentId: string | null = null) => {
    try {
      const page = await pageService.createPage(title, parentId);
      setState(current => ({ ...current, pages: [...current.pages, page], activePageId: page.id, error: null }));
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not create page.' }));
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

  const startFocus = useCallback(async (targetId: string, targetType: 'page' | 'task', targetTitle: string, presetId?: string | null) => {
    const selectedPresetId = presetId ?? state.activeFocusPresetId ?? getDefaultPresetId(state.focusPresets);
    const preset = state.focusPresets.find(p => p.id === selectedPresetId);
    const durationMinutes = preset?.focusDurationMinutes ?? state.settings.defaultSessionMinutes;

    try {
      const session = await focusSessionService.startFocusSession({
        targetId,
        targetType,
        targetTitle,
        presetId: selectedPresetId,
        durationMinutes,
      });
      setState(current => ({
        ...current,
        sessions: [session, ...current.sessions],
        activeFocusSessionId: session.id,
        activeFocusPresetId: selectedPresetId,
        activeView: 'focus',
        error: null,
      }));
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not start focus session.' }));
    }
  }, [state.activeFocusPresetId, state.focusPresets, state.settings.defaultSessionMinutes]);

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
        error: null,
      }));
    } catch (error) {
      setState(current => ({ ...current, error: error instanceof Error ? error.message : 'Could not end focus session.' }));
    }
  }, [state.activeFocusSessionId, state.sessions]);

  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) return;
    const previous = state.settings;
    const optimistic = { ...previous, ...settings };
    setState(current => ({ ...current, settings: optimistic }));
    try {
      const updated = await profileService.updateProfile(user.id, settings);
      setState(current => ({ ...current, settings: updated, error: null }));
    } catch (error) {
      setState(current => ({ ...current, settings: previous, error: error instanceof Error ? error.message : 'Could not update settings.' }));
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
    updateTask,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
