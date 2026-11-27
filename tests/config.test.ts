// tests/config.test.ts
//
// Tests for the demo wiring: VITE_TRAINING_ID / VITE_TSP_COMPANY_ID resolve
// into generation requests and headers. All fetch calls are mocked.
// Vitest gives each module its own import.meta.env object, so the suite drives
// the API client through its documented env-reader test hook instead of
// mutating import.meta.env across module boundaries.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateTabDraft,
  getActiveTrainingId,
  getApiBase,
  getCompanyId,
  isConfiguredTrainingOverride,
  setEnvReaderForTests,
} from '../src/api/tabs';

const TRAINING_ID = 'ea7953f9-e773-4d2c-a895-b8ecf2e969ed';
const COMPANY_ID = '816e9eab-f109-4de2-b7aa-154f8cb2ac67';
const LEGACY_ID = 'd734b694-0802-4a4a-8a51-eaa693a10abd';

const moduleEnvelope = {
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
};

const fixtureEnv: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(fixtureEnv)) delete fixtureEnv[key];
  setEnvReaderForTests((name: string) => fixtureEnv[name]);
});

afterEach(() => {
  setEnvReaderForTests(null);
  vi.unstubAllGlobals();
});

describe('training id wiring', () => {
  it('prefers VITE_TRAINING_ID over the displayed demo record', () => {
    fixtureEnv['VITE_TRAINING_ID'] = TRAINING_ID;
    expect(getActiveTrainingId(LEGACY_ID)).toBe(TRAINING_ID);
    expect(isConfiguredTrainingOverride(LEGACY_ID)).toBe(true);
  });

  it('uses the displayed record when VITE_TRAINING_ID is unset', () => {
    expect(getActiveTrainingId(LEGACY_ID)).toBe(LEGACY_ID);
    expect(isConfiguredTrainingOverride(LEGACY_ID)).toBe(false);
  });

  it('falls back to the legacy demo training when nothing is configured', () => {
    expect(getActiveTrainingId()).toBe(LEGACY_ID);
  });

  it('generation requests use VITE_TRAINING_ID when configured', async () => {
    fixtureEnv['VITE_TRAINING_ID'] = TRAINING_ID;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(moduleEnvelope), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    // Components resolve the id through getActiveTrainingId before calling.
    await generateTabDraft('module', getActiveTrainingId(LEGACY_ID));

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.training_id).toBe(TRAINING_ID);
  });
});

describe('company id wiring', () => {
  it('company header comes from VITE_TSP_COMPANY_ID', () => {
    fixtureEnv['VITE_TSP_COMPANY_ID'] = COMPANY_ID;
    expect(getCompanyId()).toBe(COMPANY_ID);
  });

  it('company header falls back to co-1 when unset', () => {
    expect(getCompanyId()).toBe('co-1');
  });

  it('request headers carry the configured company id', async () => {
    fixtureEnv['VITE_TSP_COMPANY_ID'] = COMPANY_ID;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(moduleEnvelope), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await generateTabDraft('module', 'train-1');

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-TSP-Company-ID']).toBe(COMPANY_ID);
    // Auth headers are unchanged:
    expect(headers['X-TSP-Role']).toBe('designer');
    expect(headers['Authorization']).toBe('Bearer dev-token');
  });
});

describe('api base wiring', () => {
  it('uses VITE_API_BASE when configured', () => {
    fixtureEnv['VITE_API_BASE'] = 'http://127.0.0.1:8000';
    expect(getApiBase()).toBe('http://127.0.0.1:8000');
  });

  it('falls back to http://localhost:8000 when unset', () => {
    expect(getApiBase()).toBe('http://localhost:8000');
  });
});
