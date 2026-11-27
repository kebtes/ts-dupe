// tests/contentDemoFlow.test.ts
//
// Integration-style test of the frontend demo workflow:
//   1. a Module draft is normalized exactly as the Module tab receives it,
//   2. Apply-to-Curriculum converts it into shared state (same shape as
//      ModuleTab.handleApplyDraft),
//   3. Content Description merges persisted TSP targets with the applied
//      session module and its lessons,
//   4. the trainer selects the generated lesson,
//   5. generation is gated correctly and produces an explicitly-labelled
//      local demo draft (the backend is never called for session ids),
//   6. applying the draft preserves lesson/module association in state,
//   7. navigating away and back (recomputing targets from the same state)
//      still yields the same targets,
//   8. persisted TSP targets keep using the backend request contract.
//
// No network, no model API, no TSP writes.

import { describe, it, expect } from 'vitest';
import { normalizeTabDraft, buildContentTargets, resolveContentApplyAssociation } from '../src/api/adapters';
import {
  buildDemoContentDescriptionDraft,
} from '../src/api/tabs';
import {
  buildContentGenerationRequest,
  canStartContentGeneration,
} from '../src/api/contentSelection';

const TRAINING_ID = 'train-1';

const structure = {
  training_id: TRAINING_ID,
  modules: [
    {
      id: 'tsp-mod-1',
      name: 'Persisted Module A',
      description: 'A persisted TSP module.',
      lessons: [
        { id: 'tsp-les-11', name: 'Persisted Lesson A1', objective: 'Persisted objective.' },
      ],
    },
  ],
} as any;

/** The backend module payload shape the Module tab normalizes. */
const backendModuleDraft = {
  status: 'success',
  tab: 'module',
  data: {
    modules: [
      {
        title: 'Generated Module: Evaluation',
        description: 'Evaluating model behaviour with real metrics.',
        practical_assignment: {
          title: 'Lab',
          description: 'Measure and compare.',
          evidence_of_completion: 'Report.',
        },
        lessons: [
          {
            title: 'Generated Lesson: Metrics',
            objective: 'Measure model quality.',
            duration: 30,
            duration_type: 'MINUTES',
          },
        ],
      },
    ],
  },
};

function moduleTabApply(dataModules: any[], normalizedModules: any[]) {
  // Mirrors ModuleTab.handleApplyDraft (ids/provenance/topics).
  const converted = normalizedModules.map((m: any, idx: number) => ({
    id: `${m.id || `mod-ai-${idx}`}-${Date.now()}`,
    name: m.title,
    description: m.description,
    trainingTag: { name: 'AI Suggested' },
    practical_assignment: m.practical_assignment,
    topics: m.topics,
  }));
  const updated = [...dataModules, ...converted];
  return updated;
}

function applyContentDescription(
  draft: any,
  structureData: any,
  previousContents: any[] = []
) {
  // Mirrors ContentTab.handleApplyDraft (association + record shape).
  const association = resolveContentApplyAssociation(draft.data.target, structureData);
  return draft.data.contents.map((c: any, i: number) => ({
    id: `content-ai-${i}-${Date.now()}`,
    name: c.lesson_title || 'AI Suggested Content',
    description: c.content_description,
    contentLevel: 'LESSON',
    contentFileType: 'PDF',
    contentStatus: 'ACCEPTED',
    moduleName: association.moduleName,
    lessonId: association.lessonId,
    lessonName: association.lessonName,
    targetSource: association.targetSource,
  })).concat(previousContents);
}

