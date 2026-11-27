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
      target: { kind: 'module', id: 'mod-real-1' },
    });
  });

  it('clicking Generate for a lesson sends the real lesson id and target type (behavior 8)', () => {
    const request = buildContentGenerationRequest('train-1', {
      kind: 'lesson',
      id: 'les-real-11',
      title: 'Lesson A1',
      label: 'Lesson: Lesson A1',
    });
    expect(request.target).toEqual({ kind: 'lesson', id: 'les-real-11' });
  });

  it('never fabricates ids from titles or array positions (behavior 7/8 contract)', () => {
    const request = buildContentGenerationRequest('train-1', {
      kind: 'lesson',
      id: 'les-real-12',
      title: 'Lesson A2',
      label: 'Lesson: Lesson A2',
    });
    // Exactly the fields the backend requires — nothing reconstructed.
    expect(Object.keys(request.target).sort()).toEqual(['id', 'kind']);
    expect(request.target.id).toBe('les-real-12');
  });
});
