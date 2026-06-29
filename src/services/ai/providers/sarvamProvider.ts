/**
 * SarvamProvider
 *
 * Calls the ai-coach Edge Function. The Edge Function is the only caller
 * of the Sarvam API — this provider is purely a transport layer.
 *
 * Contract with Edge Function:
 *   Success: { success: true, insights: AIInsightRow[] }
 *   Provider failure: { success: false, provider: 'sarvam', error: string }
 *   Infrastructure error: HTTP 500
 *
 * On { success: false }, this provider returns [] so aiInsightService
 * can silently fall back to LocalProvider without throwing.
 * On HTTP 500, we throw so the caller knows it was a real server error.
 */
import { AIInsight } from '@/types';
import { AIProvider, GenerateAIInsightInput } from '../aiProvider';
import { supabase } from '@/lib/supabase/client';
import { mapAIInsight } from '@/services/data/aiInsightService';
import type { Database } from '@/lib/supabase/database.types';

type AIInsightRow = Database['public']['Tables']['ai_insights']['Row'];

type EdgeFunctionResponse =
  | { success: true; insights: AIInsightRow[] }
  | { success: false; provider: string; error: string };

export class SarvamProvider implements AIProvider {
  name = 'Sarvam AI (Cloud)';

  isAvailable(): boolean {
    return true;
  }

  async generateInsight(input: GenerateAIInsightInput): Promise<AIInsight[]> {
    const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>('ai-coach', {
      body: input,
    });

    // HTTP-level error (network failure, 500, auth error) — let it propagate
    // so aiInsightService can log a warning and fall back to local.
    if (error) {
      throw error;
    }

    // Structured provider failure: the Edge Function handled it gracefully.
    // Return [] so aiInsightService falls back to LocalProvider silently.
    if (!data || data.success === false) {
      const reason = (data as { success: false; error?: string } | null)?.error ?? 'Provider returned success:false';
      console.info(`[SarvamProvider] Provider reported failure (${reason}). Falling back to local.`);
      return [];
    }

    if (!data.insights || data.insights.length === 0) {
      // Graceful empty — treat same as provider failure
      console.info('[SarvamProvider] No insights returned. Falling back to local.');
      return [];
    }

    return data.insights.map(mapAIInsight);
  }
}
