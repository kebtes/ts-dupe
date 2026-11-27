// src/api/adapters.ts
//
// Deterministic response normalizers adapting the AI Curriculum Builder backend
// (authoritative contract) to the frontend's draft-review data shapes.
//
// Backend contract source of truth:
//   service/schemas/tabs.py        (request/response envelopes)
//   service/tab_generation/schemas.py (per-tab `data` payloads, extra="forbid")
//
// Rules:
//   - Never invent curriculum content, rationales, lesson ids, or answer keys.
//   - Presentation identifiers (ids/orders) are deterministic and clearly local.
//   - Backend fields are preserved whenever they are useful.

// =====================================================================
// Tab identifier (matches backend TAB_SCHEMA_MAP keys)
// =====================================================================

export type TabName =
  | 'training-profile'
  | 'module'
  | 'content-description'
  | 'survey'
  | 'assessment';

// =====================================================================
// Backend raw (authoritative) shapes
// =====================================================================

/** POST /v1/training-tabs/{tab} envelope (TabResponseEnvelope). */
export interface BackendTabEnvelope {
  status?: string;
  tab: string;
  data: Record<string, unknown>;
  warnings?: string[];
  uncovered_lessons?: string[];
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  request_id?: string;
  // Only present on the GET /{tab}/draft envelope (TabDraftResponse):
  training_id?: string;
  company_id?: string;
  created_at?: number;
  updated_at?: number;
}

/** Backend TargetDTO (service/schemas/tabs.py). */
export interface GenerationTarget {
  kind: string; // 'module' | 'lesson' | 'assessment'
  id: string;
  /** Presentation title resolved by the caller from its own records. */
  title?: string;
}

// ------------------------- Training Profile -------------------------

export interface BackendTrainingProfileData {
  keywords?: string[];
  scope?: string;
  attendance_threshold?: number;
  assessment_threshold?: number;
  alignment_standards?: string[];
  delivery_tools?: string[];
  tech_requirements?: string[];
  prior_knowledge?: string[];
  learning_styles?: string[];
  objectives?: string[];
}

// ------------------------------ Module ------------------------------

export interface BackendPracticalAssignment {
  title: string;
  description: string;
  evidence_of_completion: string;
}

export interface BackendLesson {
  title?: string;
  objective?: string;
  duration?: number;
  duration_type?: string;
}

export interface BackendModule {
  title?: string;
  /** Not part of the backend contract; tolerated when absent. */
  description?: string;
  practical_assignment?: BackendPracticalAssignment;
  lessons?: BackendLesson[];
}

export interface BackendModuleData {
  modules?: BackendModule[];
}

// ------------------------- Content Description ----------------------

export interface BackendContentDescriptionData {
  description?: string;
}

// ------------------------------ Survey ------------------------------

export interface BackendSurveyQuestion {
  prompt?: string;
  type?: string; // 'TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'
  options?: string[];
}

export interface BackendSurveySection {
  title?: string;
  questions?: BackendSurveyQuestion[];
}

export interface BackendSurveyData {
  sections?: BackendSurveySection[];
}

// ---------------------------- Assessment ----------------------------

export interface BackendPerformanceLevel {
  level: string;
  points: number;
  description: string;
}

export interface BackendRubric {
  criteria: string;
  performance_levels: BackendPerformanceLevel[];
}

export interface BackendAssessmentQuestion {
  prompt?: string;
  type?: string;
  weight?: number;
  options?: string[];
  correct_answer?: string;
  rubric?: BackendRubric;
}

export interface BackendAssessmentSection {
  title?: string;
  questions?: BackendAssessmentQuestion[];
}

/** Preserved verbatim from the backend (one per generated module). */
export interface ModuleRubric {
  module_title: string;
  practical_assignment_title: string;
  linked_objectives: string[];
  criteria: string;
  performance_levels: BackendPerformanceLevel[];
  source: string;
}

export interface BackendAssessmentData {
  sections?: BackendAssessmentSection[];
  module_rubrics?: ModuleRubric[];
}

// =====================================================================
// Frontend normalized draft data shapes
// =====================================================================

