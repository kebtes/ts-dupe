// src/api/tabs.ts
//
// API client for the AI Curriculum Builder backend (authoritative contract):
//   POST /v1/training-tabs/{tab}       body: { training_id, target: { kind, id } | null }
//   GET  /v1/training-tabs/{tab}/draft?training_id={id}
//
// When the backend cannot be reached, a locally generated demo draft is
// returned instead. Every such response is unmistakably marked with
// `source: 'offline-mock'`, model `offline-demo`, and an explicit warning —
// it must never be presented as real AI output.

import type {
  TabName,
  GenerationTarget,
  BackendTabEnvelope,
  TrainingProfileDraftData,
  ModuleDraftData,
  SurveyDraftData,
  AssessmentDraftData,
  ContentDescriptionDraftData,
  ModuleRubric,
  BackendTrainingStructure,
} from './adapters';
import { normalizeTabDraft } from './adapters';

export type {
  TabName,
  GenerationTarget,
  TrainingProfileDraftData,
  ModuleDraftData,
  SurveyDraftData,
  AssessmentDraftData,
  ContentDescriptionDraftData,
  ModuleRubric,
  BackendTrainingStructure,
  BackendModuleStructure,
  BackendLessonStructure,
  ContentTargetOption,
} from './adapters';
export { DraftValidationError } from './adapters';

/** Base URL for the AI Curriculum Builder backend (VITE_API_BASE). */
export function getApiBase(): string {
  return envString('VITE_API_BASE') || 'http://localhost:8000';
}

/** Legacy demo training used when no backend training is configured. */
const LEGACY_TRAINING_ID = 'd734b694-0802-4a4a-8a51-eaa693a10abd';

type EnvReader = (name: string) => unknown;

let envOverride: EnvReader | null = null;

/**
 * Test hook: replace the environment source (tests inject a plain map).
 * Production never calls this; `import.meta.env` remains the only source.
 */
export function setEnvReaderForTests(reader: EnvReader | null): void {
  envOverride = reader;
}

function envString(name: string): string {
  const raw = envOverride ? envOverride(name) : (import.meta as any).env?.[name];
  return String(raw ?? '').trim();
}

/** Company header value, configured via VITE_TSP_COMPANY_ID for the live demo. */
export function getCompanyId(): string {
  return envString('VITE_TSP_COMPANY_ID') || 'co-1';
}

/**
 * Resolve the training ID sent to the backend:
 * 1. VITE_TRAINING_ID (configured live demo training) — takes precedence so
 *    generation always targets the backend record.
 * 2. The training id present in the displayed (demo) data.
 * 3. The legacy demo training id.
 */
export function getActiveTrainingId(displayedTrainingId?: string): string {
  return envString('VITE_TRAINING_ID') || displayedTrainingId || LEGACY_TRAINING_ID;
}

/** True when the configured backend training differs from the displayed demo record. */
export function isConfiguredTrainingOverride(displayedTrainingId?: string): boolean {
  const configured = envString('VITE_TRAINING_ID');
  return Boolean(configured) && configured !== displayedTrainingId;
}

function defaultHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer dev-token',
    'X-TSP-User-ID': 'designer-1',
    'X-TSP-Company-ID': getCompanyId(),
    'X-TSP-Role': 'designer',
  };
}

/**
 * Backend tab generation performs one model call of up to ~120s (plus bounded
 * retries), so the client-side generation budget is 180 seconds.
 */
export const GENERATION_TIMEOUT_MS = 180_000;
/** Draft retrieval is an in-memory cache read; a short budget suffices. */
export const DRAFT_TIMEOUT_MS = 15_000;
/** Artificial latency for the offline demo fallback so it feels realistic. */
export const OFFLINE_MOCK_LATENCY_MS = 800;

/** Model name used only for offline demo fallbacks. */
export const OFFLINE_MOCK_MODEL = 'offline-demo';

