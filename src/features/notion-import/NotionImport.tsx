import React, { useState } from 'react';
import { Upload, FileJson, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/GlassPanel';

type ImportStep = 'upload' | 'mapping' | 'review' | 'done';

interface ImportMapping {
  notionPages: number;
  notionTasks: number;
  mappedPages: number;
  mappedTasks: number;
}

export const NotionImport: React.FC = () => {
  const { setView } = useApp();
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [mapping] = useState<ImportMapping>({ notionPages: 0, notionTasks: 0, mappedPages: 0, mappedTasks: 0 });

  const handleFile = (f: File) => {
    setFile(f);
    setStep('mapping');
  };

  return (
    <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Import from Notion</h1>
        <p className="text-muted-foreground text-sm">Migrate your workspace — API integration coming soon</p>
      </header>

      <div className="flex gap-2 mb-8">
        {(['upload', 'mapping', 'review', 'done'] as ImportStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? 'bg-foreground text-background' : 'bg-accent text-muted-foreground'}`}>
              {i + 1}
            </div>
            <span className={`text-xs capitalize ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            {i < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-8 border-dashed text-center">
            <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Upload Notion Export</h3>
            <p className="text-sm text-muted-foreground mb-6">Export your Notion workspace as Markdown + CSV, then upload the ZIP file.</p>
            <label className="inline-block cursor-pointer">
              <input type="file" accept=".zip,.md,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              <span className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 px-4 py-2 text-sm bg-foreground text-background hover:opacity-90 shadow-sm cursor-pointer">
                Choose File
              </span>
            </label>
          </Card>
          <Card className="p-5 mt-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><FileJson className="w-4 h-4" />Architecture</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Parser service: <code className="text-foreground/70">NotionExportParser</code></li>
              <li>• Page mapper: nested hierarchy → LockIn pages</li>
              <li>• Task extractor: checkbox blocks → LockIn tasks</li>
              <li>• API route: <code className="text-foreground/70">/api/import/notion</code> (future)</li>
            </ul>
          </Card>
        </motion.div>
      )}

      {step === 'mapping' && file && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-5 mb-4">
            <p className="text-sm mb-2">File: <span className="font-medium">{file.name}</span></p>
            <p className="text-xs text-muted-foreground">Parsing export structure…</p>
          </Card>
          <Card className="p-5 mb-4 space-y-3">
            <div className="flex justify-between text-sm"><span>Pages detected</span><span className="font-medium">{mapping.notionPages || '—'}</span></div>
            <div className="flex justify-between text-sm"><span>Tasks detected</span><span className="font-medium">{mapping.notionTasks || '—'}</span></div>
            <div className="flex justify-between text-sm"><span>Hierarchy preserved</span><CheckCircle2 className="w-4 h-4 text-emerald-400/80" /></div>
          </Card>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('upload')}>Back</Button>
            <Button onClick={() => setStep('review')}>Continue</Button>
          </div>
        </motion.div>
      )}

      {step === 'review' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-5 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400/80 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Ready to import</p>
                <p className="text-xs text-muted-foreground">Notion API integration is not yet connected. This preview shows the import flow architecture.</p>
              </div>
            </div>
          </Card>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('mapping')}>Back</Button>
            <Button onClick={() => setStep('done')}>Import (Preview)</Button>
          </div>
        </motion.div>
      )}

      {step === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400/80" />
          <h3 className="text-lg font-semibold mb-2">Import flow ready</h3>
          <p className="text-sm text-muted-foreground mb-6">Connect the Notion API to enable live imports.</p>
          <Button onClick={() => setView('workspace')}>Go to Workspace</Button>
        </motion.div>
      )}
    </div>
  );
};
