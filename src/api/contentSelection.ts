// src/api/contentSelection.ts
//
// Pure decision logic for the Content Description workflow. The trainer
// explicitly selects a target (module or lesson, by real /structure id) and
// explicitly starts generation — nothing is auto-selected and no generation
// request is ever fired as a side effect of loading data or changing a
// selection. Kept free of React/DOM so the workflow rules are unit-testable
// in the repo's plain-node vitest environment.

import type { ContentTargetOption } from './tabs';

/**
 * Resolve the Content Description target selection against the loaded
 * training-structure options.
 *
 * Explicit-selection workflow rules:
 * - NEVER auto-select a target: an empty selection stays empty even when
 *   options are available (the trainer must choose one).
 * - The trainer's selection is kept only while it still exists in the
 *   current options; if the structure reloads, changes, or the selected
 *   target disappeared (e.g. after switching training contexts), the stale
 *   selection is cleared back to ''.
 */
export function resolveContentSelection(
  targetOptions: ContentTargetOption[],
  selectedTargetId: string
): string {
  if (targetOptions.length === 0) return '';
  return targetOptions.some((t) => t.id === selectedTargetId)
    ? selectedTargetId
    : '';
}

export interface ContentGenerationGateState {
  /** A generation request is already in flight. */
  isGenerating: boolean;
  /** The /structure request is still loading. */
  structureLoading: boolean;
  /** The /structure request failed. */
  structureError: string | null;
  /** The trainer's currently selected target (null when none selected). */
  selectedTarget: ContentTargetOption | null;
}

export interface ContentGenerationGate {
  allowed: boolean;
  /** Human-readable explanation when generation is not allowed. */
  reason?: string;
}

/**
 * Decide whether the Generate action may fire. Generation starts only when
 * the structure is loaded, no request is in flight, and a valid target is
 * explicitly selected — one click produces at most one request.
 */
export function canStartContentGeneration(
  state: ContentGenerationGateState
): ContentGenerationGate {
  if (state.isGenerating) {
    return { allowed: false, reason: 'A generation request is already in progress.' };
  }
  if (state.structureError) {
    return {
      allowed: false,
      reason: `Cannot generate yet: ${state.structureError}`,
    };
  }
  if (state.structureLoading) {
    return {
      allowed: false,
      reason:
        'Loading the training structure — select a module or lesson target once it loads.',
    };
  }
  if (!state.selectedTarget) {
    return {
      allowed: false,
      reason: 'Select a module or lesson to generate content for.',
    };
  }
  return { allowed: true };
}

export interface ContentGenerationRequest {
  tab: 'content-description';
  trainingId: string;
  target: { kind: ContentTargetOption['kind']; id: string };
}

/**
 * Build the generation request body exactly as the backend contract
 * requires (POST /v1/training-tabs/content-description): a real record id
 * from /structure plus its kind. IDs are never reconstructed or taken from
 * array positions.
 */
export function buildContentGenerationRequest(
  trainingId: string,
  target: ContentTargetOption
): ContentGenerationRequest {
  return {
    tab: 'content-description',
    trainingId,
    target: { kind: target.kind, id: target.id },
  };
}
