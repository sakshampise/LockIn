import React, { useState, useCallback } from 'react';
import { ChevronRight, Plus, FileText, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { cn } from '@/lib/utils';
import type { Page } from '@/types';

const SLASH_COMMANDS = [
  { cmd: 'h1', label: 'Heading 1', prefix: '# ' },
  { cmd: 'h2', label: 'Heading 2', prefix: '## ' },
  { cmd: 'h3', label: 'Heading 3', prefix: '### ' },
  { cmd: 'bullet', label: 'Bullet List', prefix: '- ' },
  { cmd: 'todo', label: 'To-do', prefix: '- [ ] ' },
  { cmd: 'quote', label: 'Quote', prefix: '> ' },
  { cmd: 'code', label: 'Code Block', prefix: '```\n' },
];

function PageTreeItem({ page, pages, depth, activeId, onSelect }: {
  page: Page; pages: Page[]; depth: number; activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const children = pages.filter(p => p.parentId === page.id);
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => onSelect(page.id)}
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-all',
          activeId === page.id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {children.length > 0 && (
          <ChevronRight className={cn('w-3 h-3 shrink-0 transition-transform', open && 'rotate-90')} onClick={e => { e.stopPropagation(); setOpen(o => !o); }} />
        )}
        <span className="truncate">{page.icon ?? '📄'} {page.title}</span>
      </button>
      {open && children.map(c => (
        <PageTreeItem key={c.id} page={c} pages={pages} depth={depth + 1} activeId={activeId} onSelect={onSelect} />
      ))}
    </div>
  );
}

export const Workspace: React.FC = () => {
  const { state, setActivePage, updatePage, addPage, deletePage, startFocus } = useApp();
  const page = state.pages.find(p => p.id === state.activePageId);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleContentChange = useCallback((content: string) => {
    if (!page) return;
    updatePage({ ...page, content, updatedAt: new Date().toISOString() });
  }, [page, updatePage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const val = e.currentTarget.value;
    const pos = e.currentTarget.selectionStart;
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
    const line = val.slice(lineStart, pos);
    if (line === '/') {
      setSlashOpen(true);
      setSlashFilter('');
    } else if (slashOpen) {
      if (e.key === 'Escape') { setSlashOpen(false); return; }
      if (e.key === 'Enter' && slashFilter) {
        e.preventDefault();
        const cmd = SLASH_COMMANDS.find(c => c.cmd.startsWith(slashFilter));
        if (cmd) {
          const before = val.slice(0, lineStart);
          const after = val.slice(pos);
          handleContentChange(before + cmd.prefix + after);
          setSlashOpen(false);
        }
        return;
      }
      if (e.key === 'Backspace' && line === '/') { setSlashOpen(false); return; }
      if (line.startsWith('/')) setSlashFilter(line.slice(1));
    }
  };

  const filtered = SLASH_COMMANDS.filter(c => c.cmd.includes(slashFilter) || c.label.toLowerCase().includes(slashFilter.toLowerCase()));

  return (
    <div className="flex h-full">
      <div className="w-56 border-r border-border p-3 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pages</span>
          <button onClick={() => addPage('Untitled')} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {state.pages.filter(p => !p.parentId).map(p => (
          <PageTreeItem key={p.id} page={p} pages={state.pages} depth={0} activeId={state.activePageId} onSelect={setActivePage} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {page ? (
          <motion.div key={page.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto px-8 py-10">
            <div className="flex items-start justify-between mb-6">
              <input
                value={page.title}
                onChange={e => updatePage({ ...page, title: e.target.value, updatedAt: new Date().toISOString() })}
                className="text-3xl font-bold tracking-tight bg-transparent outline-none w-full"
                placeholder="Untitled"
              />
              <div className="flex gap-2 shrink-0 ml-4">
                <button
                  onClick={() => startFocus(page.id, 'page', page.title)}
                  className="px-3 py-1.5 rounded-lg bg-accent text-xs font-medium hover:bg-accent/80 transition-colors"
                >
                  Focus
                </button>
                <button onClick={() => deletePage(page.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={page.content}
                onChange={e => handleContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[60vh] bg-transparent resize-none outline-none text-[15px] leading-relaxed font-mono text-foreground/90 placeholder:text-muted-foreground/50"
                placeholder="Start writing… Type / for commands"
                spellCheck={false}
              />
              {slashOpen && (
                <div className="absolute left-0 top-8 w-56 rounded-xl border border-border bg-card shadow-xl p-1 z-10">
                  {filtered.map(c => (
                    <button
                      key={c.cmd}
                      onClick={() => {
                        const val = page.content;
                        const pos = textareaRef.current?.selectionStart ?? val.length;
                        const lineStart = val.lastIndexOf('\n', pos - 1) + 1;
                        handleContentChange(val.slice(0, lineStart) + c.prefix + val.slice(pos));
                        setSlashOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent text-left"
                    >
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Select or create a page</p>
            <button onClick={() => addPage('Untitled')} className="mt-4 px-4 py-2 rounded-lg bg-accent text-sm font-medium hover:bg-accent/80">
              New Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