export const OFFLINE_MOCK_WARNING =
  'OFFLINE DEMO: the AI backend could not be reached. This draft was generated locally for demonstration only and is NOT live AI output.';

export type TabDraftSource = 'backend' | 'offline-mock';

export interface TabDraftResponse<T = any> {
  status: 'success';
  tab: TabName;
  training_id?: string;
  company_id?: string;
  data: T;
  warnings?: string[];
  /** Lessons with no generated assessment coverage (backend envelope field). */
  uncovered_lessons?: string[];
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  request_id?: string;
  created_at?: number;
  updated_at?: number;
  /** Response origin: 'backend' = live AI service; 'offline-mock' = local demo fallback. */
  source?: TabDraftSource;
}

// In-memory cache for fallback when backend is offline
const LOCAL_DRAFT_CACHE: Record<string, TabDraftResponse> = {};

/**
 * Extract a human-readable message from a backend error body.
 *
 * The backend always returns a flat structured body:
 *   { error_class, message, request_id, ...extra }
 * A legacy FastAPI `{ detail: ... }` shape is still tolerated, and the
 * original status-aware fallback messages are preserved.
 */
export function extractBackendErrorMessage(status: number, body: unknown): string {
  const data = (body ?? {}) as Record<string, any>;

  const flat = typeof data.message === 'string' ? data.message.trim() : '';
  if (flat) return flat;

  const detail = data.detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (detail && typeof detail === 'object' && typeof detail.message === 'string' && detail.message.trim()) {
    return detail.message.trim();
  }

  if (status === 401) return 'Authentication required. Please check your session.';
  if (status === 422 || status === 400) return 'Please generate/save the earlier tab first.';
  if (status === 403) return 'Only course designers can generate curriculum recommendations.';
  if (status >= 500) return 'AI model unavailable. Try again in a moment.';
  return `Generation failed: ${status}`;
}

/** True when the failure indicates the backend was unreachable (not a real HTTP error).
 *
 * A client-side abort is deliberately NOT classified here: our own timeout
 * timer is not a connectivity failure, and substituting demo content for a
 * timed-out real generation would misreport the failure.
 */
