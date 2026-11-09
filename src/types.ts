export interface TrainingData {
  training: {
    id: string;
    title: string;
    rationale: string;
    trainingType?: { id: string; name: string; description: string };
    zones?: Array<{
      id: string;
      name: string;
      description: string;
      region?: {
        id: string;
        name: string;
        country?: { id: string; name: string };
      };
    }>;
    cities?: any[];
    totalParticipants?: number;
    deliveryMethod?: string;
    startDate?: string;
    endDate?: string;
    duration?: number;
    durationType?: string;
    ageGroups?: Array<{ id: string; name: string; range: string; description?: string }>;
    economicBackgrounds?: Array<{ id: string; name: string; description?: string }>;
    academicQualifications?: Array<{ id: string; name: string; description?: string }>;
    genderPercentages?: Array<{ gender: string; percentage: number }>;
    disabilityPercentages?: any[];
    marginalizedGroupPercentages?: any[];
    trainingPurposes?: Array<{ id: string; name: string; description?: string }>;
    trainingTags?: Array<{ id: string; name: string; description?: string }>;
    certificateDescription?: string;
    companyProfile?: any;
  };
  trainingProfile: {
    trainingId?: string;
    keywords?: string[];
    scope?: string;
    attendanceRequirement?: number | string;
    assessmentResultRequirement?: number | string;
    competencyOutcomes?: string[];
    alignmentWithStandard?: any[];
    priorKnowledge?: string[];
    learningStylePreferences?: any[];
    deliveryTools?: any[];
    technologicalRequirements?: any[];
  };
  audienceProfile: {
    id?: string;
    trainingId?: string;
    learnerLevel?: { id: string; name: string; description: string };
    educationLevel?: any;
    workExperience?: any;
    languages?: any[];
    learnerCharacteristics?: string;
    prerequisites?: string[];
  };
  objectives: {
    generalObjective?: { id: string; definition: string } | string;
    specificObjectives?: Array<{ id: string; definition: string }>;
  };
  modules: Array<{
    id: string;
    name: string;
    description: string;
    trainingTag?: any;
    days?: any[];
  }>;
  surveys: Array<{
    id: string;
    name: string;
    type: string;
    description: string;
    sections?: any[];
  }>;
  assessments: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    target?: string;
    weight?: number;
    assignedTo?: string;
    cohort?: string;
    approvalStatus?: string;
  }>;
  contents: Array<{
    id: string;
    name: string;
    description: string;
    contentLevel: string;
    contentFileType: string;
    link?: string;
    contentStatus: string;
    moduleName?: string;
    lessonName?: string;
    contentDeveloper?: {
      email?: string;
      role?: { name: string; colorCode: string };
    };
  }>;
}

export type TabType = 
  | 'overview'
  | 'training_profile'
  | 'audience_profile'
  | 'module'
  | 'survey'
  | 'assessment'
  | 'content';
