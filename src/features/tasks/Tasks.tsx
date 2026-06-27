import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, Play, Calendar, Repeat, ArrowDown, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Priority, Recurrence, Task } from '@/types';

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
  const overdue = task.dueDate && !task.done && new Date(task.dueDate) < new Date(new Date().toDateString());
  return (
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
          value={task.title}
          onChange={e => onUpdate({ ...task, title: e.target.value })}
          className={cn('h-8 px-0 py-0 border-0 bg-transparent focus:ring-0', task.done && 'line-through text-muted-foreground')}
        />
        <Input
          value={task.description ?? ''}
          onChange={e => onUpdate({ ...task, description: e.target.value || null })}
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
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
        <button onClick={onFocus} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><Play className="w-3.5 h-3.5" /></button>
        <button onClick={onMoveUp} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><ArrowUp className="w-3.5 h-3.5" /></button>
        <button onClick={onMoveDown} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"><ArrowDown className="w-3.5 h-3.5" /></button>
        <select
          value={task.priority}
          onChange={e => onUpdate({ ...task, priority: e.target.value as Priority })}
          className="text-[10px] bg-transparent text-muted-foreground outline-none cursor-pointer"
        >
          {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </select>
        <select
          value={task.recurrence}
          onChange={e => onUpdate({ ...task, recurrence: e.target.value as Recurrence })}
          className="text-[10px] bg-transparent text-muted-foreground outline-none cursor-pointer"
        >
          {(['none', 'daily', 'weekly', 'monthly'] as Recurrence[]).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </motion.div>
  );
}

export const Tasks: React.FC = () => {
  const { state, addTask, toggleTask, deleteTask, updateTask, reorderTasks, startFocus } = useApp();
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

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

  const moveTask = (taskId: string, direction: -1 | 1) => {
    const ordered = [...state.tasks].sort((a, b) => a.sortOrder - b.sortOrder || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const index = ordered.findIndex(task => task.id === taskId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    void reorderTasks(next.map(task => task.id));
  };

  return (
    <div className="flex-1 p-8 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Tasks</h1>
        <p className="text-muted-foreground text-sm">{doneCount} of {state.tasks.length} completed · {progress}%</p>
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

      <div className="space-y-2">
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => void toggleTask(task.id)}
            onDelete={() => void deleteTask(task.id)}
            onFocus={() => void startFocus(task.id, 'task', task.title)}
            onUpdate={task => void updateTask(task)}
            onMoveUp={() => moveTask(task.id, -1)}
            onMoveDown={() => moveTask(task.id, 1)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tasks yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
