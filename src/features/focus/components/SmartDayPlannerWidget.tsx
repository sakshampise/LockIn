import React, { useMemo, useState } from 'react';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { isAICoachEnabled } from '@/lib/features';
import { relativeTime } from '@/lib/format';

export const SmartDayPlannerWidget: React.FC = () => {
  const { state, generateLocalInsights } = useApp();
  const [pending, setPending] = useState(false);
  const aiEnabled = isAICoachEnabled();

  const insight = useMemo(
    () => state.aiInsights.find(item => item.kind === 'smart_planner'),
    [state.aiInsights],
  );

  const handleGenerate = async () => {
    if (!aiEnabled) return;
    setPending(true);
    try {
      await generateLocalInsights('smart_planner');
    } finally {
      setPending(false);
    }
  };

  return (
    <GlassPanel className="w-full max-w-2xl p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10 flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-foreground/5 text-muted-foreground flex items-center justify-center mb-4">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-medium tracking-tight mb-2">Smart Day Planner</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Let AI analyze your pending tasks, schedule, and energy to build your optimal session plan.
        </p>
      </div>

      <div className="relative z-10">
        {!insight ? (
          <div className="flex justify-center">
            <Button size="lg" onClick={handleGenerate} disabled={pending} className="px-8 shadow-xl shadow-foreground/5">
              <Sparkles className="w-4 h-4 mr-2" />
              {pending ? 'Analyzing your day...' : 'Generate Plan'}
            </Button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-left bg-background/50 border border-border/50 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium">{insight.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">Generated {relativeTime(insight.generatedAt)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={pending}>
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                {pending ? 'Updating...' : 'Refresh'}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {insight.summary}
            </p>

            <div className="space-y-3">
              {insight.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 bg-card border border-border/50 p-4 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
};
