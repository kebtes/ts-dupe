import React, { useState, useEffect, useMemo } from 'react';
import { TrainingData } from '../../types';
import { Search, FileText, ExternalLink, CheckCircle, Clock, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { generateTabDraft, getCachedDraft, TabDraftResponse, ContentDescriptionDraftData, getActiveTrainingId, ContentTargetOption, buildDemoContentDescriptionDraft, isOfflineDemoMode } from '../../api/tabs';
import { buildContentTargets, normalizeTabDraft, resolveContentApplyAssociation } from '../../api/adapters';
import {
  resolveContentSelection,
  canStartContentGeneration,
  buildContentGenerationRequest,
  isPersistedContentTarget,
} from '../../api/contentSelection';
import { useTrainingStructure } from '../../api/useTrainingStructure';
import { AiDraftCard, AiErrorBanner } from '../ui/AiDraftCard';

interface ContentTabProps {
  data: TrainingData;
  onUpdateData?: (updated: any) => void;
  /** Draft pushed by the Curriculum Copilot (backend-shape payload). */
  suggestedDraft?: any;
  onDismissDraft?: () => void;
}

export const ContentTab: React.FC<ContentTabProps> = ({ data, onUpdateData, suggestedDraft, onDismissDraft }) => {
  const [contents, setContents] = useState(data.contents || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');

  /**
   * Targets come from two sources:
   *  - persisted TSP records from the read-only /structure endpoint
   *    (source 'tsp'), resolved by the backend against TSP; and
   *  - modules/lessons generated and applied in this frontend session
   *    (source 'demo', labelled "(demo)"), sent to the SAME backend pipeline
   *    as explicit client-provided context (never resolved against TSP).
   */
  const trainingId = getActiveTrainingId(data.training?.id);

  const {
    structure,
    loading: structureLoading,
    error: structureError,
    retry: retryStructure,
  } = useTrainingStructure(trainingId);

  const targetOptions: ContentTargetOption[] = useMemo(
    () => buildContentTargets(structure, data.modules),
    [structure, data.modules]
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

  const persistedSelected = isPersistedContentTarget(selectedTarget);

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

  // Sync draft pushed by the Curriculum Copilot (backend-shape payload),
  // normalized through the same adapter/validation pipeline.
  useEffect(() => {
    if (!suggestedDraft) return;
    try {
      const normalized = normalizeTabDraft(
        'content-description',
        { status: 'success', tab: 'content-description', data: suggestedDraft },
        { source: 'backend' }
      );
      setAiDraft(normalized as TabDraftResponse<ContentDescriptionDraftData>);
    } catch {
      // DraftValidationError: unusable payload — no empty card, no error spam.
    }
  }, [suggestedDraft]);

  // Load the cached draft for the selected target. Content-description
  // drafts are target-scoped on the backend, so Lesson B never shows
  // Lesson A's draft. With no selection, the historical latest-draft
  // behavior is preserved.
  useEffect(() => {
    let cancelled = false;
    const targetArg = selectedTarget
      ? {
          kind: selectedTarget.kind,
          id: selectedTarget.id,
          title: selectedTarget.title,
          module_title: selectedTarget.moduleTitle,
          objective: selectedTarget.objective ?? undefined,
          description: selectedTarget.description ?? undefined,
          module_description: selectedTarget.moduleDescription ?? undefined,
          source:
            selectedTarget.source === 'demo'
              ? ('demo' as const)
              : ('tsp' as const),
        }
      : null;
    getCachedDraft<ContentDescriptionDraftData>(
      'content-description',
      trainingId,
      targetArg
    )
      .then((draft) => {
        if (cancelled) return;
        if (!draft || !draft.data?.contents?.length) {
          // A newly selected target with no cached draft must not keep
          // showing a different target's draft.
          if (selectedTargetId) setAiDraft(null);
          return;
        }
        // Skip drafts whose backend request_id was already applied, so a
        // remount cannot re-apply the same draft into a duplicate record.
        const requestId = draft.request_id || '';
        const applied = (data.appliedContentRequestIds ?? []) as string[];
        if (requestId && applied.includes(requestId)) {
          return;
        }
        setAiDraft(draft);
      })
      .catch(() => {
        // Draft retrieval is best-effort; generation still works.
      });
    return () => {
      cancelled = true;
    };
  }, [trainingId, selectedTargetId]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Temporary (session) targets use the SAME backend generation pipeline,
    // sending their bounded lesson/module context with source='client'. The
    // backend never resolves their synthetic ids against TSP. Only an
    // explicit offline/demo mode uses the local generator.
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const target = selectedTarget!;
      if (!isPersistedContentTarget(target) && isOfflineDemoMode()) {
        setAiDraft(
          buildDemoContentDescriptionDraft(
            {
              kind: target.kind,
              id: target.id,
              title: target.title,
              module_title: target.moduleTitle,
              objective: target.objective ?? null,
            },
            trainingId
          )
        );
      } else {
        const request = buildContentGenerationRequest(trainingId, target);
        const response = await generateTabDraft<ContentDescriptionDraftData>(
          request.tab,
          request.trainingId,
          request.target
        );
        setAiDraft(response);
      }
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
      // Associate the applied content with the target that produced it. The
      // generation-time target is carried on the draft itself, so a later
      // selection change cannot corrupt the association:
      //  - persisted targets resolve the module/parent module by real IDs;
      //  - session demo targets fall back to the parent module title they
      //    carried, and keep their lesson id/name in frontend state.
      const target = aiDraft.data.target as
        | {
            kind: 'module' | 'lesson';
            id: string;
            title?: string;
            module_title?: string;
            source?: 'tsp' | 'demo';
          }
        | null
        | undefined;
      const association = resolveContentApplyAssociation(target, structure);
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
          moduleName: association.moduleName,
          lessonId: association.lessonId,
          lessonName: association.lessonName,
          targetSource: association.targetSource,
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
      onDismissDraft?.();
    }
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
              disabled={isGenerating}
              className="border border-gray-300 rounded-md text-xs px-2.5 py-2 bg-white text-gray-700 max-w-[220px] disabled:opacity-50"
              title="Content target: persisted TSP records, or session demo records (labelled demo)"
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
            disabled={
              isGenerating ||
              !selectedTarget ||
              (persistedSelected && (structureLoading || !!structureError))
            }
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-200" />
            )}
            <span>
              {isGenerating
                ? 'Generating... (may take up to 3 min)'
                : 'Suggest Content with AI'}
            </span>
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
          onDismiss={() => {
            setAiDraft(null);
            onDismissDraft?.();
          }}
          onRegenerate={handleGenerate}
        >
          <div className="space-y-4">
            {aiDraft.data.target?.source === 'demo' && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                <strong>Temporary target:</strong> this module or lesson exists
                only in this browser session (applied from the Module tab) and
                is <strong>not</strong> a persisted TSP record.{' '}
                {aiDraft.source === 'offline-mock'
                  ? 'The description below was generated by the offline demo generator (explicit offline mode).'
                  : 'The description below was generated by the real AI backend.'}{' '}
                Nothing was saved to TSP.
              </div>
            )}
            <p className="text-xs text-gray-500">
              {aiDraft.source === 'offline-mock'
                ? `Offline demo drafted ${aiDraft.data.contents.length} description(s) for the selected target:`
                : `The AI generated ${aiDraft.data.contents.length} content description(s) for the selected ${
                    aiDraft.data.target?.source === 'demo' ? 'temporary ' : ''
                  }target:`}
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
                  {item.targetSource === 'demo' && (
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                      title="Generated for a temporary session target — not a persisted TSP record"
                    >
                      Temporary
                    </span>
                  )}
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
    </div>
  );
};
