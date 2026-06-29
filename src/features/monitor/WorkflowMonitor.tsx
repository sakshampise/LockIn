import React, { useState } from 'react';
import { useApp } from '@/store/AppProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, CheckCircle2, AlertCircle, RefreshCw, Box, Server, Database, PlayCircle } from 'lucide-react';
import { relativeTime } from '@/lib/format';
import { enqueueDailyReview, enqueueWeeklyReport } from '@/services/data/enqueueService';
import { Button } from '@/components/ui/Button';

export const WorkflowMonitor: React.FC = () => {
  const { state } = useApp();
  const { workflowRuns } = state;
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'processing': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'queued': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'failed': case 'dead_letter': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'queued': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'failed': case 'dead_letter': return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const selectedJob = workflowRuns.find(r => r.id === selectedRun);

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-8 max-w-6xl mx-auto w-full">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Automation Center
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor real-time AI background workers and job execution timelines.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void enqueueDailyReview()}>
            <PlayCircle className="w-4 h-4 mr-2" />
            Test Daily Review
          </Button>
          <Button variant="outline" size="sm" onClick={() => void enqueueWeeklyReport()}>
            <PlayCircle className="w-4 h-4 mr-2" />
            Test Weekly Report
          </Button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Job List */}
        <div className="w-1/2 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-foreground/5 flex justify-between items-center">
            <span className="font-semibold text-sm">Recent Jobs</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
              {workflowRuns.filter(r => r.status === 'processing' || r.status === 'queued').length} active
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {workflowRuns.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No automation jobs yet.<br/>Trigger one to see real-time processing.
              </div>
            )}
            <AnimatePresence initial={false}>
              {workflowRuns.map(run => (
                <motion.button
                  key={run.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedRun(run.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedRun === run.id 
                      ? 'border-primary/50 bg-primary/5' 
                      : 'border-transparent hover:bg-foreground/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm capitalize">{run.workflowName.replace('_', ' ')}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${getStatusColor(run.status)}`}>
                      {getStatusIcon(run.status)}
                      <span className="capitalize">{run.status}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                    <span className="truncate max-w-[200px]">ID: {run.id.split('-')[0]}...</span>
                    <span>{relativeTime(run.createdAt)}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Timeline Details */}
        <div className="w-1/2 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
          {selectedJob ? (
            <>
              <div className="p-4 border-b border-border bg-foreground/5">
                <h3 className="font-semibold text-sm capitalize mb-1">{selectedJob.workflowName.replace('_', ' ')} Execution</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Server className="w-3 h-3"/> Worker: {selectedJob.workerId || 'Pending'}</span>
                  <span className="flex items-center gap-1"><Database className="w-3 h-3"/> Attempts: {selectedJob.attemptCount}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-background/50">
                <div className="relative pl-6 border-l-2 border-border space-y-6">
                  {selectedJob.logs.map((log: any, idx: number) => {
                    const isError = log.message.toLowerCase().includes('failed') || log.message.toLowerCase().includes('error');
                    
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-card ${
                          isError ? 'bg-rose-500' : 'bg-primary'
                        }`} />
                        <div className="text-xs text-muted-foreground mb-1">{new Date(log.time).toLocaleTimeString()}</div>
                        <div className={`text-sm font-medium ${isError ? 'text-rose-400' : 'text-foreground'}`}>
                          {log.message}
                        </div>
                      </div>
                    );
                  })}
                  
                  {['queued', 'processing'].includes(selectedJob.status) && (
                    <div className="relative">
                       <div className="absolute -left-[31px] w-4 h-4 rounded-full border-4 border-card bg-blue-500 animate-pulse" />
                       <div className="text-xs text-muted-foreground mb-1">In Progress</div>
                       <div className="text-sm font-medium text-foreground flex items-center gap-2">
                         <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                         Waiting for next event...
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Box className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Select a job to view its execution timeline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
