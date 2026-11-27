import React, { useState, useEffect } from 'react';
import { TrainingData } from '../../types';
import { Plus, MoreVertical, Eye, CheckCircle2, Sparkles, RefreshCw, HelpCircle, AlertCircle } from 'lucide-react';
import { generateTabDraft, getCachedDraft, TabDraftResponse, AssessmentDraftData, getActiveTrainingId } from '../../api/tabs';
import { normalizeTabDraft } from '../../api/adapters';
import { AiDraftCard, AiErrorBanner } from '../ui/AiDraftCard';

interface AssessmentTabProps {
  data: TrainingData;
  onUpdateData?: (updated: any) => void;
  /** Draft pushed by the Curriculum Copilot (backend-shape payload). */
  suggestedDraft?: any;
  onDismissDraft?: () => void;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ data, onUpdateData, suggestedDraft, onDismissDraft }) => {
  const [assessments, setAssessments] = useState(data.assessments || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('INDIVIDUAL');
  const [weight, setWeight] = useState(10);

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState<TabDraftResponse<AssessmentDraftData> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trainingId = getActiveTrainingId(data.training?.id);

  // Check cached draft on mount
  useEffect(() => {
    getCachedDraft<AssessmentDraftData>('assessment', trainingId).then((draft) => {
      if (draft && draft.data?.questions?.length) {
        setAiDraft(draft);
      }
    });
  }, [trainingId]);

  // Sync draft pushed by the Curriculum Copilot (backend-shape payload),
  // normalized through the same adapter/validation pipeline.
  useEffect(() => {
    if (!suggestedDraft) return;
    try {
      const normalized = normalizeTabDraft(
        'assessment',
        { status: 'success', tab: 'assessment', data: suggestedDraft },
        { source: 'backend' }
      );
      setAiDraft(normalized as TabDraftResponse<AssessmentDraftData>);
    } catch {
      // DraftValidationError: unusable payload — no empty card, no error spam.
    }
  }, [suggestedDraft]);

  const handleGenerate = async () => {
    // Prerequisite check from guide: Modules and lessons must exist
    if (!data.modules || data.modules.length === 0) {
      setErrorMessage('Please generate/save the earlier tab first (Modules and lessons must exist before generating assessments).');
      return;
    }
    if (isGenerating) return; // Prevent duplicate submissions

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await generateTabDraft<AssessmentDraftData>('assessment', trainingId);
      setAiDraft(response);
    } catch (err: any) {
      setErrorMessage(err.message || 'AI model unavailable. Try again in a moment.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyDraft = () => {
    if (aiDraft?.data?.questions) {
      const newAssessments = aiDraft.data.questions.map((q, idx) => ({
        id: `ass-ai-${idx}-${Date.now()}`,
        name: `AI Quiz: ${q.question.slice(0, 50)}...`,
        type: 'MCQ_QUIZ',
        target: 'INDIVIDUAL',
        weight: Math.round(100 / (aiDraft.data.questions.length || 1)),
        assignedTo: 'All Cohorts',
        cohort: 'Residency Cohort 1',
        approvalStatus: 'APPROVED',
        mcqDetails: q,
      }));

      const updated = [...newAssessments as any, ...assessments];
      setAssessments(updated);
      if (onUpdateData) {
        onUpdateData({ ...data, assessments: updated });
      }
      setAiDraft(null);
      onDismissDraft?.();
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newAss = {
      id: `ass-${Date.now()}`,
      name,
      type: 'SELF_GRADED',
      target,
      weight,
      assignedTo: 'Not assigned',
      cohort: 'Not assigned',
      approvalStatus: 'APPROVED',
    };
    const updated = [...assessments, newAss as any];
    setAssessments(updated);
    if (onUpdateData) {
      onUpdateData({ ...data, assessments: updated });
    }
    setName('');
    setIsModalOpen(false);
  };

  return (
    <div className="px-[7%] py-10 mb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-md md:text-xl text-black mb-1 font-semibold">Assessment</h1>
          <h2 className="text-md md:text-lg text-gray-500 font-normal">
            Manage course assessments, rubrics, weightings, and AI-suggested quizzes
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* AI Generator Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-200" />
            )}
            <span>{isGenerating ? 'Generating... (may take up to 3 min)' : 'Generate Quizzes with AI'}</span>
          </button>

          {/* Manual Add Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Assessment</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <AiErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {/* AI Draft Suggestion Box */}
      {aiDraft && aiDraft.data?.questions && (
        <AiDraftCard
          title="Suggested Assessments & Module Rubrics"
          model={aiDraft.model || 'gemma4:31b-cloud'}
          source={aiDraft.source}
          warnings={aiDraft.warnings}
          isLoading={isGenerating}
          onApply={handleApplyDraft}
          onDismiss={() => {
            setAiDraft(null);
            onDismissDraft?.();
          }}
          onRegenerate={handleGenerate}
        >
          <div className="space-y-4">
            {/* Uncovered lessons warning from the backend envelope */}
            {aiDraft.uncovered_lessons && aiDraft.uncovered_lessons.length > 0 && (
              <div className="flex items-start gap-2.5 border border-amber-300 bg-amber-50 text-amber-900 rounded-lg p-3 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wide">Lessons without lesson-linked content</p>
                  <p className="mt-0.5">
                    These recorded lessons have no lesson-linked content item,
                    so their assessment coverage may be limited (they can only
                    be assessed on their recorded topic): {aiDraft.uncovered_lessons.join(', ')}.
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              The AI generated {aiDraft.data.questions.length} assessment question(s); the correct answer is
              marked. It also produced {aiDraft.data.module_rubrics.length} module rubric(s).
            </p>

            <div className="space-y-3">
              {aiDraft.data.questions.map((q, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="font-bold text-gray-900 text-sm">{q.question}</p>
                  </div>
                  <span className="ml-6 text-[10px] text-gray-400 font-mono uppercase">
                    {q.type}
                    {typeof q.weight === 'number' ? ` · weight ${q.weight}` : ''}
                    {q.sectionTitle ? ` · ${q.sectionTitle}` : ''}
                  </span>

                  {q.type.toUpperCase() === 'RUBRIC' && q.rubric ? (
                    <div className="ml-6 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded space-y-1.5">
                      <p className="text-[11px] font-semibold text-indigo-900">Criteria: {q.rubric.criteria}</p>
                      {q.rubric.performance_levels.map((lvl, li) => (
                        <div key={li} className="text-[11px] text-gray-700">
                          <span className="font-semibold">{lvl.level}</span> ({lvl.points} pts) — {lvl.description}
                        </div>
                      ))}
                    </div>
                  ) : (
                    q.options.length > 0 && (
                      <div className="space-y-1.5 ml-6">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`p-2 rounded border transition-colors ${
                              opt.is_correct
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                                : 'bg-white border-gray-200 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{opt.text}</span>
                              {opt.is_correct && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  CORRECT
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>

            {/* Module Rubrics (one per generated module, preserved from the backend) */}
            {aiDraft.data.module_rubrics.length > 0 && (
              <div className="pt-2 border-t border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Module Rubrics ({aiDraft.data.module_rubrics.length})
                </h4>
                <p className="text-[11px] text-gray-500">
                  One grading rubric per generated module, derived from its practical assignment.
                </p>
                {aiDraft.data.module_rubrics.map((rubric, ri) => (
                  <div key={ri} className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-lg space-y-2 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <h5 className="font-bold text-gray-900 text-sm">{rubric.module_title}</h5>
                      <span className="text-[10px] font-mono bg-white text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                        {rubric.source}
                      </span>
                    </div>
                    {rubric.practical_assignment_title && (
                      <p className="text-[11px] text-gray-700">
                        <strong>Practical assignment:</strong> {rubric.practical_assignment_title}
                      </p>
                    )}
                    {rubric.linked_objectives?.length > 0 && (
                      <p className="text-[11px] text-gray-700">
                        <strong>Linked objectives:</strong> {rubric.linked_objectives.join(' | ')}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-700">
                      <strong>Criteria:</strong> {rubric.criteria}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-[11px] border border-indigo-100 bg-white rounded">
                        <thead>
                          <tr className="bg-indigo-50 text-indigo-900">
                            <th className="px-2 py-1 text-left border-b border-indigo-100">Level</th>
                            <th className="px-2 py-1 text-left border-b border-indigo-100">Points</th>
                            <th className="px-2 py-1 text-left border-b border-indigo-100">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rubric.performance_levels.map((lvl, li) => (
                            <tr key={li} className="border-b border-indigo-50 last:border-b-0">
                              <td className="px-2 py-1 font-semibold text-gray-900">{lvl.level}</td>
                              <td className="px-2 py-1 text-gray-700">{lvl.points}</td>
                              <td className="px-2 py-1 text-gray-600">{lvl.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AiDraftCard>
      )}

      {/* Table */}
      <div className="bg-white border-[0.5px] border-[#CED4DA] rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full caption-bottom text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#CED4DA] bg-gray-50">
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">
                Assessment Type
              </th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Target</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Weight</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Assigned To</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Cohort</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">
                Approval Status
              </th>
              <th className="py-4 px-5 text-right text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assessments.map((item: any) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50/70 transition-colors duration-150"
              >
                <td className="py-4 px-5 font-semibold text-gray-900 max-w-xs">{item.name}</td>
                <td className="py-4 px-5 text-gray-600 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {item.type === 'SELF_GRADED'
                        ? 'Self-graded'
                        : item.type === 'MCQ_QUIZ'
                        ? 'AI MCQ Quiz'
                        : item.type}
                    </span>
                    <span className="text-xs text-gray-500">Admin only</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-gray-700 whitespace-nowrap capitalize">
                  {item.target ? item.target.toLowerCase() : 'Individual'}
                </td>
                <td className="py-4 px-5 text-gray-900 font-semibold whitespace-nowrap">
                  {item.weight || 0}%
                </td>
                <td className="py-4 px-5 text-gray-500 whitespace-nowrap">
                  {item.assignedTo || 'Not assigned'}
                </td>
                <td className="py-4 px-5 text-gray-500 whitespace-nowrap">
                  {item.cohort || 'Not assigned'}
                </td>
                <td className="py-4 px-5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{item.approvalStatus || 'Approved'}</span>
                  </span>
                </td>
                <td className="py-4 px-5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="View assessment"
                      className="p-1.5 text-gray-400 hover:text-brand hover:bg-blue-50 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      title="More options"
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">New Assessment</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Capstone Research Project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Target</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="GROUP">Group</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Weight (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
