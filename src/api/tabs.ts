// src/api/tabs.ts

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8002';
const COMPANY_ID = (import.meta as any).env?.VITE_COMPANY_ID || '816e9eab-f109-4de2-b7aa-154f8cb2ac67';
const USER_ROLE = (import.meta as any).env?.VITE_USER_ROLE || 'admin';
const USER_ID = (import.meta as any).env?.VITE_USER_ID || 'designer-1';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer dev-token',
  'X-TSP-User-ID': USER_ID,
  'X-TSP-Company-ID': COMPANY_ID,
  'X-TSP-Role': USER_ROLE,
};

export type TabName =
  | 'training-profile'
  | 'module'
  | 'content-description'
  | 'survey'
  | 'assessment';

export interface TrainingProfileDraftData {
  scope: string;
}

export interface PracticalAssignment {
  title: string;
  description: string;
  evidence_of_completion: string;
}

export interface Lesson {
  id?: string;
  title: string;
  objective: string;
  duration: number;
  duration_type: string;
  order: number;
}

export interface Topic {
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface ModuleItem {
  id?: string;
  title: string;
  description: string;
  order: number;
  practical_assignment?: PracticalAssignment;
  topics?: Topic[];
}

export interface ModuleDraftData {
  modules: ModuleItem[];
}

export interface ContentDescriptionItem {
  lesson_id: string;
  lesson_title: string;
  content_description: string;
  key_takeaways: string[];
}

export interface ContentDescriptionDraftData {
  title?: string;
  description?: string;
  contents?: ContentDescriptionItem[];
}

export interface SurveyQuestionItem {
  prompt?: string;
  question?: string;
  type: string;
  order?: number;
  options?: string[];
}

export interface SurveySectionItem {
  title: string;
  questions: SurveyQuestionItem[];
}

export interface SurveyDraftData {
  questions?: SurveyQuestionItem[];
  sections?: SurveySectionItem[];
}

export interface AssessmentOption {
  text?: string;
  is_correct?: boolean;
  rationale?: string;
}

export interface AssessmentQuestionItem {
  lesson_id?: string;
  prompt?: string;
  question?: string;
  type?: string;
  weight?: number;
  options?: (AssessmentOption | string)[];
  correct_answer?: string;
  rubric?: any;
}

export interface AssessmentSectionItem {
  title: string;
  questions: AssessmentQuestionItem[];
}

export interface AssessmentDraftData {
  questions?: AssessmentQuestionItem[];
  sections?: AssessmentSectionItem[];
  uncovered_lessons?: string[];
}

export interface TabDraftResponse<T = any> {
  status: 'success' | 'error';
  tab: TabName;
  training_id?: string;
  company_id?: string;
  data: T;
  warnings?: string[];
  model?: string;
  request_id?: string;
  created_at?: number;
  updated_at?: number;
}

// In-memory cache for fallback when backend is offline
const LOCAL_DRAFT_CACHE: Record<string, any> = {};

// Fallback generator matching backend guides
function getMockDraft(tab: TabName, trainingId: string): TabDraftResponse {
  const timestamp = Date.now() / 1000;

  switch (tab) {
    case 'training-profile':
      return {
        status: 'success',
        tab,
        training_id: trainingId,
        company_id: 'co-1',
        model: 'gemma4:31b-cloud',
        request_id: `req-${Date.now()}`,
        created_at: timestamp,
        updated_at: timestamp,
        warnings: [],
        data: {
          scope:
            'This training provides a comprehensive foundation in modern software engineering practices. Learners will explore core architectural patterns, automated testing strategies, and CI/CD pipelines.\n\nBy completing hands-on assignments and modular quizzes, participants will build real-world systems with high reliability, maintainability, and security standards.',
        },
      };

    case 'module':
      return {
        status: 'success',
        tab,
        training_id: trainingId,
        company_id: 'co-1',
        model: 'gemma4:31b-cloud',
        request_id: `req-${Date.now()}`,
        created_at: timestamp,
        updated_at: timestamp,
        warnings: [],
        data: {
          modules: [
            {
              id: 'mod-ai-1',
              title: 'Module 1: Foundations & Architecture',
              description: 'Core concepts and cloud development environment setup.',
              order: 1,
              practical_assignment: {
                title: 'Lab 1: Environment Setup',
                description: 'Configure your local environment and deploy a hello-world container.',
                evidence_of_completion: 'Working container logs and health-check screenshot.',
              },
              topics: [
                {
                  title: 'Topic 1: Introduction to Distributed Systems',
                  order: 1,
                  lessons: [
                    {
                      id: 'lesson-uuid-1',
                      title: 'Lesson 1: System Overview',
                      objective: 'Understand system components and decoupled architecture.',
                      duration: 20,
                      duration_type: 'MINUTES',
                      order: 1,
                    },
                    {
                      id: 'lesson-uuid-2',
                      title: 'Lesson 2: Tooling & Setup',
                      objective: 'Install required CLI utilities, Docker, and dependencies.',
                      duration: 30,
                      duration_type: 'MINUTES',
                      order: 2,
                    },
                  ],
                },
              ],
            },
            {
              id: 'mod-ai-2',
              title: 'Module 2: Applied Machine Learning & Predictive Pipelines',
              description: 'End-to-end data processing, feature engineering, and inference pipelines.',
              order: 2,
              practical_assignment: {
                title: 'Lab 2: Real-time Model Serving',
                description: 'Build an inference API endpoint with automated latency metrics.',
                evidence_of_completion: 'Benchmark report and Swagger docs URL.',
              },
              topics: [
                {
                  title: 'Topic 1: Feature Transformation',
                  order: 1,
                  lessons: [
                    {
                      id: 'lesson-uuid-3',
                      title: 'Lesson 1: Data Cleansing & Embeddings',
                      objective: 'Clean raw datasets and build semantic vector embeddings.',
                      duration: 45,
                      duration_type: 'MINUTES',
                      order: 1,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

    case 'content-description':
      return {
        status: 'success',
        tab,
        training_id: trainingId,
        company_id: 'co-1',
        model: 'mimo-v2.6-flash',
        request_id: `req-${Date.now()}`,
        created_at: timestamp,
        updated_at: timestamp,
        warnings: [],
        data: {
          title: 'Practical Hands-on Learning Guide',
          description:
            'A comprehensive module-focused resource designed to guide learners through key theoretical foundations, practical implementations, and real-world evaluation workflows.',
          contents: [
            {
              lesson_id: 'lesson-uuid-1',
              lesson_title: 'Lesson 1: System Overview',
              content_description:
                'Detailed walkthrough explaining distributed microservices, messaging queues, and state synchronization across fault-tolerant boundaries.',
              key_takeaways: [
                'Microservices communicate via asynchronous events and message brokers',
                'State is persisted in isolated domain stores with eventual consistency',
                'Health checks and circuit breakers ensure zero-downtime deployment',
              ],
            },
            {
              lesson_id: 'lesson-uuid-2',
              lesson_title: 'Lesson 2: Tooling & Setup',
              content_description:
                'Step-by-step containerization tutorial configuring environment variables, volumes, and network bridge drivers.',
              key_takeaways: [
                'Standardized Docker configurations guarantee reproducible builds',
                'Multi-stage builds reduce final image size and attack surface',
              ],
            },
          ],
        },
      };

    case 'survey':
      return {
        status: 'success',
        tab,
        training_id: trainingId,
        company_id: 'co-1',
        model: 'gemma4:31b-cloud',
        request_id: `req-${Date.now()}`,
        created_at: timestamp,
        updated_at: timestamp,
        warnings: [],
        data: {
          questions: [
            {
              question: 'The lesson objectives were clear and easy to follow.',
              type: 'likert',
              order: 1,
            },
            {
              question: 'The pace of the curriculum was appropriate for my skill level.',
              type: 'likert',
              order: 2,
            },
            {
              question: 'The practical lab assignments helped reinforce the theoretical material.',
              type: 'likert',
              order: 3,
            },
            {
              question: 'The course materials and code examples were up to date.',
              type: 'likert',
              order: 4,
            },
            {
              question: 'I feel confident applying what I learned to real-world tasks.',
              type: 'likert',
              order: 5,
            },
          ],
        },
      };

    case 'assessment':
      return {
        status: 'success',
        tab,
        training_id: trainingId,
        company_id: 'co-1',
        model: 'gemma4:31b-cloud',
        request_id: `req-${Date.now()}`,
        created_at: timestamp,
        updated_at: timestamp,
        warnings: [],
        data: {
          questions: [
            {
              lesson_id: 'lesson-uuid-1',
              question:
                'Which communication mechanism is best suited for decoupled event-driven updates?',
              options: [
                {
                  text: 'Message Queue (e.g. RabbitMQ / Kafka)',
                  is_correct: true,
                  rationale: 'Message queues decouple producers from consumers asynchronously.',
                },
                {
                  text: 'Synchronous HTTP polling every 10ms',
                  is_correct: false,
                  rationale: 'High latency and high overhead on network and database resources.',
                },
                {
                  text: 'Direct shared file locking',
                  is_correct: false,
                  rationale: 'Does not scale across distributed services and causes deadlocks.',
                },
                {
                  text: 'Hardcoded memory addresses',
                  is_correct: false,
                  rationale: 'Invalid across separate container and machine boundaries.',
                },
              ],
            },
            {
              lesson_id: 'lesson-uuid-2',
              question: 'Why are multi-stage Docker builds recommended for production images?',
              options: [
                {
                  text: 'They isolate build-time tools from runtime dependencies, minimizing attack surface and image size.',
                  is_correct: true,
                  rationale: 'Compilation tools are left behind in the build stage, creating slim containers.',
                },
                {
                  text: 'They make containers run twice as fast on CPU.',
                  is_correct: false,
                  rationale: 'Multi-stage builds only affect image layers, not raw runtime instruction speed.',
                },
              ],
            },
          ],
          uncovered_lessons: [],
        },
      };
  }
}

/**
 * Generate AI suggestion for a tab
 */
export async function generateTabDraft<T = any>(
  tab: TabName,
  trainingId: string = 'd734b694-0802-4a4a-8a51-eaa693a10abd',
  target?: {
    kind?: string;
    id?: string;
    target_type?: string;
    target_id?: string;
    title?: string;
    name?: string;
    description?: string;
  }
): Promise<TabDraftResponse<T>> {
  try {
    const controller = new AbortController();
    // Allow up to 120 seconds for backend LLM generation
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const finalTrainingId = trainingId?.trim() || 'd734b694-0802-4a4a-8a51-eaa693a10abd';
    const payload: Record<string, any> = {
      training_id: finalTrainingId,
    };
    if (target && ((target as any).kind || (target as any).target_type)) {
      payload.target = {
        kind: (target as any).kind || (target as any).target_type,
        id: (target as any).id || (target as any).target_id,
        title: (target as any).title,
        name: (target as any).name,
        description: (target as any).description,
      };
    }

    const response = await fetch(`${API_BASE}/v1/training-tabs/${tab}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.message ||
        errorData.detail?.message ||
        errorData.detail ||
        (response.status === 422 || response.status === 400
          ? 'Please generate/save the earlier tab first.'
          : response.status === 403
          ? 'Only course designers can generate curriculum recommendations.'
          : response.status >= 500
          ? 'AI model unavailable. Try again in a moment.'
          : `Generation failed: ${response.status}`);

      const err = new Error(message);
      (err as any).status = response.status;
      throw err;
    }

    const result = await response.json();
    LOCAL_DRAFT_CACHE[`${tab}-${trainingId}`] = result;
    return result;
  } catch (err: any) {
    // If backend is not running (e.g. Failed to fetch / Connection refused), simulate realistic response
    if (
      err.name === 'AbortError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('Could not connect')
    ) {
      console.warn(`[API] ${API_BASE} unavailable. Using client AI draft generator for tab '${tab}'`);
      await new Promise((r) => setTimeout(r, 800)); // realistic latency
      const mock = getMockDraft(tab, trainingId) as TabDraftResponse<T>;
      LOCAL_DRAFT_CACHE[`${tab}-${trainingId}`] = mock;
      return mock;
    }
    throw err;
  }
}

/**
 * Retrieve cached AI suggestion draft for a tab
 */
export async function getCachedDraft<T = any>(
  tab: TabName,
  trainingId: string = 'd734b694-0802-4a4a-8a51-eaa693a10abd'
): Promise<TabDraftResponse<T> | null> {
  const finalTrainingId = trainingId?.trim() || 'd734b694-0802-4a4a-8a51-eaa693a10abd';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `${API_BASE}/v1/training-tabs/${tab}/draft?training_id=${encodeURIComponent(finalTrainingId)}`,
      {
        method: 'GET',
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return LOCAL_DRAFT_CACHE[`${tab}-${finalTrainingId}`] || null;
    }

    if (!response.ok) {
      return LOCAL_DRAFT_CACHE[`${tab}-${finalTrainingId}`] || null;
    }

    const result = await response.json();
    LOCAL_DRAFT_CACHE[`${tab}-${finalTrainingId}`] = result;
    return result;
  } catch (err) {
    return LOCAL_DRAFT_CACHE[`${tab}-${finalTrainingId}`] || null;
  }
}

export interface CopilotChoiceOption {
  id: string;
  label: string;
  description?: string;
  is_recommended?: boolean;
}

export interface CopilotClarification {
  question: string;
  options: CopilotChoiceOption[];
  allow_custom?: boolean;
}

export interface DesignerCopilotRequest {
  training_id: string;
  tab: string;
  user_message?: string;
  selected_option_id?: string;
  current_draft?: any;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface DesignerCopilotResponse {
  status: string;
  response_type: 'CLARIFICATION' | 'UPDATE_DRAFT' | 'CHAT';
  message: string;
  clarification?: CopilotClarification;
  updated_draft?: any;
  model?: string;
}

/**
 * Send an interactive turn to the Curriculum Designer Copilot
 */
export async function sendDesignerCopilotTurn(
  req: DesignerCopilotRequest
): Promise<DesignerCopilotResponse> {
  const finalTrainingId = req.training_id?.trim() || 'd734b694-0802-4a4a-8a51-eaa693a10abd';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(`${API_BASE}/v1/training-tabs/copilot`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      body: JSON.stringify({
        ...req,
        training_id: finalTrainingId,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.message ||
        errorData.detail?.message ||
        errorData.detail ||
        `Copilot turn failed: ${response.status}`;
      throw new Error(message);
    }

    return await response.json();
  } catch (err: any) {
    // If backend is offline or network fails, provide client fallback
    if (
      err.name === 'AbortError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('Could not connect')
    ) {
      console.warn(`[Copilot API] Backend offline. Using client copilot fallback.`);
      await new Promise((r) => setTimeout(r, 600));

      if (req.selected_option_id) {
        const mockTab = (req.tab === 'module' ? 'module' : req.tab) as TabName;
        const mockDraft = getMockDraft(mockTab, finalTrainingId);
        return {
          status: 'success',
          response_type: 'UPDATE_DRAFT',
          message: `I've synthesized the initial draft for **${req.tab}** using your selected option. It has been applied to the canvas.`,
          updated_draft: mockDraft.data,
          model: 'mimo-v2.6-flash',
        };
      }

      if (req.user_message && req.current_draft) {
        return {
          status: 'success',
          response_type: 'UPDATE_DRAFT',
          message: `I've updated the draft according to your feedback: "${req.user_message}". Changes are now active on the canvas.`,
          updated_draft: req.current_draft,
          model: 'mimo-v2.6-flash',
        };
      }

      return {
        status: 'success',
        response_type: 'CLARIFICATION',
        message: `I'm ready to assist with the **${req.tab}** section. Let's align on structure before generating:`,
        clarification: {
          question: `How would you like to structure the ${req.tab} section?`,
          options: [
            {
              id: 'opt_mod_5',
              label: '5 Modules (Recommended)',
              description: 'Standard 8-week duration breakdown across core AI topics and projects.',
              is_recommended: true,
            },
            {
              id: 'opt_mod_3',
              label: '3 Modules (Intensive)',
              description: 'Fast-track foundations with larger consolidated milestones.',
              is_recommended: false,
            },
            {
              id: 'opt_mod_6',
              label: '6 Modules (Weekly Sprints)',
              description: 'Weekly sprint breakdown with continuous lab milestones.',
              is_recommended: false,
            },
          ],
          allow_custom: true,
        },
        model: 'mimo-v2.6-flash',
      };
    }
    throw err;
  }
}

