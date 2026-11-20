import React, { useState, useEffect } from 'react';
import { TrainingData } from '../../types';
import { Plus, MoreVertical, Eye, CheckCircle2, Sparkles, RefreshCw, HelpCircle } from 'lucide-react';
import { generateTabDraft, getCachedDraft, TabDraftResponse, AssessmentDraftData } from '../../api/tabs';
import { AiDraftCard, AiErrorBanner } from '../ui/AiDraftCard';

interface AssessmentTabProps {
  data: TrainingData;
  onUpdateData?: (updated: any) => void;
  suggestedDraft?: any;
  onDismissDraft?: () => void;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({
  data,
  onUpdateData,
  suggestedDraft,
  onDismissDraft,
}) => {
  const [assessments, setAssessments] = useState(data.assessments || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('INDIVIDUAL');
  const [weight, setWeight] = useState(10);

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState<TabDraftResponse<AssessmentDraftData> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trainingId = data.training?.id || 'd734b694-0802-4a4a-8a51-eaa693a10abd';

  // Sync draft from Copilot
  useEffect(() => {
    if (suggestedDraft?.sections?.length || suggestedDraft?.questions?.length) {
      setAiDraft({
        status: 'success',
        tab: 'assessment',
        data: suggestedDraft,
        model: 'gemma4:31b-cloud',
      });
    }
  }, [suggestedDraft]);

  // Check cached draft on mount
  useEffect(() => {
    getCachedDraft<AssessmentDraftData>('assessment', trainingId).then((draft) => {
      if (draft && (draft.data?.questions?.length || draft.data?.sections?.length)) {
        setAiDraft(draft);
      }
    });
  }, [trainingId]);

  const handleGenerate = async () => {
    // Prerequisite check from guide: Modules and lessons must exist
    if (!data.modules || data.modules.length === 0) {
      setErrorMessage('Please generate/save the earlier tab first (Modules and lessons must exist before generating assessments).');
      return;
    }

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
    if (!aiDraft?.data) return;

    let allQuestions: any[] = [];
    if (aiDraft.data.sections && aiDraft.data.sections.length > 0) {
      aiDraft.data.sections.forEach((sec) => {
        allQuestions.push(
          ...sec.questions.map((q) => ({
            ...q,
            sectionTitle: sec.title,
          }))
        );
      });
    } else if (aiDraft.data.questions && aiDraft.data.questions.length > 0) {
      allQuestions = aiDraft.data.questions;
    }

    if (allQuestions.length > 0) {
      const newAssessments = allQuestions.map((q, idx) => {
        const promptText = q.prompt || q.question || `Question ${idx + 1}`;
        return {
          id: `ass-ai-${idx}-${Date.now()}`,
          name: `AI Quiz: ${promptText.slice(0, 50)}...`,
          type: q.type || 'MCQ_QUIZ',
          target: 'INDIVIDUAL',
          weight: q.weight || Math.round(100 / (allQuestions.length || 1)),
          assignedTo: 'All Cohorts',
          cohort: 'Residency Cohort 1',
          approvalStatus: 'APPROVED',
          mcqDetails: q,
        };
      });

      const updated = [...newAssessments as any, ...assessments];
      setAssessments(updated);
      if (onUpdateData) {
        onUpdateData({ ...data, assessments: updated });
      }
      setAiDraft(null);
      if (onDismissDraft) onDismissDraft();
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
            <span>{isGenerating ? 'Generating...' : 'Generate Quizzes with AI'}</span>
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
      {aiDraft && (aiDraft.data?.sections || aiDraft.data?.questions) && (
        <AiDraftCard
          title="Suggested MCQs & Assessments"
          model={aiDraft.model || 'mimo-v2.6-flash'}
          isLoading={isGenerating}
          onApply={handleApplyDraft}
          onDismiss={() => {
            setAiDraft(null);
            if (onDismissDraft) onDismissDraft();
          }}
          onRegenerate={handleGenerate}
        >
          {aiDraft.data.sections ? (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
              <p className="text-xs text-gray-500">
                The AI generated assessment sections containing modular evaluation items:
              </p>
              {aiDraft.data.sections.map((sec, sIdx) => (
                <div key={sIdx} className="border border-indigo-100 rounded-lg p-3 bg-white space-y-3">
                  <h4 className="font-semibold text-xs text-indigo-900 flex items-center justify-between">
                    <span>{sec.title}</span>
                    <span className="text-[10px] text-gray-400 font-normal">({sec.questions.length} questions)</span>
                  </h4>
                  <div className="space-y-3">
                    {sec.questions.map((q, qIdx) => (
                      <div key={qIdx} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                          <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <p className="font-bold text-gray-900 text-sm">{q.prompt || q.question}</p>
                        </div>
                        {q.options && Array.isArray(q.options) && (
                          <div className="space-y-1.5 pl-6">
                            {q.options.map((opt: any, oi: number) => {
                              const text = typeof opt === 'string' ? opt : opt.text;
                              const isCorrect = typeof opt === 'object' && opt.is_correct !== undefined ? opt.is_correct : (q.correct_answer && q.correct_answer === text);
                              const rationale = typeof opt === 'object' ? opt.rationale : null;
                              return (
                                <div
                                  key={oi}
                                  className={`p-2 rounded border transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                                      : 'bg-white border-gray-200 text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{text}</span>
                                    {isCorrect && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                        CORRECT
                                      </span>
                                    )}
                                  </div>
                                  {rationale && (
                                    <p className="text-[11px] text-gray-500 mt-0.5 italic">
                                      Rationale: {rationale}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                The AI generated {aiDraft.data.questions?.length || 0} multiple-choice question(s) complete with options and answer rationales:
              </p>
              <div className="space-y-3">
                {aiDraft.data.questions?.map((q, idx) => (
                  <div key={idx} className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5 text-xs">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <p className="font-bold text-gray-900 text-sm">{q.prompt || q.question}</p>
                    </div>

                    <div className="space-y-1.5 pl-6">
                      {q.options?.map((opt: any, oi: number) => {
                        const text = typeof opt === 'string' ? opt : opt.text;
                        const isCorrect = typeof opt === 'object' && opt.is_correct !== undefined ? opt.is_correct : (q.correct_answer && q.correct_answer === text);
                        const rationale = typeof opt === 'object' ? opt.rationale : null;
                        return (
                          <div
                            key={oi}
                            className={`p-2 rounded border transition-colors ${
                              isCorrect
                                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                                : 'bg-white border-gray-200 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{text}</span>
                              {isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  CORRECT
                                </span>
                              )}
                            </div>
                            {rationale && (
                              <p className="text-[11px] text-gray-500 mt-0.5 italic">
                                Rationale: {rationale}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
