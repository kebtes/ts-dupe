// tests/display.test.ts
//
// Tests for the real-record display integration:
//   - uiModulesFromStructure() converts real backend records to UI modules
//   - pingBackend() reports backend reachability (mocked fetch only)

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  uiModulesFromStructure,
  type BackendTrainingStructure,
} from '../src/api/adapters';
import { pingBackend, getApiBase } from '../src/api/tabs';

const structure: BackendTrainingStructure = {
  training_id: 'ea7953f9-e773-4d2c-a895-b8ecf2e969ed',
  title: 'Leyu Data Contributors Training- Amharic',
  modules: [
    {
      id: 'd9953605-95f2-4f66-b677-3a23a0feb581',
      name: 'Module 1: Data Contributor Guideline',
      description: 'Contributor responsibilities.',
      lessons: [
        {
          id: '11621e53-5c20-44e4-bb46-bd66208482ed',
          name: 'Lesson 1: Platform Navigation Video',
          objective: 'Navigate the platform.',
          duration: 1,
          duration_type: 'HOURS',
        },
        {
          id: '4d6d7f05-6d33-4356-8de4-c9a355a144bf',
          name: 'Lesson 2: Data Contributor Orientation',
          objective: null,
          duration: null,
          duration_type: null,
        },
      ],
    },
    {
      id: 'bce7dce5-cfab-46f1-8438-786a5c343e75',
      name: 'Module 2: Digital Literacy',
      description: null,
      lessons: [],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uiModulesFromStructure', () => {
  it('converts real modules, preserving database ids and names', () => {
    const ui = uiModulesFromStructure(structure);
    expect(ui.map((m) => m.id)).toEqual([
      'd9953605-95f2-4f66-b677-3a23a0feb581',
      'bce7dce5-cfab-46f1-8438-786a5c343e75',
    ]);
    expect(ui[0].name).toBe('Module 1: Data Contributor Guideline');
    expect(ui[0].trainingTag.name).toBe('TSP Record');
  });

  it('converts real lessons with all display fields', () => {
    const ui = uiModulesFromStructure(structure);
    expect(ui[0].lessons).toEqual([
      {
        id: '11621e53-5c20-44e4-bb46-bd66208482ed',
        title: 'Lesson 1: Platform Navigation Video',
        objective: 'Navigate the platform.',
        duration: 1,
        duration_type: 'HOURS',
      },
      {
        id: '4d6d7f05-6d33-4356-8de4-c9a355a144bf',
        title: 'Lesson 2: Data Contributor Orientation',
        objective: null,
        duration: null,
        duration_type: null,
      },
    ]);
  });

  it('never invents practical assignments or topics', () => {
    const ui = uiModulesFromStructure(structure);
    for (const mod of ui) {
      expect(mod).not.toHaveProperty('practical_assignment');
      expect(mod).not.toHaveProperty('topics');
    }
  });

  it('returns [] for null/empty structures', () => {
    expect(uiModulesFromStructure(null)).toEqual([]);
    expect(uiModulesFromStructure({ training_id: 'x', modules: [] })).toEqual([]);
  });
});

describe('pingBackend', () => {
  it('returns true when /health responds ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
    );
    expect(await pingBackend()).toBe(true);
    const [url] = (vi.stubGlobal as any).mock ?? [];
    const fetchMock = (globalThis.fetch as any) as ReturnType<typeof vi.fn>;
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toBe(`${getApiBase()}/health`);
  });

  it('returns false when the backend is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    expect(await pingBackend()).toBe(false);
  });

  it('returns false on non-2xx responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 503 }))
    );
    expect(await pingBackend()).toBe(false);
  });
});