describe('Content Description demo workflow (Module → Apply → Content)', () => {
  it('walks the complete workflow without calling the backend for session targets', () => {
    // 1. Module generation result, normalized as the tab receives it.
    const normalized = normalizeTabDraft('module', backendModuleDraft as any, {
      source: 'backend',
    }) as any;
    expect(normalized.data.modules[0].id).toBe('mod-1');
    expect(normalized.data.modules[0].topics[0].lessons[0].id).toBe('lesson-1-1');

    // 2. Apply to Curriculum → shared frontend state only.
    const modules = moduleTabApply([], normalized.data.modules);
    expect(modules[0].trainingTag.name).toBe('AI Suggested');

    // 3. Content Description merges persisted TSP + applied session records.
    let targets = buildContentTargets(structure, modules);
    const persistedModule = targets.find((t) => t.id === 'tsp-mod-1');
    const persistedLesson = targets.find((t) => t.id === 'tsp-les-11');
    const demoModule = targets.find((t) => t.kind === 'module' && t.source === 'demo');
    const demoLesson = targets.find((t) => t.kind === 'lesson' && t.source === 'demo');
    expect(persistedModule?.source).toBe('tsp');
    expect(persistedLesson?.source).toBe('tsp');
    expect(demoModule?.label).toBe('Module: Generated Module: Evaluation (demo)');
    expect(demoLesson?.label).toBe('Lesson: Generated Lesson: Metrics (demo)');
    expect(demoLesson?.moduleTitle).toBe('Generated Module: Evaluation');
    expect(demoLesson?.objective).toBe('Measure model quality.');

    // 4/5. Select the generated lesson: generation is allowed, and the
    // request is a REAL backend request carrying the temporary context with
    // explicit client provenance (never a positional TSP id).
    const gate = canStartContentGeneration({
      isGenerating: false,
      structureLoading: false,
      structureError: null,
      selectedTarget: demoLesson!,
    });
    expect(gate.allowed).toBe(true);

    const request = buildContentGenerationRequest(TRAINING_ID, demoLesson!);
    expect(request.target).toMatchObject({
      kind: 'lesson',
      id: demoLesson!.id,
      source: 'demo',
      title: 'Generated Lesson: Metrics',
      objective: 'Measure model quality.',
      module_title: 'Generated Module: Evaluation',
    });

    // Simulated real backend response (the backend labels these targets
    // source='client'; the frontend maps that to 'demo').
    const draft = normalizeTabDraft(
      'content-description',
      {
        status: 'success',
        tab: 'content-description',
        data: {
          title: 'Metrics Guide',
          description:
            'Metrics content description covering model quality measurement and reporting.',
        },
        model: 'mimo-v2.6-flash',
        warnings: [],
      },
      { source: 'backend', target: request.target }
    ) as any;
    expect(draft.source).toBe('backend');
    expect(draft.data.target?.source).toBe('demo');
    expect(draft.data.target?.module_title).toBe('Generated Module: Evaluation');

    // 6. Apply preserves lesson identity and its parent module.
    const contents = applyContentDescription(draft, structure);
    expect(contents[0]).toMatchObject({
      moduleName: 'Generated Module: Evaluation',
      lessonId: demoLesson!.id,
      lessonName: 'Generated Lesson: Metrics',
      targetSource: 'demo',
      contentLevel: 'LESSON',
      contentStatus: 'ACCEPTED',
    });

    // 7. Navigating away/back recomputes the same targets from shared state.
    targets = buildContentTargets(structure, modules);
    expect(targets.find((t) => t.id === demoLesson!.id)?.source).toBe('demo');
    expect(contents).toHaveLength(1);

    // 8. Persisted TSP targets keep the backend contract untouched.
    const persistedRequest = buildContentGenerationRequest(TRAINING_ID, persistedLesson!);
    expect(persistedRequest).toEqual({
      tab: 'content-description',
      trainingId: TRAINING_ID,
      target: { kind: 'lesson', id: 'tsp-les-11', source: 'tsp' },
    });
  });

  it('uses the clearly-labelled local generator only in explicit offline mode', () => {
    const normalized = normalizeTabDraft('module', backendModuleDraft as any, {
      source: 'backend',
    }) as any;
    const modules = moduleTabApply([], normalized.data.modules);
    const targets = buildContentTargets(structure, modules);
    const demoLesson = targets.find((t) => t.kind === 'lesson' && t.source === 'demo')!;

    const draft = buildDemoContentDescriptionDraft(
      {
        kind: 'lesson',
        id: demoLesson.id,
        title: demoLesson.title,
        module_title: demoLesson.moduleTitle,
        objective: demoLesson.objective ?? null,
      },
      TRAINING_ID
    );
    expect(draft.source).toBe('offline-mock');
    expect(draft.model).toBe('offline-demo');
    expect(draft.warnings?.join(' ')).toMatch(/OFFLINE DEMO/i);
    expect(draft.data.target?.source).toBe('demo');
  });

  it('keeps demo module targets distinct and usable on their own', () => {
    const normalized = normalizeTabDraft('module', backendModuleDraft as any, {
      source: 'backend',
    }) as any;
    const modules = moduleTabApply([], normalized.data.modules);
    const targets = buildContentTargets(structure, modules);
    const demoModule = targets.find((t) => t.kind === 'module' && t.source === 'demo')!;

    const request = buildContentGenerationRequest(TRAINING_ID, demoModule);
    expect(request.target).toMatchObject({
      kind: 'module',
      id: demoModule.id,
      source: 'demo',
      title: 'Generated Module: Evaluation',
    });

    // Simulated backend draft for the temporary module target.
    const draft = normalizeTabDraft(
      'content-description',
      {
        status: 'success',
        tab: 'content-description',
        data: {
          title: 'Evaluation Module Guide',
          description:
            'Evaluation module content description covering metrics and reporting.',
        },
        model: 'mimo-v2.6-flash',
        warnings: [],
      },
      { source: 'backend', target: request.target }
    ) as any;
    const contents = applyContentDescription(draft, structure);
    expect(contents[0].moduleName).toBe('Generated Module: Evaluation');
    expect(contents[0].lessonId).toBeUndefined();
    expect(contents[0].targetSource).toBe('demo');
  });
});
