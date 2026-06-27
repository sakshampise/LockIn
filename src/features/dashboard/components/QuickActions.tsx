import React from 'react';
import { PenLine, PlayCircle, ListTodo, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';

export const QuickActions: React.FC = () => {
  const { addPage, addTask, setView } = useApp();
  const actions = [
    { icon: PenLine, label: 'New Note', fn: () => { addPage('Untitled'); setView('workspace'); } },
    { icon: PlayCircle, label: 'Start Focus', fn: () => setView('focus') },
    { icon: ListTodo, label: 'Add Task', fn: () => { addTask('New task'); setView('tasks'); } },
    { icon: BarChart2, label: 'Analytics', fn: () => setView('analytics') },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="grid grid-cols-2 gap-3">
      {actions.map((a, i) => (
        <button key={i} onClick={a.fn} className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card hover:bg-accent/40 hover:border-muted-foreground/20 transition-all gap-3 group active:scale-[0.98]">
          <div className="p-3 rounded-full bg-foreground/5 text-muted-foreground group-hover:scale-105 transition-transform duration-300">
            <a.icon className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium">{a.label}</span>
        </button>
      ))}
    </motion.div>
  );
};
