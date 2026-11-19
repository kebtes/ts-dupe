// tests/structure.test.ts
//
// Tests for the read-only training structure integration:
//   - getTrainingStructure() request construction and error behavior
//   - buildContentTargets() mapping real module/lesson records to targets
//
// All fetch calls are mocked. No network, no model API, no generation.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getTrainingStructure,
  getApiBase,
  setEnvReaderForTests,
  generateTabDraft,
} from '../src/api/tabs';
import { buildContentTargets, type BackendTrainingStructure } from '../src/api/adapters';

const TRAINING_ID = 'ea7953f9-e773-4d2c-a895-b8ecf2e969ed';
const COMPANY_ID = '816e9eab-f109-4de2-b7aa-154f8cb2ac67';

const structure: BackendTrainingStructure = {
  training_id: TRAINING_ID,
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
          duration: 20,
          duration_type: 'MINUTES',
        },
      ],
    },
    {
      id: 'bce7dce5-cfab-46f1-8438-786a5c343e75',
      name: 'Module 2: Digital Literacy',
      description: null,
      lessons: [
        {
          id: '20f19f43-647f-47f9-8162-d7571f8926b6',
          name: 'Lesson 1: Mobile Phone Usage Fundamentals',
          objective: null,
          duration: 45,
          duration_type: 'MINUTES',
        },
        {
          id: 'e855e556-bd41-4857-b059-89f19010599a',
          name: 'Lesson 7: Online Jobs',
          objective: null,
          duration: null,
          duration_type: null,
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  setEnvReaderForTests(null);
});

// ---------------------------------------------------------------------------
// buildContentTargets — real records in, real targets out
// ---------------------------------------------------------------------------

describe('buildContentTargets', () => {
  it('builds module targets from actual returned module ids', () => {
    const targets = buildContentTargets(structure);
    const moduleTargets = targets.filter((t) => t.kind === 'module');
    expect(moduleTargets.map((t) => t.id)).toEqual([
      'd9953605-95f2-4f66-b677-3a23a0feb581',
      'bce7dce5-cfab-46f1-8438-786a5c343e75',
    ]);
    expect(moduleTargets[0].label).toBe('Module: Module 1: Data Contributor Guideline');
  });

  it('builds lesson targets from actual returned lesson ids', () => {
    const targets = buildContentTargets(structure);
    const lessonTargets = targets.filter((t) => t.kind === 'lesson');
    expect(lessonTargets.map((t) => t.id)).toEqual([
      '11621e53-5c20-44e4-bb46-bd66208482ed',
      '20f19f43-647f-47f9-8162-d7571f8926b6',
      'e855e556-bd41-4857-b059-89f19010599a',
    ]);
    expect(lessonTargets[0].label).toBe('Lesson: Lesson 1: Platform Navigation Video');
  });

  it('contains no mock ids — only ids present in the structure', () => {
    const targets = buildContentTargets(structure);
    const valid = new Set([
      ...structure.modules.map((m) => m.id),
      ...structure.modules.flatMap((m) => m.lessons.map((l) => l.id)),
    ]);
    for (const target of targets) {
      expect(valid.has(target.id)).toBe(true);
    }
    expect(targets.some((t) => t.id === 'bb84e997-1451-4006-bf69-4784eded0786')).toBe(false);
  });

  it('returns [] for null structure and structures without modules', () => {
    expect(buildContentTargets(null)).toEqual([]);
    expect(buildContentTargets({ training_id: TRAINING_ID, modules: [] })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getTrainingStructure — request construction and failure behavior
// ---------------------------------------------------------------------------

describe('getTrainingStructure', () => {
  it('requests the configured training id with designer dev headers', async () => {
    setEnvReaderForTests((name) =>
      name === 'VITE_TSP_COMPANY_ID' ? COMPANY_ID : undefined
    );
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify(structure), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getTrainingStructure(TRAINING_ID);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${getApiBase()}/v1/curriculum/${TRAINING_ID}/structure`);
    expect(init.method).toBe('GET');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-TSP-Role']).toBe('designer');
    expect(headers['X-TSP-Company-ID']).toBe(COMPANY_ID);
    expect(headers['X-TSP-User-ID']).toBe('designer-1');
    expect(result.training_id).toBe(TRAINING_ID);
    expect(result.modules).toHaveLength(2);
  });

  it('rejects a response whose training_id does not match the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ training_id: 'other-id', modules: [] }),
          { status: 200 }
        )
      )
    );
    await expect(getTrainingStructure(TRAINING_ID)).rejects.toThrow(
      /does not match the requested training/
    );
  });

  it('surfaces backend errors without any mock fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error_class: 'not_found',
            message: 'Training ea7953f9 was not found in TSP.',
          }),
          { status: 404 }
        )
      )
    );
    await expect(getTrainingStructure(TRAINING_ID)).rejects.toThrow(
      /was not found in TSP/
    );
  });

  it('fails clearly when the backend is unreachable — no mock targets', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(getTrainingStructure(TRAINING_ID)).rejects.toThrow(
      /unreachable/
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Generation payload unchanged when driven by structure targets
// ---------------------------------------------------------------------------

describe('generation payload with structure targets', () => {
  it('sends the same { training_id, target: { kind, id } } payload', async () => {
    setEnvReaderForTests((name) =>
      name === 'VITE_TSP_COMPANY_ID' ? COMPANY_ID : undefined
    );
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      new Response(
        JSON.stringify({
          status: 'success',
          tab: 'content-description',
          data: { description: 'x' },
          warnings: [],
          model: 'test',
          request_id: 'req-1',
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const targets = buildContentTargets(structure);
    const lessonTarget = targets.find((t) => t.kind === 'lesson')!;
    await generateTabDraft(
      'content-description',
      TRAINING_ID,
      { kind: lessonTarget.kind, id: lessonTarget.id }
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.training_id).toBe(TRAINING_ID);
    expect(body.target).toEqual({
      kind: 'lesson',
      id: '11621e53-5c20-44e4-bb46-bd66208482ed',
    });
  });
});
