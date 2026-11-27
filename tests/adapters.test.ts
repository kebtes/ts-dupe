// tests/adapters.test.ts
//
// Focused tests for the backend→frontend response adapters (src/api/adapters.ts).
// Local fixtures only: payloads mirror the authoritative backend contract in
// service/tab_generation/schemas.py. No network or model calls are made.

import { describe, it, expect } from 'vitest';
import {
  normalizeTrainingProfileDraft,
  normalizeModuleDraft,
  normalizeSurveyDraft,
  normalizeAssessmentDraft,
  normalizeContentDescriptionDraft,
  normalizeTabDraft,
  moduleNameForTarget,
  type BackendTabEnvelope,
} from '../src/api/adapters';

// ---------------------------------------------------------------------------
// Fixtures (backend contract shapes)
// ---------------------------------------------------------------------------

const trainingProfileFixture = {
  keywords: ['AI', 'ethics'],
  scope: 'A residency program covering end-to-end machine learning development.',
  attendance_threshold: 80.0,
  assessment_threshold: 70.0,
  alignment_standards: ['ISO 9001'],
  delivery_tools: ['Zoom'],
  tech_requirements: ['Laptop'],
  prior_knowledge: ['Python basics'],
  learning_styles: ['Hands-on'],
  objectives: ['Build and deploy ML models.'],
};

const moduleFixture = {
  modules: [
    {
      title: 'Module 1: Foundations',
      practical_assignment: {
        title: 'Lab 1: Setup',
        description: 'Configure the local development environment completely.',
        evidence_of_completion: 'Screenshot of a working container.',
      },
      lessons: [
        { title: 'Lesson 1: Overview', objective: 'Understand the system architecture.', duration: 20, duration_type: 'MINUTES' },
        { title: 'Lesson 2: Tooling', objective: 'Install and configure required tooling.', duration: 30, duration_type: 'MINUTES' },
      ],
    },
    {
      title: 'Module 2: Applied ML',
      lessons: [
        { title: 'Lesson 1: Embeddings', objective: 'Build semantic vector embeddings.', duration: 45, duration_type: 'MINUTES' },
      ],
    },
  ],
};

const surveyFixture = {
  sections: [
    {
      title: 'Delivery Experience',
      questions: [
        { prompt: 'The objectives were clear.', type: 'SINGLE_CHOICE', options: ['Agree', 'Disagree'] },
        { prompt: 'The pace was appropriate.', type: 'SINGLE_CHOICE', options: ['Agree', 'Disagree'] },
      ],
    },
    {
      title: 'Open Feedback',
      questions: [
        { prompt: 'What would you improve?', type: 'TEXT' },
        { prompt: 'Which labs helped most?', type: 'MULTIPLE_CHOICE', options: ['Lab 1', 'Lab 2'] },
      ],
    },
  ],
};

const rubricLevels = [
  { level: 'Excellent', points: 3, description: 'Fully working and documented.' },
  { level: 'Needs improvement', points: 1, description: 'Incomplete submission.' },
];

const rubric = (moduleTitle: string) => ({
  module_title: moduleTitle,
  practical_assignment_title: `Lab for ${moduleTitle}`,
  linked_objectives: [`Objective of ${moduleTitle}`],
  criteria: `Completes the practical assignment of ${moduleTitle}.`,
  performance_levels: rubricLevels,
  source: 'ai-generated-from-module-practical-assignment',
});

const assessmentFixture = {
  sections: [
    {
      title: 'Knowledge Check',
      questions: [
        {
          prompt: 'Which mechanism decouples producers and consumers?',
          type: 'MULTIPLE_CHOICE',
          weight: 2.0,
          options: ['Message queue', 'HTTP polling', 'Shared file'],
          correct_answer: 'Message queue',
        },
        {
          prompt: 'Graded by rubric.',
          type: 'RUBRIC',
          weight: 1.0,
          rubric: { criteria: 'Completeness of the lab report.', performance_levels: rubricLevels },
        },
      ],
    },
    {
      title: 'Scenario Check',
      questions: [
        {
          prompt: 'Why are multi-stage builds recommended?',
          type: 'MULTIPLE_CHOICE',
          options: ['Smaller images', 'Faster CPU'],
          correct_answer: 'Smaller images',
        },
      ],
    },
  ],
  module_rubrics: [
    rubric('Module 1: Foundations'),
    rubric('Module 2: Applied ML'),
    rubric('Module 3: Deployment'),
    rubric('Module 4: Monitoring'),
    rubric('Module 5: Capstone'),
  ],
};

