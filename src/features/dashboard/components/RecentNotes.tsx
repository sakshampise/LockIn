import React from 'react';
import { FileText, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { relativeTime } from '@/lib/format';

export const RecentNotes: React.FC = () => {
  const { state, setActivePage, setView } = useApp();
  const notes = [...state.pages].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Recent Notes</h3>
        <button onClick={() => setView('workspace')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">View all</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {notes.map((note) => (
          <div key={note.id} onClick={() => { setActivePage(note.id); setView('workspace'); }}
            className="p-5 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-muted-foreground/20 transition-all cursor-pointer group flex flex-col active:scale-[0.99]">
            <div className="flex items-start justify-between mb-8">
              <div className="p-2 rounded-lg bg-accent text-muted-foreground group-hover:text-foreground transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <button className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
            <div className="mt-auto">
              <h4 className="font-semibold text-base mb-1">{note.title}</h4>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{relativeTime(note.updatedAt)}</span>
                {note.tag && <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-1 rounded bg-accent text-muted-foreground">{note.tag}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