export interface TrainingProfileDetails {
  keywords: string[];
  attendance_threshold: number | null;
  assessment_threshold: number | null;
  alignment_standards: string[];
  delivery_tools: string[];
  tech_requirements: string[];
  prior_knowledge: string[];
  learning_styles: string[];
  objectives: string[];
}

export interface TrainingProfileDraftData {
  scope: string;
  details?: TrainingProfileDetails;
}

export interface NormalizedLesson {
  id: string;
  title: string;
  objective: string;
  duration: number;
  duration_type: string;
  order: number;
}

export interface NormalizedTopic {
  title: string;
  order: number;
  lessons: NormalizedLesson[];
}

export interface NormalizedModule {
  id: string;
  title: string;
  description: string;
  order: number;
  practical_assignment?: BackendPracticalAssignment;
  topics: NormalizedTopic[];
}

export interface ModuleDraftData {
  modules: NormalizedModule[];
}

export interface SurveyDraftQuestion {
  question: string;
  type: string;
  order: number;
  options?: string[];
  sectionTitle?: string;
}

export interface SurveyDraftData {
  questions: SurveyDraftQuestion[];
}

export interface AssessmentOption {
  text: string;
  is_correct: boolean;
  /** Never invented: only present when the backend supplies one. */
  rationale?: string;
}

export interface AssessmentDraftQuestion {
  question: string;
  type: string;
  options: AssessmentOption[];
  sectionTitle?: string;
  weight?: number;
  /** Only for RUBRIC-type questions (backend supplies the rubric). */
  rubric?: BackendRubric;
}

export interface AssessmentDraftData {
  questions: AssessmentDraftQuestion[];
  module_rubrics: ModuleRubric[];
}

export interface ContentDescriptionItem {
  /** The real id of the caller-selected target; empty when unknown. */
  lesson_id: string;
  /** The real title of the caller-selected target; never invented. */
  lesson_title: string;
  content_description: string;
  key_takeaways: string[];
}

export interface ContentDescriptionDraftData {
  target: { kind: string; id: string; title?: string } | null;
  contents: ContentDescriptionItem[];
}

// =====================================================================
// Normalizers
// =====================================================================

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

// ------------------------- Training Profile -------------------------

export function normalizeTrainingProfileDraft(raw: Record<string, unknown>): TrainingProfileDraftData {
  const data = (raw ?? {}) as BackendTrainingProfileData;
  const hasDetails =
    data.attendance_threshold !== undefined ||
    data.assessment_threshold !== undefined ||
    strList(data.objectives).length > 0 ||
    strList(data.keywords).length > 0;
  return {
    scope: str(data.scope),
    details: hasDetails
      ? {
          keywords: strList(data.keywords),
          attendance_threshold:
            typeof data.attendance_threshold === 'number' ? data.attendance_threshold : null,
          assessment_threshold:
            typeof data.assessment_threshold === 'number' ? data.assessment_threshold : null,
          alignment_standards: strList(data.alignment_standards),
          delivery_tools: strList(data.delivery_tools),
          tech_requirements: strList(data.tech_requirements),
          prior_knowledge: strList(data.prior_knowledge),
          learning_styles: strList(data.learning_styles),
          objectives: strList(data.objectives),
        }
      : undefined,
  };
}

// ------------------------------ Module ------------------------------

/**
 * The backend emits modules with a flat `lessons` array (no topics, ids,
 * orders, or descriptions). Frontend rendering expects the topic wrapper,
 * presentation ids, and ordering — all synthesized deterministically here.
 */
export function normalizeModuleDraft(raw: Record<string, unknown>): ModuleDraftData {
  const data = (raw ?? {}) as BackendModuleData;
  const modules = Array.isArray(data.modules) ? data.modules : [];

  return {
    modules: modules.map((mod, moduleIndex) => {
      const lessons = Array.isArray(mod?.lessons) ? mod.lessons : [];
      const normalizedLessons: NormalizedLesson[] = lessons.map((lesson, lessonIndex) => ({
        id: `lesson-${moduleIndex + 1}-${lessonIndex + 1}`,
        title: str(lesson?.title),
        objective: str(lesson?.objective),
        duration: num(lesson?.duration),
        duration_type: str(lesson?.duration_type) || 'MINUTES',
        order: lessonIndex + 1,
      }));

      // Presentation wrapper: the backend has no topic grouping, so all
      // lessons of a module are presented as one ordered lesson list.
      const topics: NormalizedTopic[] = normalizedLessons.length
        ? [{ title: 'Lessons', order: 1, lessons: normalizedLessons }]
        : [];

      return {
        id: `mod-${moduleIndex + 1}`,
        title: str(mod?.title),
        // Module-level description (Issue 1 contract): present when the
        // backend generates it; never fabricated when omitted.
        description: str(mod?.description),
        order: moduleIndex + 1,
        practical_assignment: mod?.practical_assignment,
        topics,
      };
    }),
  };
}

