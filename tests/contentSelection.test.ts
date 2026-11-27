// tests/contentSelection.test.ts
//
// Unit tests for the Content Description workflow decision logic
// (src/api/contentSelection.ts) — the trainer explicitly selects a target
// and explicitly starts generation. Each test maps to a required workflow
// behavior; component wiring is verified in contentTabRender.test.ts.

import { describe, it, expect } from 'vitest';
import {
  resolveContentSelection,
  canStartContentGeneration,
  buildContentGenerationRequest,
  isPersistedContentTarget,
} from '../src/api/contentSelection';
import type { ContentTargetOption } from '../src/api/tabs';

const structureTargets: ContentTargetOption[] = [
  { kind: 'module', id: 'mod-real-1', title: 'Module A', label: 'Module: Module A' },
  { kind: 'lesson', id: 'les-real-11', title: 'Lesson A1', label: 'Lesson: Lesson A1' },
  { kind: 'lesson', id: 'les-real-12', title: 'Lesson A2', label: 'Lesson: Lesson A2' },
  { kind: 'module', id: 'mod-real-2', title: 'Module B', label: 'Module: Module B' },
];

describe('resolveContentSelection (explicit-selection workflow)', () => {
  it('opening the tab does not auto-select a target (behavior 1)', () => {
    // Structure fully loaded, nothing chosen yet by the trainer.
    expect(resolveContentSelection(structureTargets, '')).toBe('');
  });

  it('keeps a selection the trainer explicitly made while it stays valid (behavior 12)', () => {
    expect(resolveContentSelection(structureTargets, 'les-real-12')).toBe('les-real-12');
    expect(resolveContentSelection(structureTargets, 'mod-real-2')).toBe('mod-real-2');
  });

  it('clears a stale selection after switching training contexts (behavior 11)', () => {
    // New training's structure: the previously selected id no longer exists.
    const newTrainingTargets: ContentTargetOption[] = [
      { kind: 'module', id: 'mod-other-9', title: 'New Module', label: 'Module: New Module' },
    ];
    expect(resolveContentSelection(newTrainingTargets, 'mod-real-1')).toBe('');
    // While the new structure is still loading there are no options at all.
    expect(resolveContentSelection([], 'mod-real-1')).toBe('');
  });

  it('clears the selection when the selected target disappeared from the refreshed structure (behavior 11)', () => {
    const refreshed: ContentTargetOption[] = structureTargets.filter(
      (t) => t.id !== 'les-real-11'
    );
    expect(resolveContentSelection(refreshed, 'les-real-11')).toBe('');
  });

  it('resolving a selection is pure: it never creates ids or reads array positions', () => {
    // An id that matches nothing (fabricated or positional) resolves to no
    // selection — never to the first option or a reconstructed id.
    expect(resolveContentSelection(structureTargets, 'mod-fake-999')).toBe('');
    expect(resolveContentSelection(structureTargets, '0')).toBe('');
  });
});

