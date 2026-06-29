/**
 * AICoachWidget
 *
 * Displays the latest AI-generated daily review, plus the most recent
 * session reflection as a secondary card.
 *
 * Content auto-populates via background workflows triggered in AppProvider.
 * The "Refresh" button is shown only when content already exists.
 * A skeleton is shown while the background workflow is pending.
 */
import React, { useMemo, useState } from 'react';
import { BrainCircuit, Sparkles, ChevronDown, ChevronUp, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { Button } from '@/components/ui/Button';
import { isAICoachEnabled } from '@/lib/features';
import { relativeTime } from '@/lib/format';
import { enqueueDailyReview } from '@/services/data/enqueueService';

function InsightSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-foreground/8 rounded w-2/3" />
      <div className="h-3 bg-foreground/5 rounded w-full" />
      <div className="h-3 bg-foreground/5 rounded w-5/6" />
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-12 bg-foreground/5 rounded-xl border border-border" />
        ))}
      </div>
    </div>
  );
}

export const AICoachWidget: React.FC = () => {
  const { state } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const aiEnabled = isAICoachEnabled();
  const isProcessing = useMemo(() => {
    return state.workflowRuns.some(
      run => run.workflowName === 'daily_review' && ['queued', 'processing', 'retrying'].includes(run.status)
    );
  }, [state.workflowRuns]);

  const dailyReview = useMemo(
    () => state.aiInsights.find(i => i.kind === 'daily_review'),
    [state.aiInsights],
  );

  const latestReflection = useMemo(
    () => state.aiInsights
      .filter(i => i.kind === 'session_reflection')
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0],
    [state.aiInsights],
  );

  const handleRefresh = async () => {
    if (!aiEnabled || refreshing) return;
    setRefreshing(true);
    try {
      await enqueueDailyReview();
    } finally {
      setRefreshing(false);
    }
  };

  const isLoading = isProcessing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="col-span-12 p-5 rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-foreground/5 text-muted-foreground">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">AI Coach</h3>
            <p className="text-xs text-muted-foreground/70">
              {isLoading ? 'Analyzing your day…' : 'Personalized from your sessions, tasks, and interruptions.'}
            </p>
          </div>
        </div>
        {dailyReview && aiEnabled && (
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh daily review">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Thinking…' : 'Refresh'}
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InsightSkeleton />
          </motion.div>
        ) : dailyReview ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Daily Review */}
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold">{dailyReview.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {dailyReview.confidence !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground font-medium">
                      {Math.round(dailyReview.confidence * 100)}% confidence
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">{relativeTime(dailyReview.generatedAt)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    dailyReview.provider === 'sarvam'
                      ? 'bg-violet-500/10 text-violet-400'
                      : 'bg-foreground/5 text-muted-foreground/60'
                  }`}>
                    {dailyReview.provider === 'sarvam' ? '✦ Sarvam AI' : 'Local'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{dailyReview.summary}</p>
            {dailyReview.recommendations.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  {(expanded ? dailyReview.recommendations : dailyReview.recommendations.slice(0, 3)).map(rec => (
                    <div key={rec} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                      → {rec}
                    </div>
                  ))}
                </div>
                {dailyReview.recommendations.length > 3 && (
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded ? 'Show less' : `Show ${dailyReview.recommendations.length - 3} more`}
                  </button>
                )}
              </>
            )}

            {/* Latest Session Reflection mini-card */}
            {latestReflection && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 pt-4 border-t border-border/50"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3 h-3 text-muted-foreground/60" />
                    <span className="text-xs font-medium text-muted-foreground">Latest Session Reflection</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">{relativeTime(latestReflection.generatedAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">{latestReflection.summary}</p>
                  {latestReflection.recommendations.length > 0 && (
                    <p className="text-[11px] text-muted-foreground/60 mt-1">→ {latestReflection.recommendations[0]}</p>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* AI history */}
            <AnimatePresence>
              {expanded && state.aiInsights.filter(i => i.kind === 'daily_review' && i.id !== dailyReview.id).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-border/50"
                >
                  <p className="text-xs text-muted-foreground mb-3 font-medium">Previous reviews</p>
                  <div className="space-y-2">
                    {state.aiInsights
                      .filter(i => i.kind === 'daily_review' && i.id !== dailyReview.id)
                      .slice(0, 3)
                      .map(prev => (
                        <div key={prev.id} className="flex items-start gap-2 py-1.5">
                          <Sparkles className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-muted-foreground truncate">{prev.title}</p>
                            <p className="text-[10px] text-muted-foreground/50">{relativeTime(prev.generatedAt)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl border border-border bg-background/30 px-4 py-5 text-sm text-muted-foreground">
              {aiEnabled
                ? 'Your daily review is being generated in the background.'
                : 'Enable Cloud AI in Settings to get personalized daily coaching insights.'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
