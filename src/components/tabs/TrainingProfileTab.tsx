import React, { useState, useEffect } from 'react';
import { TrainingData } from '../../types';
import { AccordionItem, AccordionGroup } from '../ui/Accordion';
import { Sparkles, RefreshCw } from 'lucide-react';
import { generateTabDraft, getCachedDraft, TabDraftResponse, TrainingProfileDraftData, getActiveTrainingId } from '../../api/tabs';
import { AiDraftCard, AiErrorBanner } from '../ui/AiDraftCard';

interface TrainingProfileTabProps {
  data: TrainingData;
  onUpdateData?: (updated: any) => void;
}

export const TrainingProfileTab: React.FC<TrainingProfileTabProps> = ({ data, onUpdateData }) => {
  const { trainingProfile, objectives, training } = data as any;
  const trainingId = getActiveTrainingId(training?.id);

  const [currentScope, setCurrentScope] = useState<string>(
    trainingProfile?.scope ||
      'The AI/ML Residency Program is a two-month, project-based training program designed to provide participants with practical experience in the end-to-end development, deployment, and optimization of machine learning models and AI systems.'
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState<TabDraftResponse<TrainingProfileDraftData> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for cached draft on mount
  useEffect(() => {
    getCachedDraft<TrainingProfileDraftData>('training-profile', trainingId).then((draft) => {
      if (draft && draft.data?.scope) {
        setAiDraft(draft);
      }
    });
  }, [trainingId]);

  const handleGenerate = async () => {
    if (isGenerating) return; // Prevent duplicate submissions
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await generateTabDraft<TrainingProfileDraftData>('training-profile', trainingId);
      setAiDraft(response);
    } catch (err: any) {
      setErrorMessage(err.message || 'AI model unavailable. Try again in a moment.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyDraft = () => {
    if (aiDraft?.data?.scope) {
      setCurrentScope(aiDraft.data.scope);
      if (onUpdateData) {
        onUpdateData({
          ...data,
          trainingProfile: {
            ...trainingProfile,
            scope: aiDraft.data.scope,
          },
        });
      }
      setAiDraft(null);
    }
  };

  return (
    <div className="px-[7%] py-10 mb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-md md:text-xl text-black mb-1 font-semibold">Training Profile</h1>
          <h2 className="text-md md:text-lg text-gray-500 font-normal">
            The Training Profile section is designed to provide a comprehensive overview of a training program.
          </h2>
        </div>

        {/* AI Generator Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 self-start md:self-auto"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-cyan-200" />
          )}
          <span>{isGenerating ? 'Generating Scope... (may take up to 3 min)' : 'Suggest with AI'}</span>
        </button>
      </div>

      {/* Error banner if precondition/provider fails */}
      {errorMessage && (
        <AiErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {/* AI Draft Suggestion Box */}
      {aiDraft && aiDraft.data?.scope && (
        <AiDraftCard
          title="Suggested Training Scope"
          model={aiDraft.model || 'gemma4:31b-cloud'}
          source={aiDraft.source}
          isLoading={isGenerating}
          onApply={handleApplyDraft}
          onDismiss={() => setAiDraft(null)}
          onRegenerate={handleGenerate}
        >
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wider">
              Proposed Scope:
            </h4>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
              {aiDraft.data.scope}
            </p>
          </div>
        </AiDraftCard>
      )}

      {/* Keywords section */}
      <div className="border-[0.5px] border-[#CED4DA] rounded-md p-6 bg-white mb-4">
        <h3 className="text-gray-900 font-semibold text-md md:text-lg mb-3">Keywords</h3>
        <div className="flex flex-wrap gap-2">
          {trainingProfile?.keywords?.map((kw: string, idx: number) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#1D4ED8] text-white"
            >
              {kw}
            </span>
          )) || (
            <>
              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#1D4ED8] text-white">
                AI
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#1D4ED8] text-white">
                ML
              </span>
            </>
          )}
        </div>
      </div>

      <AccordionGroup className="space-y-4">
        {/* Scope */}
        <AccordionItem title="Scope" defaultOpen={true}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-gray-700 font-medium">Scope Description:</h4>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Refine with AI
              </button>
            </div>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-line">
              {currentScope}
            </p>
          </div>
        </AccordionItem>

        {/* Attendance Requirement */}
        <AccordionItem title="Attendance Requirement">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Minimum Attendance Percentage:</h4>
            <p className="text-gray-600 text-sm md:text-base font-semibold">
              {trainingProfile?.attendanceRequirementPercentage || 80}%
            </p>
          </div>
        </AccordionItem>

        {/* Assessment Result Requirement */}
        <AccordionItem title="Assessment Result Requirement">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Minimum Passing Percentage:</h4>
            <p className="text-gray-600 text-sm md:text-base font-semibold">
              {trainingProfile?.assessmentResultPercentage || 90}%
            </p>
          </div>
        </AccordionItem>

        {/* Competency Outcomes */}
        <AccordionItem title="Competency Outcomes">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">
              Competency Outcomes / Professional Background:
            </h4>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              {trainingProfile?.professionalBackground ||
                'Upon successful completion of Phase 1 of the AI/ML Residency Program, residents will be able to collaborate in engineering teams, build production-grade AI solutions, and deploy machine learning models.'}
            </p>
          </div>
        </AccordionItem>

        {/* Alignment with Standard */}
        <AccordionItem title="Alignment with Standard">
          <div className="space-y-3">
            {trainingProfile?.alignmentsWithStandard?.map((std: any) => (
              <div key={std.id} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                <p className="font-medium text-gray-900">{std.name}</p>
                {std.description && std.description !== std.name && (
                  <p className="text-sm text-gray-500 mt-1">{std.description}</p>
                )}
              </div>
            )) || <p className="text-gray-600 text-sm">EDGE training standard guideline</p>}
          </div>
        </AccordionItem>

        {/* Prior Knowledge */}
        <AccordionItem title="Prior Knowledge">
          <div className="space-y-2">
            {trainingProfile?.priorKnowledgeList?.map((pk: string, idx: number) => (
              <span
                key={idx}
                className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm mr-2 mb-2"
              >
                {pk}
              </span>
            )) || <p className="text-gray-600 text-sm">AI and ML Basics</p>}
          </div>
        </AccordionItem>

        {/* Learning Style Preferences */}
        <AccordionItem title="Learning Style Preferences">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trainingProfile?.learnerStylePreferences?.map((style: any) => (
              <div key={style.id} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                <p className="font-medium text-gray-900">{style.name}</p>
                {style.description && (
                  <p className="text-sm text-gray-500 mt-1">{style.description}</p>
                )}
              </div>
            ))}
          </div>
        </AccordionItem>

        {/* Delivery Tools */}
        <AccordionItem title="Delivery Tools">
          <div className="space-y-3">
            {trainingProfile?.deliveryTools?.map((tool: any) => (
              <div key={tool.id} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                <p className="font-medium text-gray-900">{tool.name.trim()}</p>
                {tool.description && (
                  <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                )}
              </div>
            ))}
          </div>
        </AccordionItem>

        {/* Technological Requirements */}
        <AccordionItem title="Technological Requirements">
          <div className="space-y-4">
            <div>
              <h4 className="text-gray-700 font-medium mb-2">Learner Technological Requirements:</h4>
              <div className="space-y-2">
                {trainingProfile?.learnerTechnologicalRequirements?.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-2.5 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700"
                  >
                    <span className="font-semibold">{req.name}</span>
                    {req.description && req.description !== 'None' && ` - ${req.description}`}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-gray-700 font-medium mb-2">
                Instructor Technological Requirements:
              </h4>
              <div className="space-y-2">
                {trainingProfile?.instructorTechnologicalRequirements?.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-2.5 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700"
                  >
                    <span className="font-semibold">{req.name}</span>
                    {req.description && req.description !== 'None' && ` - ${req.description}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AccordionItem>

        {/* Training Objectives */}
        <AccordionItem title="Training Objectives">
          <div className="space-y-4">
            {objectives?.generalObjective && (
              <div>
                <h4 className="text-gray-700 font-medium mb-1">General Objective:</h4>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                  {typeof objectives.generalObjective === 'string'
                    ? objectives.generalObjective
                    : objectives.generalObjective.definition}
                </p>
              </div>
            )}
            {objectives?.specificObjectives && objectives.specificObjectives.length > 0 && (
              <div>
                <h4 className="text-gray-700 font-medium mb-2">Specific Objectives:</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm md:text-base">
                  {objectives.specificObjectives.map((obj: any, idx: number) => (
                    <li key={obj.id || idx} className="leading-relaxed">
                      {obj.definition}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AccordionItem>
      </AccordionGroup>
    </div>
  );
};
