import React, { useState, useEffect } from 'react';
import { TrainingData } from '../../types';
import { ChevronDown, MoreVertical, Plus, BookOpen, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { generateTabDraft, getCachedDraft, TabDraftResponse, ModuleDraftData } from '../../api/tabs';
import { AiDraftCard, AiErrorBanner } from '../ui/AiDraftCard';

interface ModuleTabProps {
  data: TrainingData;
  onUpdateData?: (updated: any) => void;
}

export const ModuleTab: React.FC<ModuleTabProps> = ({ data, onUpdateData }) => {
  const [modules, setModules] = useState(data.modules || []);
  const [openModuleId, setOpenModuleId] = useState<string | null>(modules[0]?.id || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState<TabDraftResponse<ModuleDraftData> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trainingId = data.training?.id || 'd734b694-0802-4a4a-8a51-eaa693a10abd';

  // Check cached draft on mount
  useEffect(() => {
    getCachedDraft<ModuleDraftData>('module', trainingId).then((draft) => {
      if (draft && draft.data?.modules?.length) {
        setAiDraft(draft);
      }
    });
  }, [trainingId]);

  const toggleModule = (id: string) => {
    setOpenModuleId(openModuleId === id ? null : id);
  };

  const handleGenerate = async () => {
    // Prerequisite check from backend guide: Training Profile scope must exist
    if (!data.trainingProfile?.scope) {
      setErrorMessage('Please generate/save the earlier tab first (Training Profile scope must exist).');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await generateTabDraft<ModuleDraftData>('module', trainingId);
      setAiDraft(response);
    } catch (err: any) {
      setErrorMessage(err.message || 'AI model unavailable. Try again in a moment.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyDraft = () => {
    if (aiDraft?.data?.modules) {
      const converted = aiDraft.data.modules.map((m, idx) => ({
        id: m.id || `mod-ai-${idx}-${Date.now()}`,
        name: m.title,
        description: m.description,
        trainingTag: { name: 'AI Suggested' },
        practical_assignment: m.practical_assignment,
        topics: m.topics,
      }));

      const updatedList = [...modules, ...converted];
      setModules(updatedList);
      if (onUpdateData) {
        onUpdateData({
          ...data,
          modules: updatedList,
        });
      }
      setAiDraft(null);
      if (converted[0]?.id) setOpenModuleId(converted[0].id);
    }
  };

  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    const newMod = {
      id: `module-${Date.now()}`,
      name: newModuleName,
      description: newModuleDesc,
      trainingTag: { name: 'Custom' },
    };
    const updated = [...modules, newMod];
    setModules(updated);
    if (onUpdateData) {
      onUpdateData({ ...data, modules: updated });
    }
    setNewModuleName('');
    setNewModuleDesc('');
    setIsAddModalOpen(false);
    setOpenModuleId(newMod.id);
  };

  return (
    <div className="px-[7%] py-10 mb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-md md:text-xl text-black mb-1 font-semibold">Modules</h1>
          <h2 className="text-md md:text-lg text-gray-500 font-normal">
            A concise summary of the course modules, outlining their content and structure
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
            <span>{isGenerating ? 'Generating...' : 'Suggest Modules with AI'}</span>
          </button>

          {/* Manual Add Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-brand text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <img src="/modulePlus.svg" alt="" className="w-4 h-4 invert" />
            <span>Module</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <AiErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {/* AI Draft Suggestion Box */}
      {aiDraft && aiDraft.data?.modules && (
        <AiDraftCard
          title="Suggested Curriculum Modules"
          model={aiDraft.model || 'gemma4:31b-cloud'}
          isLoading={isGenerating}
          onApply={handleApplyDraft}
          onDismiss={() => setAiDraft(null)}
          onRegenerate={handleGenerate}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              The AI model generated {aiDraft.data.modules.length} recommended modules with topics and practical lab assignments:
            </p>
            <div className="space-y-3">
              {aiDraft.data.modules.map((m, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-gray-900 text-sm">{m.title}</h5>
                    <span className="text-[11px] font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Order {m.order}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{m.description}</p>

                  {/* Practical assignment preview */}
                  {m.practical_assignment && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded text-xs text-indigo-900 space-y-1">
                      <span className="font-semibold flex items-center gap-1">
                        🛠️ Practical Lab: {m.practical_assignment.title}
                      </span>
                      <p className="text-gray-600">{m.practical_assignment.description}</p>
                      <p className="text-[11px] text-gray-500">
                        <strong>Evidence:</strong> {m.practical_assignment.evidence_of_completion}
                      </p>
                    </div>
                  )}

                  {/* Lessons */}
                  {m.topics?.[0]?.lessons && (
                    <div className="pt-1 text-xs text-gray-600">
                      <span className="font-medium text-gray-700">Topics & Lessons: </span>
                      {m.topics[0].lessons.map((l) => `${l.title} (${l.duration}m)`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </AiDraftCard>
      )}

      {/* Modules List */}
      <div className="space-y-4">
        {modules.map((mod: any) => {
          const isOpen = openModuleId === mod.id;
          return (
            <div
              key={mod.id}
              className={`border-[0.5px] border-[#CED4DA] rounded-md transition-all ${
                isOpen ? 'bg-[#f7fbff]' : 'bg-white'
              }`}
            >
              <div
                onClick={() => toggleModule(mod.id)}
                className={`p-6 flex items-center justify-between cursor-pointer rounded-lg ${
                  isOpen ? 'bg-[#f7fbff]' : 'bg-white hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-semibold text-md md:text-xl text-gray-900">
                    {mod.name || mod.title}
                  </span>
                  {mod.trainingTag?.name && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {mod.trainingTag.name}
                    </span>
                  )}
                </div>

                <div className="text-gray-400 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="hover:bg-gray-100 h-8 w-8 p-0 rounded-md flex items-center justify-center text-gray-500 transition-colors"
                    title="Module options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    className={`p-1 hover:bg-gray-100 rounded-md text-black transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="pb-6 px-6 pt-0">
                  <div className="bg-white p-6 rounded-md border border-gray-100 space-y-4">
                    <div>
                      <h4 className="text-gray-700 font-medium mb-1">Description:</h4>
                      <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-line">
                        {mod.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Practical assignment if present */}
                    {mod.practical_assignment && (
                      <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-md text-sm space-y-1">
                        <h5 className="font-bold text-indigo-950 flex items-center gap-1.5">
                          🛠️ {mod.practical_assignment.title}
                        </h5>
                        <p className="text-gray-700 text-xs md:text-sm">
                          {mod.practical_assignment.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">Evidence of Completion:</span>{' '}
                          {mod.practical_assignment.evidence_of_completion}
                        </p>
                      </div>
                    )}

                    {/* Topics / Lessons if present */}
                    {mod.topics && mod.topics.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Structured Topics & Lessons
                        </h5>
                        <div className="space-y-2">
                          {mod.topics.map((t: any, ti: number) => (
                            <div key={ti} className="p-2.5 bg-gray-50 rounded border border-gray-200 text-xs">
                              <span className="font-bold text-gray-900">{t.title}</span>
                              {t.lessons && (
                                <ul className="list-disc list-inside mt-1 text-gray-600 space-y-0.5">
                                  {t.lessons.map((l: any, li: number) => (
                                    <li key={li}>
                                      {l.title} &mdash; {l.objective} ({l.duration} {l.duration_type?.toLowerCase()})
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-brand" />
                        <span>Module ID: {mod.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Module Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Module</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddModule} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Module Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Week 5 - Advanced Deep Learning"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide module overview, objectives, and structure..."
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  Save Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
