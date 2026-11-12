import { MOCK_TRAINING_DATA } from '../../data/mockData';

export interface RagSource {
  title: string;
  section: string;
  snippet: string;
}

export interface RagResponse {
  answer: string;
  sources: RagSource[];
}

interface KnowledgeDoc {
  title: string;
  section: string;
  text: string;
  keywords: string[];
}

const buildKnowledgeBase = (): KnowledgeDoc[] => {
  const docs: KnowledgeDoc[] = [];
  const { training, trainingProfile, audienceProfile, modules, assessments, contents } = MOCK_TRAINING_DATA as any;

  // Overview / Basic Info
  docs.push({
    title: 'Training Overview & Rationale',
    section: 'Overview > Basic Information',
    text: `${training.title}. ${training.rationale} Duration: ${training.duration} ${training.durationType}. Delivery: ${training.deliveryMethod}. Start: ${training.startDate}, End: ${training.endDate}. Participants: ${training.totalParticipants}. Location: ${training.zones?.[0]?.name}, ${training.zones?.[0]?.region?.name}, Ethiopia.`,
    keywords: ['overview', 'rationale', 'about', 'summary', 'program', 'duration', 'date', 'start', 'end', 'location', 'participants', 'addis', 'bole'],
  });

  // Training Profile
  docs.push({
    title: 'Training Profile & Requirements',
    section: 'Training Profile > Requirements & Scope',
    text: `Scope: ${trainingProfile.scope}. Attendance Requirement: ${trainingProfile.attendanceRequirementPercentage}%. Minimum Passing Score: ${trainingProfile.assessmentResultPercentage}%. Competencies: ${trainingProfile.professionalBackground}. Prior Knowledge: ${trainingProfile.priorKnowledgeList?.join(', ')}.`,
    keywords: ['scope', 'attendance', 'percentage', 'passing', 'score', 'competencies', 'prior knowledge', 'requirements', 'standard', 'result'],
  });

  // Audience Profile
  docs.push({
    title: 'Audience Profile & Eligibility',
    section: 'Audience Profile > Learner Characteristics',
    text: `Target Audience: Learner level is ${audienceProfile.learnerLevel?.name} (${audienceProfile.learnerLevel?.description}). Required Education: ${audienceProfile.educationLevel?.name}. Language: ${audienceProfile.language?.name}. Work Experience: ${audienceProfile.workExperience?.name}. Gender distribution: 50% Male, 50% Female. Age ranges: 18-24, 25-29, 30-35 years.`,
    keywords: ['audience', 'eligibility', 'learner', 'education', 'degree', 'language', 'experience', 'gender', 'age', 'qualification', 'level'],
  });

  // Modules
  modules.forEach((mod: any) => {
    docs.push({
      title: mod.name,
      section: `Modules > ${mod.name}`,
      text: `${mod.name}: ${mod.description}`,
      keywords: ['module', 'week', 'curriculum', 'schedule', ...mod.name.toLowerCase().split(/\s+/)],
    });
  });

  // Assessments
  const assessText = assessments
    .map((a: any) => `${a.name} (${a.type}, Target: ${a.target}, Weight: ${a.weight}%, Status: ${a.approvalStatus})`)
    .join('; ');
  docs.push({
    title: 'Assessment Rubric & Projects',
    section: 'Assessments > Grading & Weights',
    text: `Total assessments: ${assessments.length}. List: ${assessText}. Minimum required score to pass is ${trainingProfile.assessmentResultPercentage}%.`,
    keywords: ['assessment', 'grading', 'rubric', 'weight', 'score', 'exam', 'project', 'test', 'assignment', 'evaluation'],
  });

  // Contents
  const contentText = (contents || [])
    .map((c: any) => `${c.name} (${c.contentFileType}, Level: ${c.contentLevel}, Status: ${c.contentStatus})`)
    .join('; ');
  docs.push({
    title: 'Course Resources & Documents',
    section: 'Content > Learning Materials',
    text: `Course content documents: ${contentText}`,
    keywords: ['content', 'document', 'pdf', 'resource', 'material', 'research', 'paper', 'reading'],
  });

  return docs;
};

