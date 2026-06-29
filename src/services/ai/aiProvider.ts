import { AIInsight, AIInsightKind } from '@/types';

export interface GenerateAIInsightInput {
  kind: AIInsightKind;
  sessionId?: string;
  taskId?: string;
}

export interface AIProvider {
  /**
   * The human-readable name of the provider.
   */
  name: string;
  
  /**
   * Whether this provider is currently available and configured for use.
   */
  isAvailable(): boolean;
  
  /**
   * Generate an insight. Should throw an error if the request fails, 
   * so the manager can fallback to the next provider.
   */
  generateInsight(input: GenerateAIInsightInput): Promise<AIInsight[]>;
}
