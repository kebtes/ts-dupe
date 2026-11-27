import React, { useState, useEffect, useMemo } from 'react';
import { TrainingData } from '../../types';
import { Plus, Search, FileText, ExternalLink, CheckCircle, Clock, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { generateTabDraft, getCachedDraft, TabDraftResponse, ContentDescriptionDraftData, getActiveTrainingId, ContentTargetOption } from '../../api/tabs';
import { buildContentTargets, moduleNameForTarget } from '../../api/adapters';
import {
  resolveContentSelection,
  canStartContentGeneration,
  buildContentGenerationRequest,
} from '../../api/contentSelection';
import { useTrainingStructure } from '../../api/useTrainingStructure';
import { AiDraftCard, AiErrorBanner } from '../ui/AiDraftCard';

interface ContentTabProps {
  data: TrainingData;
  onUpdateData?: (updated: any) => void;
}

export const ContentTab: React.FC<ContentTabProps> = ({ data, onUpdateData }) => {
  const [contents, setContents] = useState(data.contents || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('PDF');
  const [newModule, setNewModule] = useState(
    data.modules?.[0]?.name || 'Phase One Final Research'
  );

  /**
   * Backend contract: content-description generation requires a target
   * (kind: 'module' | 'lesson', id of a real record). The options come
   * exclusively from the backend's read-only training structure endpoint —
   * never from mock data. On failure there is NO mock fallback: the error is
   * shown and generation is blocked until real records load.
   */
  const trainingId = getActiveTrainingId(data.training?.id);

  const {
    structure,
    loading: structureLoading,
    error: structureError,
    retry: retryStructure,
  } = useTrainingStructure(trainingId);

  const targetOptions: ContentTargetOption[] = useMemo(
    () => buildContentTargets(structure),
    [structure]
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  // Explicit-selection workflow: the trainer picks a target — the component
  // never auto-selects one. This effect only CLEARS an invalid selection:
  // when the structure loads fresh, changes, or the selected target
  // disappeared (e.g. after switching training contexts), the stale id is
  // dropped so generation can never use a target the backend doesn't know.
  useEffect(() => {
    const resolved = resolveContentSelection(targetOptions, selectedTargetId);
    if (resolved !== selectedTargetId) {
      setSelectedTargetId(resolved);
    }
  }, [targetOptions, selectedTargetId]);

  const selectedTarget: ContentTargetOption | null =
    targetOptions.find((t) => t.id === selectedTargetId) ?? null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState<TabDraftResponse<ContentDescriptionDraftData> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A draft or error generated for a previous training must not carry over
  // into a new training context. Declared BEFORE the cached-draft effect so
  // a freshly loaded cached draft for the new training still displays.
  useEffect(() => {
    setAiDraft(null);
    setErrorMessage(null);
  }, [trainingId]);

  // Check cached draft on mount
  useEffect(() => {
    getCachedDraft<ContentDescriptionDraftData>('content-description', trainingId).then((draft) => {
      if (draft && draft.data?.contents?.length) {
        // Issue 2: the backend cache keeps returning the same draft after it
        // was applied — re-applying it creates a duplicate content record.
        // Skip drafts whose backend request_id was already applied this
        // session. A fresh regeneration gets a new request_id and can be
        // applied again normally.
        const requestId = draft.request_id || '';
        const applied = (data.appliedContentRequestIds ?? []) as string[];
        if (requestId && applied.includes(requestId)) {
          return;
        }
        setAiDraft(draft);
      }
    });
  }, [trainingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const modulesList = Array.from(
    new Set((data.contents || []).map((c) => c.moduleName).filter(Boolean))
  );

  const filteredContents = contents.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.moduleName && item.moduleName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesModule =
      selectedModule === 'ALL' || item.moduleName === selectedModule;

    return matchesSearch && matchesModule;
  });

  const handleGenerate = async () => {
    // One click = at most one request: while a generation is in flight the
    // gate below blocks any re-entry, and the Generate button is disabled.
    const gate = canStartContentGeneration({
      isGenerating,
      structureLoading,
      structureError,
      selectedTarget,
    });
    if (!gate.allowed) {
      setErrorMessage(gate.reason ?? 'Generation is not available right now.');
      return;
    }

    // Backend contract: a real target record (kind + id) is required, and it
    // must come from the loaded training structure — never from mock data.
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const request = buildContentGenerationRequest(trainingId, selectedTarget!);
      const response = await generateTabDraft<ContentDescriptionDraftData>(
        request.tab,
        request.trainingId,
        request.target
      );
      setAiDraft(response);
    } catch (err: any) {
      setErrorMessage(err.message || 'AI model unavailable. Try again in a moment.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyDraft = () => {
    if (aiDraft?.data?.contents) {
      // Issue 2: request-level idempotency — the same backend draft (same
      // request_id) can only create content once, guarding against double
      // clicks and the remount-time cached-draft re-apply. A regenerated
      // draft carries a new request_id, so intentional separate generations
      // still create separate records.
      const requestId = aiDraft.request_id || '';
      const applied = (data.appliedContentRequestIds ?? []) as string[];
      if (requestId && applied.includes(requestId)) {
        setAiDraft(null);
        return;
      }
      // Issue 1: associate the content with the module the user actually
      // selected (resolved by ID from the backend training structure —
      // never the first module, never text matching). The generation-time
      // target is carried on the draft itself, so a later selection change
      // cannot corrupt the association. Unresolvable targets stay
      // unassociated ('') rather than being silently mislabeled.
      const target = aiDraft.data.target as
        | { kind: 'module' | 'lesson'; id: string }
        | null | undefined;
      const resolvedModuleName = moduleNameForTarget(target, structure);
      const newItems = aiDraft.data.contents.map((c, i) => {
        const takeaways =
          c.key_takeaways && c.key_takeaways.length > 0
            ? `\n\nKey Takeaways:\n${c.key_takeaways.map((t) => `• ${t}`).join('\n')}`
            : '';
        return {
          id: `content-ai-${i}-${Date.now()}`,
          name: c.lesson_title || 'AI Suggested Content',
          description: `${c.content_description}${takeaways}`,
          contentLevel: 'LESSON',
          contentFileType: 'PDF',
          contentStatus: 'ACCEPTED',
          moduleName: resolvedModuleName,
          contentDeveloper: {
            email: 'gemma-ai@gheero.et',
            role: { name: 'AI_CONTENT_CURATOR', colorCode: '#6366f1' },
          },
        };
      });

      const updated = [...newItems as any, ...contents];
      setContents(updated);
      if (onUpdateData) {
        onUpdateData({
          ...data,
          contents: updated,
          appliedContentRequestIds: requestId
            ? [...applied, requestId]
            : applied,
        });
      }
      setAiDraft(null);
    }
  };

  const handleAddContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newContent = {
      id: `content-${Date.now()}`,
      name: newName,
      description: newDesc,
      contentLevel: 'MODULE',
      contentFileType: newType,
      contentStatus: 'PENDING',
      moduleName: newModule,
      contentDeveloper: {
        email: 'developer@gheero.et',
        role: { name: 'ROLE_CONTENT_DEVELOPER', colorCode: '#Content Developer' },
      },
    };
    const updated = [newContent as any, ...contents];
    setContents(updated);
    if (onUpdateData) {
      onUpdateData({ ...data, contents: updated });
    }
    setNewName('');
    setNewDesc('');
    setIsAddOpen(false);
  };

  return (
    <div className="px-[7%] py-10 mb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-md md:text-xl text-black mb-1 font-semibold">Content Description</h1>
          <h2 className="text-md md:text-lg text-gray-500 font-normal">
            Learning materials, lesson walkthroughs, key takeaways, and research resources
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Target selector (backend requires kind + id of a real record) */}
          {structureLoading && (
            <span className="text-xs text-gray-500 px-2 py-2">Loading training structure…</span>
          )}
          {!structureLoading && structureError && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-2 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Training structure unavailable</span>
              <button
                onClick={retryStructure}
                className="ml-1 underline font-semibold text-red-700 hover:text-red-800"
              >
                Retry
              </button>
            </span>
          )}
          {!structureLoading && !structureError && targetOptions.length === 0 && (
            <span className="text-xs text-gray-500 px-2 py-2">
              No modules or lessons found for this training.
            </span>
          )}
          {!structureLoading &&
            !structureError &&
            targetOptions.length > 0 &&
            !selectedTarget && (
              <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-2 rounded-md">
                Select a module or lesson below to generate content for.
              </span>
            )}
          {targetOptions.length > 0 && (
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              disabled={isGenerating || structureLoading || !!structureError}
              className="border border-gray-300 rounded-md text-xs px-2.5 py-2 bg-white text-gray-700 max-w-[220px] disabled:opacity-50"
              title="Content target for AI generation (real TSP records)"
              aria-label="Content generation target"
            >
              <option value="" disabled>
                Select a module or lesson…
              </option>
              {targetOptions.map((t) => (
                <option key={`${t.kind}-${t.id}`} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          {/* AI Generator Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || structureLoading || !!structureError || !selectedTarget}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-200" />
            )}
            <span>{isGenerating ? 'Generating... (may take up to 3 min)' : 'Suggest Content with AI'}</span>
          </button>

          {/* Manual Add Button */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-brand text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Content</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <AiErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}

      {/* AI Draft Suggestion Card */}
      {aiDraft && aiDraft.data?.contents && (
        <AiDraftCard
          title="Suggested Lesson Content"
          model={aiDraft.model || 'gemma4:31b-cloud'}
          source={aiDraft.source}
          isLoading={isGenerating}
          onApply={handleApplyDraft}
          onDismiss={() => setAiDraft(null)}
          onRegenerate={handleGenerate}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              The AI generated {aiDraft.data.contents.length} content description(s) for the selected target:
            </p>
            <div className="space-y-3">
              {aiDraft.data.contents.map((c, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <h5 className="font-bold text-gray-900 text-sm">
                      {c.lesson_title || 'Selected target'}
                      {aiDraft.data.target?.kind ? (
                        <span className="ml-2 text-[10px] font-mono uppercase text-gray-400">
                          {aiDraft.data.target.kind}
                        </span>
                      ) : null}
                    </h5>
                    {c.lesson_id && (
                      <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                        ID: {c.lesson_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                    {c.content_description}
                  </p>
                  {c.key_takeaways.length > 0 && (
                    <div className="pt-1.5 border-t border-gray-200">
                      <span className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Key Takeaways:
                      </span>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                        {c.key_takeaways.map((t, ti) => (
                          <li key={ti}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </AiDraftCard>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <img
            src="/search.svg"
            alt=""
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search content by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#CED4DA] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="px-3 py-2 border border-[#CED4DA] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="ALL">All Modules</option>
          {modulesList.map((m) => (
            <option key={m} value={m as string}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Content Cards */}
      <div className="space-y-4">
        {filteredContents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
            No content found matching your search.
          </div>
        ) : (
          filteredContents.map((item) => (
            <div
              key={item.id}
              className="border-[0.5px] border-[#CED4DA] rounded-lg p-5 bg-white hover:border-brand/40 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-2 bg-blue-50 text-brand rounded-md">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-base">{item.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {item.contentFileType}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-brand">
                    {item.contentLevel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {item.contentStatus === 'ACCEPTED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Accepted</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>
              </div>

              {item.moduleName && (
                <p className="text-xs font-medium text-brand">
                  Module: <span className="text-gray-700">{item.moduleName}</span>
                </p>
              )}

              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line line-clamp-3">
                {item.description}
              </p>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>By: {item.contentDeveloper?.email || 'content.developer@gheero.et'}</span>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand hover:underline font-medium"
                  >
                    <span>Open Resource</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Content Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add Training Content</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddContent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fine-Tuning LLMs with LoRA"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    File Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="LINK">External Link</option>
                    <option value="VIDEO">Video</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Module
                  </label>
                  <select
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                  >
                    {data.modules?.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the content, learning goals, or instructions..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  Upload Content
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
