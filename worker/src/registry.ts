import { JobHandler } from './types';
import { dailyReviewHandler } from './jobs/dailyReview';
import { weeklyReportHandler } from './jobs/weeklyReport';
import { sessionReflectionHandler } from './jobs/sessionReflection';
import { burnoutHandler } from './jobs/burnout';
import { cleanupHandler } from './jobs/cleanup';
import { taskBreakdownHandler } from './jobs/taskBreakdown';
import { taskSummaryHandler } from './jobs/taskSummary';

export const jobRegistry: Record<string, JobHandler> = {
  'daily_review': { name: 'daily_review', handle: dailyReviewHandler },
  'weekly_report': { name: 'weekly_report', handle: weeklyReportHandler },
  'session_reflection': { name: 'session_reflection', handle: sessionReflectionHandler },
  'burnout_detection': { name: 'burnout_detection', handle: burnoutHandler },
  'cleanup': { name: 'cleanup', handle: cleanupHandler },
  'task_breakdown': { name: 'task_breakdown', handle: taskBreakdownHandler },
  'task_summary': { name: 'task_summary', handle: taskSummaryHandler },
};