// ------------------------------ Survey ------------------------------

/**
 * Backend sections are flattened into the frontend's ordered question list.
 * `prompt` maps to `question`; backend types (TEXT / SINGLE_CHOICE /
 * MULTIPLE_CHOICE) are preserved verbatim; options are preserved as-is.
 */
export function normalizeSurveyDraft(raw: Record<string, unknown>): SurveyDraftData {
  const data = (raw ?? {}) as BackendSurveyData;
  const sections = Array.isArray(data.sections) ? data.sections : [];

  const questions: SurveyDraftQuestion[] = [];
  let order = 0;
  sections.forEach((section) => {
    const sectionQuestions = Array.isArray(section?.questions) ? section.questions : [];
    sectionQuestions.forEach((question) => {
      order += 1;
      questions.push({
        question: str(question?.prompt),
        type: str(question?.type) || 'SINGLE_CHOICE',
        order,
        options: Array.isArray(question?.options) ? question.options.filter((o) => typeof o === 'string') : undefined,
        sectionTitle: str(section?.title) || undefined,
      });
    });
  });

  return { questions };
}

// ---------------------------- Assessment ----------------------------

/**
 * Backend sections are flattened into MCQ objects. `correct_answer` is the
 * exact text of one option (the backend normalizes letters to option text),
 * so `is_correct` is derived by exact comparison — never by guessing.
 * Rationales and lesson ids do not exist in the backend contract and are
 * never invented. Module rubrics are preserved verbatim.
 */
export function normalizeAssessmentDraft(raw: Record<string, unknown>): AssessmentDraftData {
  const data = (raw ?? {}) as BackendAssessmentData;
  const sections = Array.isArray(data.sections) ? data.sections : [];

  const questions: AssessmentDraftQuestion[] = [];
  sections.forEach((section) => {
    const sectionQuestions = Array.isArray(section?.questions) ? section.questions : [];
    sectionQuestions.forEach((question) => {
      const type = str(question?.type) || 'MULTIPLE_CHOICE';
      const options = Array.isArray(question?.options)
        ? question.options.filter((o): o is string => typeof o === 'string')
        : [];
      const correctAnswer = str(question?.correct_answer);
      const isRubric = type.toUpperCase() === 'RUBRIC';

      questions.push({
        question: str(question?.prompt),
        type,
        options: options.map((text) => ({
          text,
          is_correct: !isRubric && correctAnswer.length > 0 && text === correctAnswer,
        })),
        sectionTitle: str(section?.title) || undefined,
        weight: typeof question?.weight === 'number' ? question.weight : undefined,
        rubric: question?.rubric ?? undefined,
      });
    });
  });

  const moduleRubrics = Array.isArray(data.module_rubrics)
    ? data.module_rubrics.filter(
        (r): r is ModuleRubric =>
          !!r &&
          typeof r === 'object' &&
          typeof (r as ModuleRubric).module_title === 'string' &&
          Array.isArray((r as ModuleRubric).performance_levels),
      )
    : [];

  return { questions, module_rubrics: moduleRubrics };
}

// ------------------------- Content Description ----------------------

/**
 * The backend returns a single `description` for the requested target.
 * The target identity (kind/id/title) is supplied by the caller from its own
 * records — never synthesized here.
 */