describe('canStartContentGeneration (explicit Generate gating)', () => {
  const ready = {
    isGenerating: false,
    structureLoading: false,
    structureError: null as string | null,
    selectedTarget: structureTargets[0],
  };

  it('Generate stays disabled without a valid selection (behavior 6)', () => {
    const gate = canStartContentGeneration({ ...ready, selectedTarget: null });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('Select a module or lesson');
  });

  it('a generation already in progress blocks duplicate requests (behaviors 9, 10)', () => {
    const gate = canStartContentGeneration({ ...ready, isGenerating: true });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('already in progress');
  });

  it('generation is blocked while the structure is loading (behavior 6)', () => {
    const gate = canStartContentGeneration({ ...ready, structureLoading: true });
    expect(gate.allowed).toBe(false);
  });

  it('generation is blocked when the structure failed to load (behavior 6)', () => {
    const gate = canStartContentGeneration({
      ...ready,
      structureError: 'Training structure unavailable',
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('Cannot generate yet');
  });

  it('generation is allowed only with a loaded structure and an explicit selection', () => {
    expect(canStartContentGeneration(ready).allowed).toBe(true);
  });
});

describe('demo target safety and gating', () => {
  const demoLesson: ContentTargetOption = {
    kind: 'lesson',
    id: 'lesson-1-1',
    title: 'Generated Lesson: Metrics',
    label: 'Lesson: Generated Lesson: Metrics (demo)',
    source: 'demo',
    moduleId: 'mod-1-1700000000000',
    moduleTitle: 'Generated Module: Evaluation',
    objective: 'Measure model quality.',
  };

  it('classifies persisted targets as persisted and session targets as demo', () => {
    expect(isPersistedContentTarget(structureTargets[0])).toBe(true);
    expect(
      isPersistedContentTarget({ ...structureTargets[0], source: 'tsp' })
    ).toBe(true);
    expect(isPersistedContentTarget(demoLesson)).toBe(false);
    expect(isPersistedContentTarget(null)).toBe(false);
  });

  it('builds an explicit client-provided request for a temporary target', () => {
    const request = buildContentGenerationRequest('train-1', demoLesson);
    expect(request).toEqual({
      tab: 'content-description',
      trainingId: 'train-1',
      target: {
        kind: 'lesson',
        id: 'lesson-1-1',
        source: 'demo',
        title: 'Generated Lesson: Metrics',
        objective: 'Measure model quality.',
        description: undefined,
        module_title: 'Generated Module: Evaluation',
        module_description: undefined,
      },
    });
  });

  it('carries lesson/module context for temporary targets', () => {
    const request = buildContentGenerationRequest('train-1', {
      ...demoLesson,
      description: 'Compare metrics across models.',
      moduleDescription: 'Evaluate model behaviour with real metrics.',
    });
    expect(request.target).toMatchObject({
      source: 'demo',
      title: 'Generated Lesson: Metrics',
      objective: 'Measure model quality.',
      description: 'Compare metrics across models.',
      module_title: 'Generated Module: Evaluation',
      module_description: 'Evaluate model behaviour with real metrics.',
    });
  });

  it('allows demo generation while the structure is loading or failed', () => {
    expect(
      canStartContentGeneration({
        isGenerating: false,
        structureLoading: true,
        structureError: null,
        selectedTarget: demoLesson,
      }).allowed
    ).toBe(true);
    expect(
      canStartContentGeneration({
        isGenerating: false,
        structureLoading: false,
        structureError: 'Training structure unavailable',
        selectedTarget: demoLesson,
      }).allowed
    ).toBe(true);
  });

  it('still blocks persisted generation while the structure is unavailable', () => {
    expect(
      canStartContentGeneration({
        isGenerating: false,
        structureLoading: false,
        structureError: 'Training structure unavailable',
        selectedTarget: structureTargets[0],
      }).allowed
    ).toBe(false);
  });

  it('blocks any second click while a generation is in flight', () => {
    expect(
      canStartContentGeneration({
        isGenerating: true,
        structureLoading: false,
        structureError: null,
        selectedTarget: demoLesson,
      }).allowed
    ).toBe(false);
  });
});

describe('buildContentGenerationRequest (request contract)', () => {
  it('clicking Generate for a module sends the real module id and target type (behavior 7)', () => {
    const request = buildContentGenerationRequest('train-1', {
      kind: 'module',
      id: 'mod-real-1',
      title: 'Module A',
      label: 'Module: Module A',
    });
    expect(request).toEqual({
      tab: 'content-description',
      trainingId: 'train-1',
      target: { kind: 'module', id: 'mod-real-1', source: 'tsp' },
    });
  });

  it('clicking Generate for a lesson sends the real lesson id and target type (behavior 8)', () => {
    const request = buildContentGenerationRequest('train-1', {
      kind: 'lesson',
      id: 'les-real-11',
      title: 'Lesson A1',
      label: 'Lesson: Lesson A1',
    });
    expect(request.target).toEqual({
      kind: 'lesson',
      id: 'les-real-11',
      source: 'tsp',
    });
  });

  it('never fabricates ids from titles or array positions (behavior 7/8 contract)', () => {
    const request = buildContentGenerationRequest('train-1', {
      kind: 'lesson',
      id: 'les-real-12',
      title: 'Lesson A2',
      label: 'Lesson: Lesson A2',
    });
    // Persisted targets send only the resolved identity — no client context.
    expect(Object.keys(request.target).sort()).toEqual(['id', 'kind', 'source']);
    expect(request.target).not.toHaveProperty('title');
    expect(request.target).not.toHaveProperty('objective');
    expect(request.target.id).toBe('les-real-12');
  });
});
