// tests/tabs.test.ts
//
// Tests for the API client corrections in src/api/tabs.ts:
// target request mapping, flat error parsing, timeouts, and offline mock
// identification. All responses are mocked fetch stubs — no network, no model
// API calls.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  generateTabDraft,
  getCachedDraft,
  extractBackendErrorMessage,
  isBackendUnreachableError,
  pollBackendDraftAfterTimeout,
  GENERATION_TIMEOUT_MS,
  DRAFT_TIMEOUT_MS,
  OFFLINE_MOCK_MODEL,
  OFFLINE_MOCK_WARNING,
  getApiBase,
} from '../src/api/tabs';
import type { BackendTabEnvelope } from '../src/api/adapters';

const moduleEnvelope: BackendTabEnvelope = {
  status: 'success',
  tab: 'module',
  data: {
    modules: [
      {
        title: 'Module 1: Foundations',
        lessons: [
          { title: 'Lesson 1', objective: 'Understand the basics.', duration: 20, duration_type: 'MINUTES' },
        ],
      },
    ],
  },
  model: 'gemma4:31b-cloud',
  warnings: [],
  uncovered_lessons: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 9. Correct target request mapping
// ---------------------------------------------------------------------------

describe('generateTabDraft request mapping', () => {
  it('sends the backend TargetDTO { kind, id } when a target is given', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify(moduleEnvelope), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await generateTabDraft('module', 'train-1', { kind: 'lesson', id: 'lesson-db-42' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${getApiBase()}/v1/training-tabs/module`);
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      training_id: 'train-1',
      target: { kind: 'lesson', id: 'lesson-db-42' },
    });
    // The legacy frontend field names must be gone:
    expect(JSON.stringify(body)).not.toContain('target_type');
    expect(JSON.stringify(body)).not.toContain('target_id');
  });

  it('sends target: null for tabs that do not require targets', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(moduleEnvelope), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await generateTabDraft('module', 'train-1');

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.target).toBeNull();
  });

  it('normalizes the backend module response into the frontend shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(moduleEnvelope), { status: 200 })));

    const result = await generateTabDraft('module', 'train-1');
    expect(result.source).toBe('backend');
    expect(result.data.modules[0].id).toBe('mod-1');
    expect(result.data.modules[0].topics[0].lessons[0].title).toBe('Lesson 1');
  });
});

// ---------------------------------------------------------------------------
// 10. Flat backend error parsing
// ---------------------------------------------------------------------------

describe('extractBackendErrorMessage', () => {
  it('reads the backend flat message field', () => {
    expect(
      extractBackendErrorMessage(422, {
        error_class: 'validation_error',
        message: 'Modules are required before generating Survey questions.',
        request_id: 'req-1',
      })
    ).toBe('Modules are required before generating Survey questions.');
  });

  it('supports the legacy detail shapes as fallbacks', () => {
    expect(extractBackendErrorMessage(422, { detail: { message: 'Legacy detail message.' } })).toBe(
      'Legacy detail message.'
    );
    expect(extractBackendErrorMessage(400, { detail: 'Legacy string detail.' })).toBe(
      'Legacy string detail.'
    );
  });

  it('preserves the status-aware fallback messages', () => {
    expect(extractBackendErrorMessage(422, {})).toBe('Please generate/save the earlier tab first.');
    expect(extractBackendErrorMessage(403, {})).toBe(
      'Only course designers can generate curriculum recommendations.'
    );
    expect(extractBackendErrorMessage(502, {})).toBe('AI model unavailable. Try again in a moment.');
    expect(extractBackendErrorMessage(404, {})).toBe('Generation failed: 404');
  });
});

// ---------------------------------------------------------------------------
// 11. Timeout handling
// ---------------------------------------------------------------------------

describe('timeout configuration', () => {
  it('allows up to 180 seconds for generation (backend model calls take up to ~120s)', () => {
    expect(GENERATION_TIMEOUT_MS).toBe(180_000);
  });

  it('uses a short, appropriate timeout for draft retrieval', () => {
    expect(DRAFT_TIMEOUT_MS).toBe(15_000);
    expect(DRAFT_TIMEOUT_MS).toBeLessThan(GENERATION_TIMEOUT_MS);
  });
});

// ---------------------------------------------------------------------------
// 12. Offline mock identification
// ---------------------------------------------------------------------------

describe('offline fallback identification', () => {
  it('marks unreachable-backend drafts unmistakably as offline mocks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );

    const result = await generateTabDraft('module', 'train-1');

    expect(result.source).toBe('offline-mock');
    expect(result.model).toBe(OFFLINE_MOCK_MODEL);
    expect(result.warnings).toContain(OFFLINE_MOCK_WARNING);
    // Still structurally normalized for the UI:
    expect(result.data.modules).toHaveLength(2);
    expect(result.data.modules[0].topics[0].lessons).toHaveLength(2);
  });

  it('never marks a successful backend response as a mock', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(moduleEnvelope), { status: 200 })));

    const result = await generateTabDraft('module', 'train-1');
    expect(result.source).toBe('backend');
    expect(result.model).toBe('gemma4:31b-cloud');
  });

  it('propagates real backend HTTP errors instead of masking them as mocks', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error_class: 'validation_error', message: 'Modules are required.' }),
          { status: 422 }
        )
      )
    );

    await expect(generateTabDraft('module', 'train-1')).rejects.toThrow('Modules are required.');
  });

  it('reports a client timeout accurately instead of substituting demo content', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        // The generation POST itself hits the client timeout.
        const abort = new Error('This operation was aborted');
        (abort as any).name = 'AbortError';
        throw abort;
      }
      // Draft-cache polls: backend never finishes.
      return new Response('{}', { status: 404 });
    }));
    vi.useFakeTimers();
    try {
      const pending = generateTabDraft('module', 'train-timeout');
      const expectation = expect(pending).rejects.toThrow(
        /AI generation timed out after 180s/
      );
      // Drive the harvest window (600s) forward without real waiting.
      await vi.advanceTimersByTimeAsync(700_000);
      await expectation;
      expect(calls).toBeGreaterThan(2); // it polled instead of giving up
    } finally {
      vi.useRealTimers();
    }
  });

  it('classifies only genuine network failures as unreachable', async () => {
    const abort = new Error('This operation was aborted');
    (abort as any).name = 'AbortError';
    expect(isBackendUnreachableError(abort)).toBe(false);
    expect(isBackendUnreachableError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isBackendUnreachableError(new Error('fetch failed'))).toBe(true);
    expect(isBackendUnreachableError(new Error('Modules are required.'))).toBe(false);
  });

  it('harvests a late real draft from the backend cache after a timeout', async () => {
    // Backend still processing -> 404, then it finishes -> 200 envelope.
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1;
      if (calls < 3) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify(moduleEnvelope), { status: 200 });
    }));

    const result = await pollBackendDraftAfterTimeout('module', 'train-poll', {
      intervalMs: 5, deadlineMs: 200,
    });
    expect(result).not.toBeNull();
    expect(result?.source).toBe('backend');
    expect(result?.tab).toBe('module');
  });

  it('never accepts a local/offline-mock entry as a harvested draft', async () => {
    // Prime the LOCAL cache with an offline mock, then make every backend
    // poll return 404 (which falls back to the local entry internally).
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    await generateTabDraft('module', 'train-poll-mock');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));

    const result = await pollBackendDraftAfterTimeout('module', 'train-poll-mock', {
      intervalMs: 5, deadlineMs: 60,
    });
    expect(result).toBeNull();
  });

  it('returns null when the backend never finishes within the poll window', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    const result = await pollBackendDraftAfterTimeout('assessment', 'train-none', {
      intervalMs: 5, deadlineMs: 60,
    });
    expect(result).toBeNull();
  });

  it('falls back to the local cache on 404 draft retrieval', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));

    // Prime the in-session cache via an offline generation, then retrieve.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    const generated = await generateTabDraft('module', 'train-cache');

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    const cached = await getCachedDraft('module', 'train-cache');
    expect(cached).toEqual(generated);
  });

  it('normalizes and marks a live backend draft retrieval', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ ...moduleEnvelope, training_id: 'train-2', company_id: 'co-1' }),
          { status: 200 }
        )
      )
    );

    const result = await getCachedDraft('module', 'train-2');
    expect(result?.source).toBe('backend');
    expect(result?.training_id).toBe('train-2');
  });
});

// ---------------------------------------------------------------------------
// Malformed HTTP-200 responses are rejected end-to-end
// ---------------------------------------------------------------------------

describe('malformed HTTP-200 handling', () => {
  it('rejects a 200 response with unusable data instead of returning a draft or mock', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ status: 'success', tab: 'assessment', data: {} }), { status: 200 })
      )
    );

    await expect(generateTabDraft('assessment', 'train-1')).rejects.toThrow(
      'Backend returned an unusable assessment draft.'
    );
  });

  it('does not swallow the malformed-200 rejection into the offline mock path', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: 'success', tab: 'survey', data: { sections: [] } }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    let caught: unknown = null;
    try {
      await generateTabDraft('survey', 'train-1');
    } catch (err) {
      caught = err;
    }
    expect((caught as Error)?.message).toBe('Backend returned an unusable survey draft.');
    // The offline mock generator must not have produced a substitute draft:
    expect((caught as { name?: string })?.name).toBe('DraftValidationError');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still normalizes a valid 200 response into a draft', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: 'success',
            tab: 'assessment',
            data: {
              sections: [
                { title: 'Knowledge Check', questions: [{ prompt: 'Q?', type: 'MULTIPLE_CHOICE', options: ['a', 'b'], correct_answer: 'a' }] },
              ],
              module_rubrics: [],
            },
          }),
          { status: 200 }
        )
      )
    );

    const result = await generateTabDraft('assessment', 'train-1');
    expect(result.source).toBe('backend');
    expect(result.data.questions).toHaveLength(1);
  });
});