export function normalizeContentDescriptionDraft(
  raw: Record<string, unknown>,
  target?: GenerationTarget | null,
): ContentDescriptionDraftData {
  const data = (raw ?? {}) as BackendContentDescriptionData;
  const description = str(data.description);

  return {
    target: target ? { kind: target.kind, id: target.id, title: target.title } : null,
    contents: [
      {
        lesson_id: target?.id ?? '',
        lesson_title: target?.title ?? '',
        content_description: description,
        // The backend contract has no takeaways; never invent them.
        key_takeaways: [],
      },
    ],
  };
}

// =====================================================================
// Minimum usability validation (malformed HTTP-200 responses)
// =====================================================================

/**
 * Thrown when the backend answers HTTP 200 but the payload cannot be
 * presented as a draft (e.g. empty sections, missing scope). The tab
 * components render `err.message` in the error banner instead of an
 * empty draft card. The `reason` property carries the technical detail
 * without polluting the user-facing message.
 */
export class DraftValidationError extends Error {
  readonly tab: TabName;
  readonly reason: string;

  constructor(tab: TabName, reason: string) {
    super(`Backend returned an unusable ${tab} draft.`);
    this.name = 'DraftValidationError';
    this.tab = tab;
    this.reason = reason;
  }
}

const hasText = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Enforce the minimum usability floor for a normalized draft. Valid live
 * responses and offline mock drafts always pass; anything the backend
 * generated that we cannot meaningfully display is rejected here rather
 * than rendered as an empty card.
 */
function validateUsableDraft(tab: TabName, data: unknown): void {
  switch (tab) {
    case 'training-profile': {
      const d = data as TrainingProfileDraftData;
      if (!d || !hasText(d.scope)) {
        throw new DraftValidationError(tab, 'scope is missing or empty');
      }
      break;
    }
    case 'module': {
      const d = data as ModuleDraftData;
      const anyValidModule = (d?.modules ?? []).some(
        (m) => !!m && hasText(m.title)
      );
      if (!anyValidModule) {
        throw new DraftValidationError(tab, 'no modules with non-empty titles');
      }
      break;
    }
    case 'content-description': {
      const d = data as ContentDescriptionDraftData;
      if (!d?.contents?.[0] || !hasText(d.contents[0].content_description)) {
        throw new DraftValidationError(tab, 'description is missing or empty');
      }
      break;
    }
    case 'survey': {
      const d = data as SurveyDraftData;
      const anyValidQuestion = (d?.questions ?? []).some(
        (q) => !!q && hasText(q.question)
      );
      if (!anyValidQuestion) {
        throw new DraftValidationError(tab, 'no valid questions in sections');
      }
      break;
    }
    case 'assessment': {
      const d = data as AssessmentDraftData;
      const anyValidQuestion = (d?.questions ?? []).some(
        (q) => !!q && hasText(q.question)
      );
      if (!anyValidQuestion) {
        throw new DraftValidationError(tab, 'no valid questions in sections');
      }
      break;
    }
  }
}

// =====================================================================
// Envelope dispatcher
// =====================================================================

export interface NormalizeOptions {
  source?: 'backend' | 'offline-mock';
  target?: GenerationTarget | null;
}

export function normalizeTabDraft(
  tab: TabName,
  raw: BackendTabEnvelope,
  options: NormalizeOptions = {},
): {
  status: 'success';
  tab: TabName;
  training_id?: string;
  company_id?: string;
  data: unknown;
  warnings: string[];
  uncovered_lessons: string[];
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  request_id?: string;
  created_at?: number;
  updated_at?: number;
  source: 'backend' | 'offline-mock';
} {
  const envelope = (raw ?? {}) as BackendTabEnvelope;
  const rawData = (envelope.data ?? {}) as Record<string, unknown>;

  let data: unknown;
  switch (tab) {
    case 'training-profile':
      data = normalizeTrainingProfileDraft(rawData);
      break;
    case 'module':
      data = normalizeModuleDraft(rawData);
      break;
    case 'content-description':
      data = normalizeContentDescriptionDraft(rawData, options.target ?? null);
      break;
    case 'survey':
      data = normalizeSurveyDraft(rawData);
      break;
    case 'assessment':
      data = normalizeAssessmentDraft(rawData);
      break;
    default:
      data = rawData;
  }

  // Malformed HTTP-200 payloads must surface as errors, not empty cards.
  validateUsableDraft(tab, data);

  return {
    status: 'success',
    tab,
    training_id: envelope.training_id,
    company_id: envelope.company_id,
    data,
    warnings: strList(envelope.warnings),
    uncovered_lessons: strList(envelope.uncovered_lessons),
    model: envelope.model,
    usage: envelope.usage,
    request_id: envelope.request_id,
    created_at: envelope.created_at,
    updated_at: envelope.updated_at,
    source: options.source ?? 'backend',
  };
}

