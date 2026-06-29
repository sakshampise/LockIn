import React from 'react';
import { CheckSquare, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { cn } from '@/lib/utils';

export const TasksWidget: React.FC = () => {
  const { state, toggleTask, setView } = useApp();
  const tasks = state.tasks.filter(t => t.dueDate === new Date().toISOString().slice(0, 10) || !t.done).slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="p-5 rounded-2xl border border-border bg-card shadow-sm flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-foreground/5 text-muted-foreground"><CheckSquare className="w-4 h-4" /></div>
          <h3 className="font-medium text-sm text-muted-foreground">Upcoming Tasks</h3>
        </div>
        <button onClick={() => setView('tasks')} className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3 flex-1">
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-3 group">
            <button onClick={() => toggleTask(task.id)} className={cn('mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors', task.done ? 'bg-foreground border-foreground' : 'border-muted-foreground/30 hover:border-foreground/50')}>
              {task.done && <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 text-background"><path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
            <span className={cn('text-sm', task.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{task.title}</span>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="h-full min-h-24 flex flex-col items-center justify-center text-center text-muted-foreground">
            <CheckSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No active tasks</p>
            <button onClick={() => setView('tasks')} className="text-xs mt-1 hover:text-foreground transition-colors">Add one</button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
