import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, BrainCircuit } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { Button } from '@/components/ui/Button';

export const SessionReflectionModal: React.FC = () => {
  const { state } = useApp();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // Find the most recent session reflection that was generated in the last 5 minutes
  const recentReflection = useMemo(() => {
    const reflections = state.aiInsights.filter(i => i.kind === 'session_reflection');
    if (reflections.length === 0) return null;
    const latest = reflections[0];
    const ageMinutes = (Date.now() - new Date(latest.generatedAt).getTime()) / 60000;
    if (ageMinutes < 5 && latest.id !== dismissedId) {
      return latest;
    }
    return null;
  }, [state.aiInsights, dismissedId]);

  if (!recentReflection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-accent/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">{recentReflection.title}</h3>
              <p className="text-xs text-muted-foreground">Session Reflection</p>
            </div>
          </div>
          <button 
            onClick={() => setDismissedId(recentReflection.id)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-foreground/90 leading-relaxed mb-6">
            {recentReflection.summary}
          </p>

          <div className="space-y-3">
            {recentReflection.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 bg-background border border-border/50 p-4 rounded-xl">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-accent/5 flex justify-end">
          <Button onClick={() => setDismissedId(recentReflection.id)}>
            Got it
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