// =====================================================================
// Read-only training structure (GET /v1/curriculum/{training_id}/structure)
// =====================================================================

/** One lesson as returned by the backend (fields mirror public.lessons). */
export interface BackendLessonStructure {
  id: string;
  name: string;
  objective?: string | null;
  duration?: number | null;
  duration_type?: string | null;
}

/** One module as returned by the backend (fields mirror public.modules). */
export interface BackendModuleStructure {
  id: string;
  name: string;
  description?: string | null;
  lessons: BackendLessonStructure[];
}

/** GET /v1/curriculum/{training_id}/structure response body. */
export interface BackendTrainingStructure {
  training_id: string;
  title?: string | null;
  modules: BackendModuleStructure[];
}

/** A Content Description generation target built from real records. */
export interface ContentTargetOption {
  kind: 'module' | 'lesson';
  id: string;
  title: string;
  label: string;
}

/**
 * Resolve the module NAME for a content-description target using ONLY the
 * backend structure IDs — the module the user actually selected. Never
 * defaults to the first module and never matches on titles or text: an
 * unresolvable target yields '' (the UI hides the label) instead of a wrong
 * association.
 */
export function moduleNameForTarget(
  target: { kind: 'module' | 'lesson'; id: string } | null | undefined,
  structure: BackendTrainingStructure | null | undefined,
): string {
  const targetId = target?.id ? String(target.id) : '';
  if (!targetId || !structure?.modules?.length) return '';
  if (target.kind === 'module') {
    const mod = structure.modules.find(
      (m) => String(m.id) === targetId,
    );
    return mod?.name ?? '';
  }
  for (const mod of structure.modules) {
    if ((mod.lessons ?? []).some((l) => String(l.id) === targetId)) {
      return mod.name ?? '';
    }
  }
  return '';
}

/**
 * Build Content Description target options exclusively from the training
 * structure returned by the backend. Returns an empty array when the
 * structure is missing or has no modules — never mock ids.
 */
export function buildContentTargets(
  structure: BackendTrainingStructure | null | undefined
): ContentTargetOption[] {
  const options: ContentTargetOption[] = [];
  for (const module of structure?.modules ?? []) {
    if (module?.id) {
      options.push({
        kind: 'module',
        id: String(module.id),
        title: module.name,
        label: `Module: ${module.name}`,
      });
    }
    for (const lesson of module?.lessons ?? []) {
      if (lesson?.id) {
        options.push({
          kind: 'lesson',
          id: String(lesson.id),
          title: lesson.name,
          label: `Lesson: ${lesson.name}`,
        });
      }
    }
  }
  return options;
}

// =====================================================================
// UI display records from real training structure
// =====================================================================

/** ModuleTab display record converted from the real backend structure. */
export interface UiModuleRecord {
  id: string;
  name: string;
  description: string | null;
  trainingTag: { name: string };
  lessons: Array<{
    id: string;
    title: string;
    objective: string | null;
    duration: number | null;
    duration_type: string | null;
  }>;
}

/**
 * Convert the backend training structure into ModuleTab display records.
 * These are REAL TSP records (ids preserved); TSP modules carry no
 * practical-assignment data, so none is invented.
 */
export function uiModulesFromStructure(
  structure: BackendTrainingStructure | null | undefined
): UiModuleRecord[] {
  return (structure?.modules ?? []).map((m) => ({
    id: String(m.id),
    name: m.name,
    description: m.description ?? null,
    trainingTag: { name: 'TSP Record' },
    lessons: (m.lessons ?? []).map((l) => ({
      id: String(l.id),
      title: l.name,
      objective: l.objective ?? null,
      duration: l.duration ?? null,
      duration_type: l.duration_type ?? null,
    })),
  }));
}
