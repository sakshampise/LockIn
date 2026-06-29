/**
 * AIBurnoutBadge
 *
 * Displays the burnout risk status in the Dashboard header.
 * Burnout analysis is now triggered automatically by workflowService on app load.
 * This component is pure display — it reads from state.aiInsights.
 */
import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle, BrainCircuit } from 'lucide-react';
import { useApp } from '@/store/AppProvider';

export const AIBurnoutBadge: React.FC = () => {
  const { state } = useApp();

  const insight = useMemo(
    () => state.aiInsights.find(i => i.kind === 'burnout_detection'),
    [state.aiInsights],
  );

  if (!insight) return null;

  const titleLower = insight.title.toLowerCase();
  const isHighRisk = titleLower.includes('high') || titleLower.includes('warning') || titleLower.includes('elevated');
  const isMediumRisk = titleLower.includes('medium') || titleLower.includes('caution') || titleLower.includes('moderate');

  if (!isHighRisk && !isMediumRisk) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 group relative cursor-help">
        <CheckCircle className="w-3 h-3 text-emerald-400" />
        <span className="text-xs text-emerald-400 font-medium">Low burnout risk</span>
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-card border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
          <p className="text-xs text-muted-foreground">{insight.summary}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border group relative cursor-help ${
      isHighRisk ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'
    }`}>
      <AlertTriangle className={`w-3 h-3 ${isHighRisk ? 'text-red-400' : 'text-amber-400'}`} />
      <span className={`text-xs font-medium ${isHighRisk ? 'text-red-400' : 'text-amber-400'}`}>
        {isHighRisk ? 'High Burnout Risk' : 'Moderate Burnout Risk'}
      </span>
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 p-3 bg-card border border-border rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
        <div className="flex items-center gap-2 mb-2">
          <BrainCircuit className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold">AI Burnout Analysis</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{insight.summary}</p>
        <ul className="text-[10px] text-muted-foreground space-y-1 pl-3 list-disc">
          {insight.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
        </ul>
      </div>
    </div>
  );
};
