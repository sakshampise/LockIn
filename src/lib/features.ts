export function isAICoachEnabled(): boolean {
  return import.meta.env.VITE_AI_COACH_ENABLED !== 'false';
}