// ---------------------------------------------------------------------------
// 1. Training Profile normalization
// ---------------------------------------------------------------------------

describe('normalizeTrainingProfileDraft', () => {
  it('preserves the scope and backend details', () => {
    const result = normalizeTrainingProfileDraft(trainingProfileFixture);
    expect(result.scope).toBe(trainingProfileFixture.scope);
    expect(result.details?.attendance_threshold).toBe(80.0);
    expect(result.details?.assessment_threshold).toBe(70.0);
    expect(result.details?.objectives).toEqual(['Build and deploy ML models.']);
    expect(result.details?.keywords).toEqual(['AI', 'ethics']);
  });

  it('keeps scope-only data compatible when no details exist', () => {
    const result = normalizeTrainingProfileDraft({ scope: 'Only a scope.' });
    expect(result.scope).toBe('Only a scope.');
    expect(result.details).toBeUndefined();
  });

  it('handles missing data safely', () => {
    const result = normalizeTrainingProfileDraft({});
    expect(result.scope).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 2. Module lesson-to-topic conversion
// ---------------------------------------------------------------------------

describe('normalizeModuleDraft', () => {
  it('wraps flat backend lessons into the frontend topic structure', () => {
    const result = normalizeModuleDraft(moduleFixture);
    expect(result.modules).toHaveLength(2);
    const first = result.modules[0];
    expect(first.title).toBe('Module 1: Foundations');
    expect(first.topics).toHaveLength(1);
    expect(first.topics[0].lessons).toHaveLength(2);
    expect(first.topics[0].lessons[0]).toEqual({
      id: 'lesson-1-1',
      title: 'Lesson 1: Overview',
      objective: 'Understand the system architecture.',
      duration: 20,
      duration_type: 'MINUTES',
      order: 1,
    });
  });

  it('generates deterministic presentation ids and ordering', () => {
    const result = normalizeModuleDraft(moduleFixture);
    expect(result.modules.map((m) => m.id)).toEqual(['mod-1', 'mod-2']);
    expect(result.modules.map((m) => m.order)).toEqual([1, 2]);
    expect(result.modules[1].topics[0].lessons[0].id).toBe('lesson-2-1');
    // Second run is identical (deterministic)
    expect(normalizeModuleDraft(moduleFixture)).toEqual(result);
  });

  it('preserves lesson titles, objectives, durations and duration types', () => {
    const result = normalizeModuleDraft(moduleFixture);
    const lessons = result.modules[0].topics[0].lessons;
    expect(lessons.map((l) => l.title)).toEqual(['Lesson 1: Overview', 'Lesson 2: Tooling']);
    expect(lessons.map((l) => l.objective)).toEqual([
      'Understand the system architecture.',
      'Install and configure required tooling.',
    ]);
    expect(lessons.map((l) => l.duration)).toEqual([20, 30]);
    expect(lessons.every((l) => l.duration_type === 'MINUTES')).toBe(true);
  });

  it('does not invent a module description when the backend omits it', () => {
    const result = normalizeModuleDraft(moduleFixture);
    expect(result.modules[0].description).toBe('');
    expect(result.modules[1].description).toBe('');
  });

  it('preserves practical assignments verbatim', () => {
    const result = normalizeModuleDraft(moduleFixture);
    expect(result.modules[0].practical_assignment).toEqual(moduleFixture.modules[0].practical_assignment);
    expect(result.modules[1].practical_assignment).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Survey section flattening
// ---------------------------------------------------------------------------

describe('normalizeSurveyDraft', () => {
  it('flattens sections into a deterministic ordered question list', () => {
    const result = normalizeSurveyDraft(surveyFixture);
    expect(result.questions).toHaveLength(4);
    expect(result.questions.map((q) => q.order)).toEqual([1, 2, 3, 4]);
  });

  it('maps prompt to question and preserves types, options, and section titles', () => {
    const result = normalizeSurveyDraft(surveyFixture);
    expect(result.questions[0].question).toBe('The objectives were clear.');
    expect(result.questions[0].type).toBe('SINGLE_CHOICE');
    expect(result.questions[0].options).toEqual(['Agree', 'Disagree']);
    expect(result.questions[0].sectionTitle).toBe('Delivery Experience');
    expect(result.questions[2].type).toBe('TEXT');
    expect(result.questions[2].options).toBeUndefined();
    expect(result.questions[3].sectionTitle).toBe('Open Feedback');
    expect(result.questions[3].options).toEqual(['Lab 1', 'Lab 2']);
  });

  it('does not invent questions when sections are empty', () => {
    expect(normalizeSurveyDraft({ sections: [] }).questions).toEqual([]);
    expect(normalizeSurveyDraft({}).questions).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4+5. Assessment question/option mapping and correct-answer mapping
// ---------------------------------------------------------------------------

describe('normalizeAssessmentDraft', () => {
  it('maps prompt to question and converts string options into option objects', () => {
    const result = normalizeAssessmentDraft(assessmentFixture);
    expect(result.questions).toHaveLength(3);
    const first = result.questions[0];
    expect(first.question).toBe('Which mechanism decouples producers and consumers?');
    expect(first.options.map((o) => o.text)).toEqual(['Message queue', 'HTTP polling', 'Shared file']);
    expect(first.weight).toBe(2.0);
    expect(first.sectionTitle).toBe('Knowledge Check');
  });

  it('derives is_correct by exact comparison with correct_answer only', () => {
    const result = normalizeAssessmentDraft(assessmentFixture);
    const first = result.questions[0];
    expect(first.options.map((o) => o.is_correct)).toEqual([true, false, false]);
    const third = result.questions[2];
    expect(third.options.map((o) => o.is_correct)).toEqual([true, false]);
  });

  it('never invents rationales or lesson ids', () => {
    const result = normalizeAssessmentDraft(assessmentFixture);
    for (const q of result.questions) {
      expect(q.lesson_id).toBeUndefined();
      for (const opt of q.options) {
        expect(opt.rationale).toBeUndefined();
      }
    }
  });

  it('preserves rubric-type questions with their backend rubric', () => {
    const result = normalizeAssessmentDraft(assessmentFixture);
    const rubricQuestion = result.questions[1];
    expect(rubricQuestion.type).toBe('RUBRIC');
    expect(rubricQuestion.rubric?.criteria).toBe('Completeness of the lab report.');
    expect(rubricQuestion.rubric?.performance_levels).toEqual(rubricLevels);
    expect(rubricQuestion.options).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 6. Preservation of all five module rubrics
// ---------------------------------------------------------------------------

describe('module rubrics preservation', () => {
  it('preserves all five rubrics with criteria and performance levels', () => {
    const result = normalizeAssessmentDraft(assessmentFixture);
    expect(result.module_rubrics).toHaveLength(5);
    result.module_rubrics.forEach((r, i) => {
      expect(r.module_title).toBe(assessmentFixture.module_rubrics[i].module_title);
      expect(r.criteria).toBe(assessmentFixture.module_rubrics[i].criteria);
      expect(r.performance_levels).toEqual(rubricLevels);
      expect(r.linked_objectives).toEqual(assessmentFixture.module_rubrics[i].linked_objectives);
      expect(r.practical_assignment_title).toBe(assessmentFixture.module_rubrics[i].practical_assignment_title);
      expect(r.source).toBe('ai-generated-from-module-practical-assignment');
    });
  });

  it('defaults to an empty rubric list when the backend omits them', () => {
    const result = normalizeAssessmentDraft({ sections: assessmentFixture.sections });
    expect(result.module_rubrics).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 8. Content Description normalization
// ---------------------------------------------------------------------------

describe('normalizeContentDescriptionDraft', () => {
  it('associates the description with the actual selected target', () => {
    const target = { kind: 'lesson', id: 'lesson-db-42', title: 'Lesson 2: Tooling' };
    const result = normalizeContentDescriptionDraft({ description: 'A walkthrough.' }, target);
    expect(result.target).toEqual(target);
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]).toEqual({
      lesson_id: 'lesson-db-42',
      lesson_title: 'Lesson 2: Tooling',
      content_description: 'A walkthrough.',
      key_takeaways: [],
    });
  });

  it('does not invent takeaways or a target title', () => {
    const result = normalizeContentDescriptionDraft({ description: 'Text.' }, { kind: 'module', id: 'm-1' });
    expect(result.contents[0].lesson_title).toBe('');
    expect(result.contents[0].key_takeaways).toEqual([]);
  });

  it('handles a missing target safely', () => {
    const result = normalizeContentDescriptionDraft({ description: 'Text.' }, null);
    expect(result.target).toBeNull();
    expect(result.contents[0].lesson_id).toBe('');
    expect(result.contents[0].content_description).toBe('Text.');
  });
});

// ---------------------------------------------------------------------------
// 7. Uncovered-lessons handling (envelope level)
// ---------------------------------------------------------------------------

describe('normalizeTabDraft — uncovered lessons', () => {
  it('surfaces uncovered_lessons from the backend envelope', () => {
    const envelope: BackendTabEnvelope = {
      status: 'success',
      tab: 'assessment',
      data: assessmentFixture,
      uncovered_lessons: ['Lesson 3: Monitoring', 'Lesson 4: Capstone'],
      model: 'gemma4:31b-cloud',
    };
    const result = normalizeTabDraft('assessment', envelope, { source: 'backend' });
    expect(result.uncovered_lessons).toEqual(['Lesson 3: Monitoring', 'Lesson 4: Capstone']);
  });

  it('defaults to an empty list when the envelope omits them', () => {
    const result = normalizeTabDraft('assessment', { status: 'success', tab: 'assessment', data: assessmentFixture });
    expect(result.uncovered_lessons).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Envelope dispatch
// ---------------------------------------------------------------------------

describe('normalizeTabDraft dispatch', () => {
  it('marks the response source', () => {
    const backend = normalizeTabDraft('training-profile', { status: 'success', tab: 'training-profile', data: trainingProfileFixture }, { source: 'backend' });
    expect(backend.source).toBe('backend');
    const mock = normalizeTabDraft('training-profile', { status: 'success', tab: 'training-profile', data: trainingProfileFixture }, { source: 'offline-mock' });
    expect(mock.source).toBe('offline-mock');
  });

  it('normalizes the module envelope data through the module adapter', () => {
    const result = normalizeTabDraft('module', { status: 'success', tab: 'module', data: moduleFixture });
    expect((result.data as { modules: { id: string }[] }).modules[0].id).toBe('mod-1');
  });
});

// ---------------------------------------------------------------------------
// Malformed HTTP-200 responses must throw, not render empty cards
// ---------------------------------------------------------------------------

import { DraftValidationError } from '../src/api/adapters';

describe('malformed HTTP-200 responses (minimum usability)', () => {
  it('training-profile: rejects missing or blank scope', () => {
    expect(() => normalizeTabDraft('training-profile', { status: 'success', tab: 'training-profile', data: {} })).toThrow(DraftValidationError);
    expect(() => normalizeTabDraft('training-profile', { status: 'success', tab: 'training-profile', data: { scope: '   ' } })).toThrow(
      'Backend returned an unusable training-profile draft.'
    );
  });

  it('training-profile: accepts a valid scope', () => {
    const result = normalizeTabDraft('training-profile', { status: 'success', tab: 'training-profile', data: { scope: 'A real scope.' } });
    expect((result.data as { scope: string }).scope).toBe('A real scope.');
  });

  it('module: rejects empty payload and title-less modules', () => {
    expect(() => normalizeTabDraft('module', { status: 'success', tab: 'module', data: {} })).toThrow(DraftValidationError);
    expect(() =>
      normalizeTabDraft('module', {
        status: 'success',
        tab: 'module',
        data: { modules: [{ title: '   ', lessons: [{ title: 'L', objective: 'Do the thing well.', duration: 10, duration_type: 'MINUTES' }] }] },
      })
    ).toThrow('Backend returned an unusable module draft.');
  });

  it('module: accepts one valid titled module (contract floor is lenient)', () => {
    const result = normalizeTabDraft('module', {
      status: 'success',
      tab: 'module',
      data: { modules: [{ title: 'Module 1: Valid', lessons: [{ title: 'L1', objective: 'Understand the basics.', duration: 10, duration_type: 'MINUTES' }] }] },
    });
    expect((result.data as { modules: { title: string }[] }).modules).toHaveLength(1);
  });

  it('survey: rejects empty sections and prompt-less questions', () => {
    expect(() => normalizeTabDraft('survey', { status: 'success', tab: 'survey', data: {} })).toThrow('Backend returned an unusable survey draft.');
    expect(() =>
      normalizeTabDraft('survey', {
        status: 'success',
        tab: 'survey',
        data: { sections: [{ title: 'Delivery', questions: [{ prompt: '   ', type: 'TEXT' }] }] },
      })
    ).toThrow(DraftValidationError);
  });

  it('survey: accepts sections with at least one valid question', () => {
    const result = normalizeTabDraft('survey', {
      status: 'success',
      tab: 'survey',
      data: { sections: [{ title: 'Delivery', questions: [{ prompt: 'Was the pace right?', type: 'TEXT' }] }] },
    });
    expect((result.data as { questions: unknown[] }).questions).toHaveLength(1);
  });

  it('assessment: rejects empty sections and prompt-less questions', () => {
    expect(() => normalizeTabDraft('assessment', { status: 'success', tab: 'assessment', data: {} })).toThrow('Backend returned an unusable assessment draft.');
    expect(() =>
      normalizeTabDraft('assessment', {
        status: 'success',
        tab: 'assessment',
        data: { sections: [{ title: 'Knowledge Check', questions: [{ prompt: '', type: 'MULTIPLE_CHOICE', options: ['a', 'b'] }] }] },
      })
    ).toThrow(DraftValidationError);
  });

  it('assessment: accepts a valid question payload', () => {
    const result = normalizeTabDraft('assessment', {
      status: 'success',
      tab: 'assessment',
      data: {
        sections: [{ title: 'Knowledge Check', questions: [{ prompt: 'Q?', type: 'MULTIPLE_CHOICE', options: ['a', 'b'], correct_answer: 'a' }] }],
        module_rubrics: [],
      },
    });
    expect((result.data as { questions: unknown[] }).questions).toHaveLength(1);
  });

  it('content-description: rejects missing or blank descriptions', () => {
    expect(() =>
      normalizeTabDraft('content-description', { status: 'success', tab: 'content-description', data: {} }, { target: { kind: 'lesson', id: 'l-1', title: 'T' } })
    ).toThrow('Backend returned an unusable content-description draft.');
    expect(() =>
      normalizeTabDraft('content-description', { status: 'success', tab: 'content-description', data: { description: '   ' } }, { target: { kind: 'lesson', id: 'l-1', title: 'T' } })
    ).toThrow(DraftValidationError);
  });

  it('content-description: accepts a valid description', () => {
    const result = normalizeTabDraft(
      'content-description',
      { status: 'success', tab: 'content-description', data: { description: 'A walkthrough.' } },
      { target: { kind: 'lesson', id: 'l-1', title: 'Lesson 1' } }
    );
    expect((result.data as { contents: { content_description: string }[] }).contents[0].content_description).toBe('A walkthrough.');
  });

  it('the typed error carries tab and reason', () => {
    try {
      normalizeTabDraft('assessment', { status: 'success', tab: 'assessment', data: {} });
      expect.unreachable('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DraftValidationError);
      const e = err as DraftValidationError;
      expect(e.tab).toBe('assessment');
      expect(e.reason).toContain('no valid questions');
      expect(e.message).toBe('Backend returned an unusable assessment draft.');
    }
  });
});

// ---------------------------------------------------------------------------
// Issue 1: module association by ID (never first-module defaults)
// ---------------------------------------------------------------------------

describe('moduleNameForTarget', () => {
  const structure = {
    modules: [
      { id: 'mod-w0', name: 'Week 0 - Orientation', lessons: [
        { id: 'les-0', name: 'Orientation' },
      ]},
      { id: 'mod-w3', name: 'Week 3 Applied Large Language Models', lessons: [
        { id: 'les-31', name: 'Understanding LLMs' },
        { id: 'les-32', name: 'Fine-Tuning' },
      ]},
      { id: 'mod-w4', name: 'Week 4 Reinforcement Learning-Based Amharic Tokenization', lessons: [
        { id: 'les-41', name: 'Tokenizer Design' },
      ]},
    ],
  } as any;

  it('associates a module target with its own module', () => {
    expect(moduleNameForTarget(
      { kind: 'module', id: 'mod-w3' }, structure,
    )).toBe('Week 3 Applied Large Language Models');
  });

  it('associates a lesson target with its PARENT module', () => {
    expect(moduleNameForTarget(
      { kind: 'lesson', id: 'les-41' }, structure,
    )).toBe('Week 4 Reinforcement Learning-Based Amharic Tokenization');
    expect(moduleNameForTarget(
      { kind: 'lesson', id: 'les-0' }, structure,
    )).toBe('Week 0 - Orientation');
  });

  it('never defaults to the first module', () => {
    // Unknown lesson id resolves to '' — never "Week 0 - Orientation".
    expect(moduleNameForTarget(
      { kind: 'lesson', id: 'les-unknown' }, structure,
    )).toBe('');
    expect(moduleNameForTarget(
      { kind: 'module', id: 'mod-unknown' }, structure,
    )).toBe('');
  });

  it('handles missing structure or targets safely', () => {
    expect(moduleNameForTarget(null, structure)).toBe('');
    expect(moduleNameForTarget({ kind: 'module', id: 'mod-w3' }, null)).toBe('');
    expect(moduleNameForTarget({ kind: 'module', id: '' }, structure)).toBe('');
  });
});
