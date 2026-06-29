import React, { useEffect, useState } from 'react';
import { CheckSquare, Plus, Trash2, Play, Calendar, Repeat, ArrowDown, ArrowUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { isAICoachEnabled } from '@/lib/features';
import type { Priority, Recurrence, Task } from '@/types';
import { enqueueTaskBreakdown, enqueueTaskSummary } from '@/services/data/enqueueService';

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-400/80',
  high: 'text-amber-400/80',
  urgent: 'text-red-400/80',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

function TaskRow({ task, onToggle, onDelete, onFocus, onUpdate, onMoveUp, onMoveDown }: {
  task: Task; onToggle: () => void; onDelete: () => void; onFocus: () => void;
  onUpdate: (t: Task) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { state } = useApp();
  const overdue = task.dueDate && !task.done && new Date(task.dueDate) < new Date(new Date().toDateString());
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description ?? '');
  const [breakingDown, setBreakingDown] = useState(false);

  // Find associated breakdown insight
  const breakdownInsight = state.aiInsights.find(i => i.kind === 'task_breakdown' && i.relatedTaskId === task.id);

  useEffect(() => {
    setTitleDraft(task.title);
    setDescriptionDraft(task.description ?? '');
  }, [task.description, task.id, task.title]);

  const commitText = () => {
    const title = titleDraft.trim();
    if (!title) {
      setTitleDraft(task.title);
      return;
    }
    const description = descriptionDraft.trim() ? descriptionDraft : null;
    if (title !== task.title || description !== (task.description ?? null)) {
      onUpdate({ ...task, title, description });
    }
  };

  const commitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commitText();
  };

  const handleBreakdown = async () => {
    setBreakingDown(true);
    try {
      await enqueueTaskBreakdown(task.id);
    } finally {
      setBreakingDown(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <motion.div layout className="flex gap-3 p-3 rounded-xl border border-border bg-card/50 hover:bg-card group transition-all">
        <button
          onClick={onToggle}
          className={cn(
            'mt-1 shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all',
            task.done ? 'bg-foreground border-foreground' : 'border-muted-foreground/30 hover:border-foreground/50'
          )}
        >
          {task.done && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-background"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div className="flex-1 min-w-0">
          <Input
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={commitOnEnter}
            className={cn('h-8 px-0 py-0 border-0 bg-transparent focus:ring-0', task.done && 'line-through text-muted-foreground')}
          />
          <Input
            value={descriptionDraft}
            onChange={e => setDescriptionDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={commitOnEnter}
            placeholder="Add description"
            className="h-7 px-0 py-0 border-0 bg-transparent text-xs text-muted-foreground focus:ring-0"
          />
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn('text-[10px] font-medium uppercase', PRIORITY_COLORS[task.priority])}>{PRIORITY_LABELS[task.priority]}</span>
            <span className={cn('text-[10px] flex items-center gap-0.5', overdue ? 'text-red-400' : 'text-muted-foreground')}>
              <Calendar className="w-2.5 h-2.5" />
              <input
                type="date"
                value={task.dueDate ?? ''}
                onChange={e => onUpdate({ ...task, dueDate: e.target.value || null })}
                className="bg-transparent outline-none"
              />
            </span>
            {task.recurrence !== 'none' && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Repeat className="w-2.5 h-2.5" />{task.recurrence}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1 flex-wrap justify-end">
          <button aria-label="AI task breakdown" title="Breakdown with AI" onClick={handleBreakdown} disabled={breakingDown} className="p-1.5 rounded-lg hover:bg-accent text-primary hover:text-primary/80 disabled:opacity-50"><Sparkles className="w-3.5 h-3.5" /></button>
          <button aria-label="Start focus on this task" onClick={onFocus} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><Play className="w-3.5 h-3.5" /></button>
          <button aria-label="Move task up" onClick={onMoveUp} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><ArrowUp className="w-3.5 h-3.5" /></button>
          <button aria-label="Move task down" onClick={onMoveDown} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><ArrowDown className="w-3.5 h-3.5" /></button>
          <select
            value={task.priority}
            onChange={e => onUpdate({ ...task, priority: e.target.value as Priority })}
            className="text-[10px] bg-transparent text-muted-foreground outline-none cursor-pointer p-0"
          >
            {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
          <select
            value={task.recurrence}
            onChange={e => onUpdate({ ...task, recurrence: e.target.value as Recurrence })}
            className="text-[10px] bg-transparent text-muted-foreground outline-none cursor-pointer p-0"
          >
            {(['none', 'daily', 'weekly', 'monthly'] as Recurrence[]).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </motion.div>
      {breakdownInsight && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pl-11 pr-3 pb-3">
          <div className="bg-accent/10 border border-border/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-semibold text-foreground">AI Breakdown</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{breakdownInsight.summary}</p>
            <ul className="space-y-2">
              {breakdownInsight.recommendations.map((rec, i) => (
                <li key={i} className="text-xs flex items-start gap-2">
                  <div className="w-4 h-4 rounded-sm border border-border flex shrink-0 mt-0.5" />
                  <span className="text-muted-foreground leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export const Tasks: React.FC = () => {
  const { state, addTask, toggleTask, deleteTask, updateTask, reorderTasks, startFocus, generateLocalInsights } = useApp();
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [summarizing, setSummarizing] = useState(false);
  const [prioritizing, setPrioritizing] = useState(false);
  const aiEnabled = isAICoachEnabled();
  const taskSummary = state.aiInsights.find(insight => insight.kind === 'task_summary');

  const tasks = state.tasks.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const doneCount = state.tasks.filter(t => t.done).length;
  const progress = state.tasks.length ? Math.round((doneCount / state.tasks.length) * 100) : 0;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    void addTask(newTitle.trim(), { dueDate: new Date().toISOString().slice(0, 10) });
    setNewTitle('');
  };

  const handleSummarize = async () => {
    if (!aiEnabled) return;
    setSummarizing(true);
    try {
      await enqueueTaskSummary();
    } finally {
      setSummarizing(false);
    }
  };

  const handlePrioritize = async () => {
    if (!aiEnabled) return;
    setPrioritizing(true);
    try {
      await generateLocalInsights('prioritization');
    } finally {
      setPrioritizing(false);
    }
  };

  const moveTask = (taskId: string, direction: -1 | 1) => {
    const ordered = [...state.tasks].sort((a, b) => a.sortOrder - b.sortOrder || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const index = ordered.findIndex(task => task.id === taskId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    void reorderTasks(next.map(task => task.id));
  };

  const prioritizationInsight = state.aiInsights.find(insight => insight.kind === 'prioritization');

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Tasks</h1>
        <p className="text-muted-foreground text-sm">{doneCount} of {state.tasks.length} completed &middot; {progress}%</p>
        <div className="w-full h-1 bg-accent rounded-full mt-3 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-foreground/60 rounded-full" transition={{ duration: 0.6 }} />
        </div>
      </header>

      <div className="flex gap-2 mb-6">
        {(['all', 'active', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors', filter === f ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Add a task…" />
        <Button onClick={handleAdd} size="sm"><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary/70" />
              Task Summary
            </div>
            <Button size="sm" variant="ghost" onClick={handleSummarize} disabled={summarizing || state.tasks.length === 0} className="h-6 text-[10px] px-2">
              {summarizing ? 'Wait...' : 'Generate'}
            </Button>
          </div>
          {taskSummary ? (
            <p className="text-xs text-muted-foreground leading-relaxed">{taskSummary.summary}</p>
          ) : (
            <p className="text-xs text-muted-foreground/60">Generate a high-level summary of your task list.</p>
          )}
        </div>
        
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary/70" />
              Smart Prioritization
            </div>
            <Button size="sm" variant="ghost" onClick={handlePrioritize} disabled={prioritizing || state.tasks.length === 0} className="h-6 text-[10px] px-2">
              {prioritizing ? 'Wait...' : 'Generate'}
            </Button>
          </div>
          {prioritizationInsight ? (
            <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
              <p>{prioritizationInsight.summary}</p>
              {prioritizationInsight.recommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="flex gap-1.5"><span className="text-primary mt-0.5">•</span><span>{rec}</span></div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60">Get AI recommendations on what to tackle next.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => void toggleTask(task.id)}
            onDelete={() => void deleteTask(task.id)}
            onFocus={() => startFocus(task.id, 'task', task.title, 25, 'auto')}
            onUpdate={task => void updateTask(task)}
            onMoveUp={() => moveTask(task.id, -1)}
            onMoveDown={() => moveTask(task.id, 1)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{state.tasks.length === 0 ? 'No tasks yet' : `No ${filter} tasks`}</p>
            <p className="text-xs mt-1">Add a task to plan your next focus session.</p>
          </div>
        )}
      </div>
    </div>
  );
};