export function isBackendUnreachableError(err: unknown): boolean {
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fallback generator matching backend contract shapes (NOT real AI output)
function getMockDraft(
  tab: TabName,
  trainingId: string,
  target?: GenerationTarget | null
): BackendTabEnvelope {
  const timestamp = Date.now() / 1000;
  const base = {
    status: 'success' as const,
    tab,
    training_id: trainingId,
    company_id: 'co-1',
    model: OFFLINE_MOCK_MODEL,
    request_id: `offline-${Date.now()}`,
    created_at: timestamp,
    updated_at: timestamp,
    warnings: [OFFLINE_MOCK_WARNING],
  };

  switch (tab) {
    case 'training-profile':
      return {
        ...base,
        data: {
          keywords: ['software engineering', 'architecture', 'testing', 'CI/CD'],
          scope:
            'This training provides a comprehensive foundation in modern software engineering practices. Learners will explore core architectural patterns, automated testing strategies, and CI/CD pipelines.\n\nBy completing hands-on assignments and modular quizzes, participants will build real-world systems with high reliability, maintainability, and security standards.',
          attendance_threshold: 80.0,
          assessment_threshold: 70.0,
          alignment_standards: [],
          delivery_tools: [],
          tech_requirements: [],
          prior_knowledge: [],
          learning_styles: [],
          objectives: [
            'Apply core architectural patterns to decoupled system design.',
            'Design automated testing strategies for reliable delivery.',
          ],
        },
      };

    case 'module':
      return {
        ...base,
        data: {
          modules: [
            {
              title: 'Module 1: Foundations & Architecture',
              practical_assignment: {
                title: 'Lab 1: Environment Setup',
                description: 'Configure your local environment and deploy a hello-world container.',
                evidence_of_completion: 'Working container logs and health-check screenshot.',
              },
              lessons: [
                {
                  title: 'Lesson 1: System Overview',
                  objective: 'Understand system components and decoupled architecture.',
                  duration: 20,
                  duration_type: 'MINUTES',
                },
                {
                  title: 'Lesson 2: Tooling & Setup',
                  objective: 'Install required CLI utilities, Docker, and dependencies.',
                  duration: 30,
                  duration_type: 'MINUTES',
                },
              ],
            },
            {
              title: 'Module 2: Applied Machine Learning & Predictive Pipelines',
              practical_assignment: {
                title: 'Lab 2: Real-time Model Serving',
                description: 'Build an inference API endpoint with automated latency metrics.',
                evidence_of_completion: 'Benchmark report and Swagger docs URL.',
              },
              lessons: [
                {
                  title: 'Lesson 1: Data Cleansing & Embeddings',
                  objective: 'Clean raw datasets and build semantic vector embeddings.',
                  duration: 45,
                  duration_type: 'MINUTES',
                },
                {
                  title: 'Lesson 2: Serving & Monitoring',
                  objective: 'Deploy an inference service and monitor live latency metrics.',
                  duration: 40,
                  duration_type: 'MINUTES',
                },
              ],
            },
          ],
        },
      };

    case 'content-description':
      return {
        ...base,
        data: {
          description:
            'Detailed walkthrough explaining distributed microservices, messaging queues, and state synchronization across fault-tolerant boundaries.',
        },
      };

    case 'survey':
      return {
        ...base,
        data: {
          sections: [
            {
              title: 'Learner Experience',
              questions: [
                {
                  prompt: 'The lesson objectives were clear and easy to follow.',
                  type: 'SINGLE_CHOICE',
                  options: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'],
                },
                {
                  prompt: 'The pace of the curriculum was appropriate for my skill level.',
                  type: 'SINGLE_CHOICE',
                  options: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'],
                },
                {
                  prompt: 'The practical lab assignments helped reinforce the theoretical material.',
                  type: 'SINGLE_CHOICE',
                  options: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'],
                },
                {
                  prompt: 'Which part of the training did you find most useful?',
                  type: 'MULTIPLE_CHOICE',
                  options: ['Lectures', 'Labs', 'Quizzes', 'Readings'],
                },
                {
                  prompt: 'What would you improve about this training?',
                  type: 'TEXT',
                },
              ],
            },
          ],
        },
      };

    case 'assessment':
      return {
        ...base,
        uncovered_lessons: [],
        data: {
          sections: [
            {
              title: 'Knowledge Check',
              questions: [
                {
                  prompt: 'Which communication mechanism is best suited for decoupled event-driven updates?',
                  type: 'MULTIPLE_CHOICE',
                  weight: 1.0,
                  options: [
                    'Message Queue (e.g. RabbitMQ / Kafka)',
                    'Synchronous HTTP polling every 10ms',
                    'Direct shared file locking',
                    'Hardcoded memory addresses',
                  ],
                  correct_answer: 'Message Queue (e.g. RabbitMQ / Kafka)',
                },
                {
                  prompt: 'Why are multi-stage Docker builds recommended for production images?',
                  type: 'MULTIPLE_CHOICE',
                  weight: 1.0,
                  options: [
                    'They isolate build-time tools from runtime dependencies, minimizing attack surface and image size.',
                    'They make containers run twice as fast on CPU.',
                  ],
                  correct_answer:
                    'They isolate build-time tools from runtime dependencies, minimizing attack surface and image size.',
                },
              ],
            },
          ],
          module_rubrics: [
            {
              module_title: 'Module 1: Foundations & Architecture',
              practical_assignment_title: 'Lab 1: Environment Setup',
              linked_objectives: [
                'Apply core architectural patterns to decoupled system design.',
              ],
              criteria:
                'Learner configures a complete local environment and deploys a containerized hello-world service.',
              performance_levels: [
                { level: 'Excellent', points: 3, description: 'Environment fully working with documented health checks.' },
                { level: 'Satisfactory', points: 2, description: 'Environment works with minor gaps in documentation.' },
                { level: 'Needs improvement', points: 1, description: 'Environment incomplete or undocumented.' },
              ],
              source: 'ai-generated-from-module-practical-assignment',
            },
            {
              module_title: 'Module 2: Applied Machine Learning & Predictive Pipelines',
              practical_assignment_title: 'Lab 2: Real-time Model Serving',
              linked_objectives: [
                'Deploy an inference service and monitor live latency metrics.',
              ],
              criteria: 'Learner builds an inference API endpoint and reports automated latency benchmarks.',
              performance_levels: [
                { level: 'Excellent', points: 3, description: 'Endpoint live with benchmark report and docs.' },
                { level: 'Satisfactory', points: 2, description: 'Endpoint live with partial benchmarks.' },
                { level: 'Needs improvement', points: 1, description: 'Endpoint not demonstrably working.' },
              ],
              source: 'ai-generated-from-module-practical-assignment',
            },
          ],
        },
      };
  }
}

/**
 * Generate AI suggestion for a tab via the live backend.
 * Offline demo fallback only when the backend is unreachable.
 */
export async function generateTabDraft<T = any>(
  tab: TabName,
  trainingId: string,
  target?: GenerationTarget
): Promise<TabDraftResponse<T>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    const response = await fetch(`${getApiBase()}/v1/training-tabs/${tab}`, {
      method: 'POST',
      headers: defaultHeaders(),
      signal: controller.signal,
      body: JSON.stringify({
        training_id: trainingId,
        // Backend TargetDTO: { kind, id } (extra="forbid")
        target: target ? { kind: target.kind, id: target.id } : null,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = extractBackendErrorMessage(response.status, errorData);
      const err = new Error(message);
      (err as any).status = response.status;
      throw err;
    }

    const result = await response.json();
    const normalized = normalizeTabDraft(tab, result, {
      source: 'backend',
      target: target ? { ...target } : null,
    });
    LOCAL_DRAFT_CACHE[`${tab}-${trainingId}`] = normalized as TabDraftResponse;
    return normalized as TabDraftResponse<T>;
  } catch (err: unknown) {
    // A client-side abort is OUR OWN timeout, not a connectivity failure:
    // the backend may still be processing a long real generation and will
    // save the finished draft in its cache. Harvest it before reporting a
    // timeout — never substitute demo content for a timed-out generation.
    if ((err as any)?.name === 'AbortError') {
      const harvested = await pollBackendDraftAfterTimeout<T>(tab, trainingId);
      if (harvested) return harvested;
      throw new Error(
        `AI generation timed out after ${Math.round(GENERATION_TIMEOUT_MS / 1000)}s ` +
        `and did not complete within the additional ${Math.round(TIMEOUT_POLL_DEADLINE_MS / 1000)}s ` +
        'wait. The backend may still be processing — press Generate again in a moment.'
      );
    }
    // Backend unreachable (connection refused / DNS): provide a clearly
    // identified local demo draft instead of failing the demo workflow.
    if (isBackendUnreachableError(err)) {
      console.warn(`[API] ${getApiBase()} unavailable. Using OFFLINE DEMO draft for tab '${tab}'.`);
      await sleep(OFFLINE_MOCK_LATENCY_MS);
      const mock = normalizeTabDraft(tab, getMockDraft(tab, trainingId, target), {
        source: 'offline-mock',
        target: target ? { ...target } : null,
      });
      LOCAL_DRAFT_CACHE[`${tab}-${trainingId}`] = mock as unknown as TabDraftResponse;
      return mock as TabDraftResponse<T>;
    }
    throw err;
  }
}

/**
 * After a client timeout the backend keeps processing and saves the finished
 * draft in its own cache. Poll the draft endpoint so a long real generation
 * is harvested instead of lost. Only backend drafts are accepted — a stale
 * local/offline-mock entry must never masquerade as the live result.
 */
export const TIMEOUT_POLL_INTERVAL_MS = 10_000;
export const TIMEOUT_POLL_DEADLINE_MS = 600_000;

export async function pollBackendDraftAfterTimeout<T = any>(
  tab: TabName,
  trainingId: string,
  opts?: { intervalMs?: number; deadlineMs?: number }
): Promise<TabDraftResponse<T> | null> {
  const interval = opts?.intervalMs ?? TIMEOUT_POLL_INTERVAL_MS;
  const deadline = Date.now() + (opts?.deadlineMs ?? TIMEOUT_POLL_DEADLINE_MS);
  while (Date.now() < deadline) {
    await sleep(interval);
    try {
      const cached = await getCachedDraft<T>(tab, trainingId);
      if (cached && cached.source === 'backend' && cached.tab === tab) {
        return cached;
      }
    } catch {
      // Transient polling errors are not fatal; keep waiting for the backend.
    }
  }
  return null;
}

/**
 * Retrieve the latest cached AI suggestion draft for a tab from the backend's
 * in-memory cache; falls back to the local in-session cache when absent.
 */
export async function getCachedDraft<T = any>(
  tab: TabName,
  trainingId: string
): Promise<TabDraftResponse<T> | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DRAFT_TIMEOUT_MS);

    const response = await fetch(
      `${getApiBase()}/v1/training-tabs/${tab}/draft?training_id=${encodeURIComponent(trainingId)}`,
      {
        method: 'GET',
        headers: defaultHeaders(),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return LOCAL_DRAFT_CACHE[`${tab}-${trainingId}`] || null;
    }

    if (!response.ok) {
      return LOCAL_DRAFT_CACHE[`${tab}-${trainingId}`] || null;
    }

    const result = await response.json();
    const normalized = normalizeTabDraft(tab, result, { source: 'backend' });
    LOCAL_DRAFT_CACHE[`${tab}-${trainingId}`] = normalized as TabDraftResponse;
    return normalized as TabDraftResponse<T>;
  } catch (err) {
    return LOCAL_DRAFT_CACHE[`${tab}-${trainingId}`] || null;
  }
}

