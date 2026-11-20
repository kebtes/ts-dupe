import React, { useState, useEffect } from 'react';
import { TrainingData } from '../../types';
import { Plus, Search, FileText, ExternalLink, CheckCircle, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { generateTabDraft, ContentDescriptionDraftData } from '../../api/tabs';

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

  const [isModalGenerating, setIsModalGenerating] = useState(false);
  const [modalAiError, setModalAiError] = useState<string | null>(null);
  const [hasAiSuggested, setHasAiSuggested] = useState(false);

  const trainingId = data.training?.id || 'd734b694-0802-4a4a-8a51-eaa693a10abd';

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

  const fetchModuleSuggestion = async (modName: string) => {
    const targetMod: any = data.modules?.find(
      (m: any) => m.name === modName || m.id === modName || m.title === modName
    ) || data.modules?.[0];

    if (!targetMod) return;

    setIsModalGenerating(true);
    setModalAiError(null);
    try {
      const response = await generateTabDraft<ContentDescriptionDraftData>(
        'content-description',
        trainingId,
        {
          kind: 'module',
          id: targetMod.id,
          title: targetMod.title || targetMod.name,
          name: targetMod.name || targetMod.title,
          description: targetMod.description,
        }
      );
      if (response && response.data) {
        if (response.data.title) {
          setNewName(response.data.title);
        } else {
          setNewName(`${targetMod.name || targetMod.title} Resource Guide`);
        }
        if (response.data.description) {
          setNewDesc(response.data.description);
        }
        setHasAiSuggested(true);
      }
    } catch (err: any) {
      setModalAiError(err.message || 'AI suggestion failed. You can type manually.');
    } finally {
      setIsModalGenerating(false);
    }
  };

  // When modal opens, auto-suggest for selected module if inputs are empty
  useEffect(() => {
    if (isAddOpen && !newName.trim() && !newDesc.trim() && data.modules?.length) {
      fetchModuleSuggestion(newModule);
    }
  }, [isAddOpen]);

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setNewModule(selected);
    fetchModuleSuggestion(selected);
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
    setHasAiSuggested(false);
    setModalAiError(null);
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
          {/* Manual Add Button */}
          <button
            onClick={() => {
              setIsAddOpen(true);
            }}
            className="bg-brand text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Content</span>
          </button>
        </div>
      </div>

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
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Training Content</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select a module and the AI will automatically suggest a title and description.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setModalAiError(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddContent} className="space-y-4">
              {/* Module selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">
                    Module
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchModuleSuggestion(newModule)}
                    disabled={isModalGenerating}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    {isModalGenerating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                    <span>{isModalGenerating ? 'Generating...' : 'Suggest with AI'}</span>
                  </button>
                </div>
                <select
                  value={newModule}
                  onChange={handleModuleChange}
                  disabled={isModalGenerating}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA] bg-white disabled:bg-gray-50"
                >
                  {data.modules?.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status / feedback banners */}
              {isModalGenerating && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2.5 text-xs text-indigo-700 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span>AI is crafting a title and description for <strong>{newModule}</strong>...</span>
                </div>
              )}

              {modalAiError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center justify-between">
                  <span>{modalAiError}</span>
                  <button
                    type="button"
                    onClick={() => fetchModuleSuggestion(newModule)}
                    className="underline font-semibold ml-2 text-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {hasAiSuggested && !isModalGenerating && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI suggested title &amp; description applied for this module. You can edit them below.</span>
                </div>
              )}

              {/* Title input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder={isModalGenerating ? "Generating suggested title..." : "e.g. Fine-Tuning LLMs with LoRA"}
                  value={newName}
                  disabled={isModalGenerating}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA] disabled:bg-gray-50"
                />
              </div>

              {/* File Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  File Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA] bg-white"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="LINK">External Link</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>

              {/* Description textarea */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={isModalGenerating ? "Generating suggested description..." : "Describe the content, learning goals, or instructions..."}
                  value={newDesc}
                  disabled={isModalGenerating}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA] disabled:bg-gray-50"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setModalAiError(null);
                  }}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isModalGenerating || !newName.trim()}
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
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
