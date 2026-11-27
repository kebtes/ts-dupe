// tests/contentTabRender.test.ts
//
// Server-side render tests for the Content Description workflow in
// src/components/tabs/ContentTab.tsx. The repo's vitest runs in a plain
// node environment (no jsdom/testing-library), so these use
// react-dom/server to render the component with a synchronously mocked
// training structure. SSR executes no effects — which is exactly the point:
// whatever the rendered markup shows is the pre-effect, open-the-tab state,
// so an auto-selection fallback in render logic or initial state is caught.
//
// NOTE: use vi.mock'd modules (not spies on real ones) — no network and no
// model API calls are made.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const mocks = vi.hoisted(() => ({
  generateTabDraft: vi.fn(),
  getCachedDraft: vi.fn(),
}));

// A real /structure-shaped payload (same shape the backend returns and
// buildContentTargets consumes). Ids are arbitrary — they only need to be
// real-looking record ids.
const fakeStructure = {
  modules: [
    {
      id: 'mod-real-1',
      name: 'Module A',
      lessons: [
        { id: 'les-real-11', name: 'Lesson A1', objective: 'Objective A1' },
        { id: 'les-real-12', name: 'Lesson A2', objective: 'Objective A2' },
      ],
    },
    {
      id: 'mod-real-2',
      name: 'Module B',
      lessons: [],
    },
  ],
} as any;

vi.mock('../src/api/tabs', () => ({
  generateTabDraft: mocks.generateTabDraft,
  getCachedDraft: mocks.getCachedDraft,
  getActiveTrainingId: (id?: string) => id || 'fallback-training',
}));

vi.mock('../src/api/useTrainingStructure', () => ({
  useTrainingStructure: () => ({
    structure: fakeStructure,
    loading: false,
    error: null,
    retry: () => {},
  }),
}));

import { ContentTab } from '../src/components/tabs/ContentTab';

function renderTab() {
  const data = {
    training: { id: 'train-1', title: 'T', rationale: 'R' },
    modules: [{ name: 'Module A' }],
    contents: [],
  } as any;
  return renderToStaticMarkup(
    React.createElement(ContentTab, { data, onUpdateData: undefined })
  );
}

describe('ContentTab open-the-tab state (SSR, structure loaded)', () => {
  beforeEach(() => {
    mocks.generateTabDraft.mockReset();
    mocks.generateTabDraft.mockImplementation(() => {
      throw new Error(
        'generateTabDraft must never be called without an explicit Generate click'
      );
    });
    mocks.getCachedDraft.mockReset();
    mocks.getCachedDraft.mockImplementation(() => Promise.resolve(null));
  });

  it('does not auto-select the first module or lesson as the generation target (behavior 1)', () => {
    const html = renderTab();
    // The placeholder (empty value) is the selected option.
    expect(html).toMatch(/<option value="" disabled="" selected="">/);
    // No real target renders as preselected — the old code fell back to
    // targetOptions[0].id in the select's value, which SSR would expose as
    // `<option value="mod-real-1" selected="">`.
    expect(html).not.toMatch(/<option value="mod-real-1"[^>]*selected/);
    expect(html).not.toMatch(/<option value="les-real-11"[^>]*selected/);
    expect(html).not.toMatch(/<option value="mod-real-2"[^>]*selected/);
  });

  it('does not send a generation request when the tab opens (behavior 2)', () => {
    renderTab();
    expect(mocks.generateTabDraft).not.toHaveBeenCalled();
  });

  it('shows the available module and lesson hierarchy (behavior 3)', () => {
    const html = renderTab();
    expect(html).toContain('Module: Module A');
    expect(html).toContain('Lesson: Lesson A1');
    expect(html).toContain('Lesson: Lesson A2');
    expect(html).toContain('Module: Module B');
  });

  it('shows a clear empty state asking the trainer to select a target (behavior 1)', () => {
    const html = renderTab();
    expect(html).toContain('Select a module or lesson below to generate content for.');
  });

  it('Generate is disabled until a valid target is selected (behavior 6)', () => {
    const html = renderTab();
    // The Generate button renders with the disabled attribute before its
    // label; it is the only disabled <button> in the header.
    const buttonStart = html.indexOf('<button disabled');
    const labelIndex = html.indexOf('Suggest Content with AI');
    expect(buttonStart).toBeGreaterThanOrEqual(0);
    expect(labelIndex).toBeGreaterThan(buttonStart);
    // They belong to the same button (nothing but icon + span in between).
    expect(labelIndex - buttonStart).toBeLessThan(1500);
    expect(html.slice(buttonStart, labelIndex)).not.toContain('</button>');
  });
});

describe('ContentTab session demo targets (applied from the Module tab)', () => {
  const sessionModule = {
    id: 'mod-1-1700000000000',
    name: 'Generated Module: Evaluation',
    trainingTag: { name: 'AI Suggested' },
    topics: [
      {
        title: 'Lessons',
        order: 1,
        lessons: [
          {
            id: 'lesson-1-1',
            title: 'Generated Lesson: Metrics',
            objective: 'Measure model quality.',
          },
          { id: 'lesson-1-2', title: 'Generated Lesson: Error analysis', objective: null },
        ],
      },
    ],
  };

  function renderTabWith(dataModules: any[]) {
    const data = {
      training: { id: 'train-1', title: 'T', rationale: 'R' },
      modules: dataModules,
      contents: [],
    } as any;
    return renderToStaticMarkup(
      React.createElement(ContentTab, { data, onUpdateData: undefined })
    );
  }

  it('lists applied session modules and lessons alongside persisted TSP targets', () => {
    const html = renderTabWith([sessionModule]);
    // Persisted structure targets are still present.
    expect(html).toContain('Module: Module A');
    expect(html).toContain('Lesson: Lesson A1');
    // Session targets appear, clearly labelled demo.
    expect(html).toContain('Module: Generated Module: Evaluation (demo)');
    expect(html).toContain('Lesson: Generated Lesson: Metrics (demo)');
    expect(html).toContain('Lesson: Generated Lesson: Error analysis (demo)');
  });

  it('keeps the explicit-selection workflow: session targets are not auto-selected', () => {
    const html = renderTabWith([sessionModule]);
    expect(html).toMatch(/<option value="" disabled="" selected="">/);
    expect(html).not.toMatch(/<option value="lesson-1-1"[^>]*selected/);
    expect(html).not.toMatch(/<option value="mod-1-1700000000000"[^>]*selected/);
  });

  it('does not leak seeded mock modules into the target list', () => {
    const html = renderTabWith([
      { id: 'mock-id', name: 'Seeded Mock Module', trainingTag: { name: 'Product Specific' } },
    ]);
    expect(html).not.toContain('Seeded Mock Module');
  });
});