const KNOWLEDGE_BASE = buildKnowledgeBase();

export function queryRag(query: string): RagResponse {
  const qLower = query.toLowerCase().trim();
  const words = qLower.split(/\s+/).filter((w) => w.length > 2);

  // Score docs
  const scored = KNOWLEDGE_BASE.map((doc) => {
    let score = 0;
    words.forEach((w) => {
      if (doc.title.toLowerCase().includes(w)) score += 5;
      if (doc.keywords.some((k) => k.includes(w) || w.includes(k))) score += 3;
      if (doc.text.toLowerCase().includes(w)) score += 1;
    });
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topDocs = scored.filter((s) => s.score > 0).slice(0, 2);

  if (topDocs.length === 0) {
    // Fallback general answer
    return {
      answer: `I looked through the curriculum repository for "${query}". The AI/ML Residency Program Training is a 2-month blended course in Addis Ababa, focusing on Predictive Analytics, LLMs, and Reinforcement Learning. You can ask about modules, assessments, audience criteria, or passing grades!`,
      sources: [
        {
          title: 'Training Overview',
          section: 'Overview > Basic Information',
          snippet: 'The AI/ML Residency Program is designed to bridge academic knowledge and industry-ready AI engineering...',
        },
      ],
    };
  }

  const primary = topDocs[0].doc;
  const sources: RagSource[] = topDocs.map((item) => ({
    title: item.doc.title,
    section: item.doc.section,
    snippet: item.doc.text.slice(0, 140) + '...',
  }));

  // Synthesis based on query intent
  let answer = '';

  if (qLower.includes('prerequisite') || qLower.includes('audience') || qLower.includes('qualification') || qLower.includes('who')) {
    answer = `Based on the Audience Profile, the training is targeted at **Advanced learners** holding a **Bachelor's Degree** or Diploma in related STEM fields. It requires prior familiarity with AI & ML basics. Participants are primarily young professionals (18–35 years old), with no prior full-time industry work experience required.`;
  } else if (qLower.includes('module') || qLower.includes('week') || qLower.includes('curriculum')) {
    const modList = (MOCK_TRAINING_DATA as any).modules.map((m: any) => `• **${m.name}**`).join('\n');
    answer = `The curriculum is structured into 6 progressive modules:\n${modList}\n\nEach module includes hands-on engineering challenges and real-world project deliverables.`;
  } else if (qLower.includes('passing') || qLower.includes('grade') || qLower.includes('score') || qLower.includes('attendance') || qLower.includes('requirement')) {
    const tp = (MOCK_TRAINING_DATA as any).trainingProfile;
    answer = `According to the Training Profile guidelines:\n• **Minimum Attendance**: **${tp.attendanceRequirementPercentage}%**\n• **Minimum Assessment Pass Mark**: **${tp.assessmentResultPercentage}%**\n• **Delivery Method**: Blended (Instructor-led virtual & in-person sessions)`;
  } else if (qLower.includes('assessment') || qLower.includes('exam') || qLower.includes('project') || qLower.includes('weight')) {
    answer = `There are 6 graded project assessments, including the **PMS Overdue Task Estimator Project (25% weight)**, **Group Projects (12.5% each)**, and the **Phase 1 Final Research Assignment**. All assessments are currently approved by curriculum administration.`;
  } else if (qLower.includes('duration') || qLower.includes('when') || qLower.includes('date') || qLower.includes('where') || qLower.includes('location')) {
    const tr = (MOCK_TRAINING_DATA as any).training;
    answer = `• **Duration**: ${tr.duration} months (${tr.startDate} to ${tr.endDate})\n• **Location**: Addis Ababa City Administration, Bole Sub City (Ethiopia)\n• **Cohort Size**: ${tr.totalParticipants} residents with 50/50 gender balance`;
  } else {
    answer = `Here is what I found in the **${primary.title}** (${primary.section}):\n\n${primary.text.slice(0, 320)}...`;
  }

  return { answer, sources };
}