/**
 * Read-only training structure: the actual modules and lessons of one
 * training from `GET /v1/curriculum/{training_id}/structure`.
 *
 * Unlike draft generation there is deliberately NO offline fallback here:
 * content targets must be real database records. On any failure the caller
 * receives a thrown Error and must prevent invalid target submission.
 */
export async function getTrainingStructure(
  trainingId: string
): Promise<BackendTrainingStructure> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DRAFT_TIMEOUT_MS);

    const response = await fetch(
      `${getApiBase()}/v1/curriculum/${encodeURIComponent(trainingId)}/structure`,
      {
        method: 'GET',
        headers: defaultHeaders(),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = extractBackendErrorMessage(response.status, errorData);
      const err = new Error(message);
      (err as any).status = response.status;
      throw err;
    }

    const body = (await response.json()) as BackendTrainingStructure;
    if (body?.training_id !== trainingId || !Array.isArray(body?.modules)) {
      throw new Error(
        'Training structure response does not match the requested training.'
      );
    }
    return body;
  } catch (err: unknown) {
    // No mock fallback for structure data — surface a clear, actionable error.
    if (isBackendUnreachableError(err)) {
      throw new Error(
        `AI backend is unreachable at ${getApiBase()}. ` +
          'Start the backend to load real content targets.'
      );
    }
    throw err;
  }
}

/**
 * Lightweight reachability probe against the public /health endpoint.
 * No auth headers required (health is public); returns true when the
 * backend answers. Used by the app shell to warn when AI suggestions
 * would come from the offline demo generator instead of the backend.
 */
export async function pingBackend(timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${getApiBase()}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
