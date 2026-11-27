// src/api/copilot.ts
//
// Interactive Curriculum Designer Copilot API (POST /v1/training-tabs/copilot).
// Ported from main's copilot integration, adapted to the shared client
// conventions: env-driven base URL (VITE_API_BASE via getApiBase), the shared
// default headers (env-driven company id), the configured training id, and
// structured error extraction. The offline fallback behavior is preserved
// from main; its mock drafts come from the shared offline-demo generator and
// are only ever returned as copilot responses (never as live tab drafts).

import type { TabName } from './tabs';
import {
  defaultHeaders,
  extractBackendErrorMessage,
  getActiveTrainingId,
  getApiBase,
  getMockDraft,
} from './tabs';

export interface CopilotChoiceOption {
  id: string;
  label: string;
  description?: string;
  is_recommended?: boolean;
}

export interface CopilotClarification {
  question: string;
  options: CopilotChoiceOption[];
  allow_custom?: boolean;
}

export interface DesignerCopilotRequest {
  training_id: string;
  tab: string;
  user_message?: string;
  selected_option_id?: string;
  current_draft?: any;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface DesignerCopilotResponse {
  status: string;
  response_type: 'CLARIFICATION' | 'UPDATE_DRAFT' | 'CHAT';
  message: string;
  clarification?: CopilotClarification;
  updated_draft?: any;
  model?: string;
}

/** Copilot turns are model-backed like tab generation: allow 120 seconds. */
export const COPILOT_TIMEOUT_MS = 120_000;

/**
 * Send an interactive turn to the Curriculum Designer Copilot.
 */
export async function sendDesignerCopilotTurn(
  req: DesignerCopilotRequest
): Promise<DesignerCopilotResponse> {
  const finalTrainingId = req.training_id?.trim() || getActiveTrainingId();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COPILOT_TIMEOUT_MS);

    const response = await fetch(`${getApiBase()}/v1/training-tabs/copilot`, {
      method: 'POST',
      headers: defaultHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        ...req,
        training_id: finalTrainingId,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(extractBackendErrorMessage(response.status, errorData) || `Copilot turn failed: ${response.status}`);
    }

    return await response.json();
  } catch (err: any) {
    // Only genuine reachability failures get the offline copilot fallback;
    // client-side aborts (timeouts) and real HTTP errors surface as errors.
    if (!isUnreachable(err)) {
      throw err;
    }

    console.warn('[Copilot API] Backend offline. Using client copilot fallback.');
    await new Promise((r) => setTimeout(r, 600));

    if (req.selected_option_id) {
      const mockTab = req.tab as TabName;
      const mockDraft = getMockDraft(mockTab, finalTrainingId);
      return {
        status: 'success',
        response_type: 'UPDATE_DRAFT',
        message: `I've synthesized the initial draft for **${req.tab}** using your selected option. It has been applied to the canvas.`,
        updated_draft: mockDraft.data,
        model: 'mimo-v2.6-flash',
      };
    }

    if (req.user_message && req.current_draft) {
      return {
        status: 'success',
        response_type: 'UPDATE_DRAFT',
        message: `I've updated the draft according to your feedback: "${req.user_message}". Changes are now active on the canvas.`,
        updated_draft: req.current_draft,
        model: 'mimo-v2.6-flash',
      };
    }

    return {
      status: 'success',
      response_type: 'CLARIFICATION',
      message: `I'm ready to assist with the **${req.tab}** section. Let's align on structure before generating:`,
      clarification: {
        question: `How would you like to structure the ${req.tab} section?`,
        options: [
          {
            id: 'opt_mod_5',
            label: '5 Modules (Recommended)',
            description: 'Standard 8-week duration breakdown across core AI topics and projects.',
            is_recommended: true,
          },
          {
            id: 'opt_mod_3',
            label: '3 Modules (Intensive)',
            description: 'Fast-track foundations with larger consolidated milestones.',
            is_recommended: false,
          },
          {
            id: 'opt_mod_6',
            label: '6 Modules (Weekly Sprints)',
            description: 'Weekly sprint breakdown with continuous lab milestones.',
            is_recommended: false,
          },
        ],
        allow_custom: true,
      },
      model: 'mimo-v2.6-flash',
    };
  }
}

/**
 * True only for genuine reachability failures. A client-side abort is NOT a
 * connectivity failure: it must surface as an error, never as offline-demo
 * copilot content.
 */
export function isUnreachable(err: unknown): boolean {
  const e = err as any;
  const message = String(e?.message ?? '');
  return (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Could not connect') ||
    message.includes('fetch failed') ||
    message.includes('load failed')
  );
}
