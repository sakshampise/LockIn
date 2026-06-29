import React, { useState } from 'react';
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/GlassPanel';
import { parseNotionExport, type ParseResult, type ParsedNotionPage } from '@/services/import/notionParser';

type ImportStep = 'upload' | 'mapping' | 'importing' | 'done';

export const NotionImport: React.FC = () => {
  const { setView, addPage, addTask } = useApp();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, label: '' });

  const handleFile = async (f: File) => {
    setFile(f);
    setStep('mapping');
    setError(null);
    try {
      const result = await parseNotionExport(f);
      setParsedData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse ZIP file');
      setStep('upload');
    }
  };

  const traverseAndImport = async (
    nodes: ParsedNotionPage[], 
    parentId: string | null = null
  ) => {
    for (const node of nodes) {
      setImportProgress(p => ({ ...p, label: `Importing ${node.title}...` }));
      
      const newPageId = await addPage(node.title, parentId);
      
      // Add tasks linked to this page
      for (const task of node.tasks) {
        await addTask(task.title, { done: task.done, pageId: newPageId });
      }
      setImportProgress(p => ({ ...p, current: p.current + 1 }));

      if (node.children.length > 0) {
        await traverseAndImport(node.children, newPageId); 
      }
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setStep('importing');
    
    // Calculate total pages
    const countPages = (nodes: ParsedNotionPage[]): number => {
      return nodes.reduce((acc, node) => acc + 1 + countPages(node.children), 0);
    };
    
    const totalPages = countPages(parsedData.pages);
    setImportProgress({ current: 0, total: totalPages, label: 'Starting import...' });

    try {
      await traverseAndImport(parsedData.pages);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('upload');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Import from Notion</h1>
        <p className="text-muted-foreground text-sm">Migrate your workspace directly from a Notion export</p>
      </header>

      <div className="flex gap-2 mb-8">
        {(['upload', 'mapping', 'importing', 'done'] as ImportStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? 'bg-foreground text-background' : 'bg-accent text-muted-foreground'}`}>
              {i + 1}
            </div>
            <span className={`text-xs capitalize ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            {i < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>
      
      {error && (
        <Card className="p-4 mb-4 bg-red-500/10 border-red-500/20 text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm">{error}</p>
        </Card>
      )}

      {step === 'upload' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-8 border-dashed text-center">
            <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Upload Notion Export</h3>
            <p className="text-sm text-muted-foreground mb-6">Export your Notion workspace as Markdown + CSV, then upload the ZIP file.</p>
            <label className="inline-block cursor-pointer">
              <input type="file" accept=".zip" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <span className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 px-4 py-2 text-sm bg-foreground text-background hover:opacity-90 shadow-sm cursor-pointer">
                Choose .zip File
              </span>
            </label>
          </Card>
          <Card className="p-5 mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><FileJson className="w-4 h-4" />What gets imported?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Page titles and markdown content</li>
              <li>• Page hierarchy (folders mapping to subpages)</li>
              <li>• Checklists inside pages convert to LockIn Tasks</li>
              <li>• Unsupported blocks gracefully fallback to text</li>
            </ul>
          </Card>
        </motion.div>
      )}

      {step === 'mapping' && file && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-5 mb-4">
            <p className="text-sm mb-2">File: <span className="font-medium">{file.name}</span></p>
            {!parsedData ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Parsing export structure…
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Parsing complete
              </div>
            )}
          </Card>
          
          {parsedData && (
            <>
              <Card className="p-5 mb-4 space-y-3">
                <div className="flex justify-between text-sm"><span>Root pages detected</span><span className="font-medium">{parsedData.pages.length}</span></div>
                <div className="flex justify-between text-sm"><span>Tasks detected</span><span className="font-medium">{parsedData.totalTasks}</span></div>
                <div className="flex justify-between text-sm"><span>Local Browser Import</span><CheckCircle2 className="w-4 h-4 text-emerald-400/80" /></div>
              </Card>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('upload')}>Back</Button>
                <Button onClick={handleImport}>Start Import</Button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {step === 'importing' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-5 mb-4">
            <div className="flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-foreground animate-spin shrink-0 mt-0.5" />
              <div className="w-full">
                <p className="text-sm font-medium mb-1">Importing to your workspace...</p>
                <p className="text-xs text-muted-foreground mb-4">{importProgress.label}</p>
                <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-foreground"
                    initial={{ width: 0 }}
                    animate={{ width: `${(importProgress.current / Math.max(1, importProgress.total)) * 100}%` }}
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right mt-1">
                  {importProgress.current} / {importProgress.total} pages
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {step === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400/80" />
          <h3 className="text-lg font-semibold mb-2">Import Complete</h3>
          <p className="text-sm text-muted-foreground mb-6">Your Notion workspace has been successfully migrated to LockIn.</p>
          <Button onClick={() => setView('workspace')}>Go to Workspace</Button>
        </motion.div>
      )}
    </div>
  );
};
