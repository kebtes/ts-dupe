import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  MessageSquare,
  Bot,
  User,
  Loader2,
  Edit3,
} from 'lucide-react';
import {
  sendDesignerCopilotTurn,
  CopilotClarification,
  CopilotChoiceOption,
  DesignerCopilotResponse,
} from '../../api/tabs';
import { TabType, TrainingData } from '../../types';

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  clarification?: CopilotClarification;
  isDraftUpdated?: boolean;
  updatedDraft?: any;
}

interface CurriculumCopilotProps {
  activeTab: TabType;
  trainingData: TrainingData;
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  onApplyDraftToCanvas?: (tab: string, updatedDraft: any) => void;
}

const TAB_QUICK_CHIPS: Record<string, string[]> = {
  module: [
    '⚡ 5-week sprint breakdown',
    '🛠️ Add hands-on capstone project',
    '⏱️ Set lesson duration to 60m',
    '📦 Specify tools and libraries',
  ],
  assessment: [
    '🎯 Add 4-tier grading rubrics for all labs',
    '🧠 Generate scenario-based MCQs',
    '👥 Add group project evaluation',
    '🔬 Focus on code quality & tests',
  ],
  survey: [
    '⏱️ Add course pacing & workload check',
    '💬 Include open-ended instructor feedback',
    '🌟 Standard 1-5 Likert scale questions',
    '⚡ Quick 5-question pulse check',
  ],
  content: [
    '🛠️ Step-by-step lab walkthrough',
    '📽️ Presentation slides & outline',
    '💻 GitHub repository & dev setup',
    '📑 Reference reading guide',
  ],
  training_profile: [
    '🎯 Set 80% attendance requirement',
    '💼 Enterprise-ready applied engineering',
    '🚀 Fast-track foundational skills',
  ],
};

const GENERATION_STAGES = [
  '🔍 Grounding on course objectives & context...',
  '📐 Structuring draft elements and milestones...',
  '📝 Calibrating deliverables, questions & rubrics...',
  '🛡️ Validating schema compliance and syncing canvas...',
];

export const CurriculumCopilot: React.FC<CurriculumCopilotProps> = ({
  activeTab,
  trainingData,
  isOpen,
  onToggleOpen,
  onApplyDraftToCanvas,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [draftHistory, setDraftHistory] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trainingId = trainingData?.training?.id || 'd734b694-0802-4a4a-8a51-eaa693a10abd';

  // Format tab name for display
  const tabDisplayName = activeTab
    .replace('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Convert TabType to backend clean tab string
  const backendTabName = activeTab.replace('_', '-');
  const currentChips = TAB_QUICK_CHIPS[activeTab] || TAB_QUICK_CHIPS.module;
  const storageKey = `copilot_chat_${trainingId}_${activeTab}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  // Stage progression timer when generating
  useEffect(() => {
    let timer: any = null;
    if (isLoading) {
      setLoadingStage(0);
      timer = setInterval(() => {
        setLoadingStage((prev) => (prev < GENERATION_STAGES.length - 1 ? prev + 1 : prev));
      }, 2800);
    } else {
      setLoadingStage(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  // Load chat from localStorage or load initial elicitation
  useEffect(() => {
    if (!isOpen) return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {
        // Fallback to initial elicitation
      }
    }
    loadInitialElicitation();
  }, [isOpen, activeTab, trainingId]);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        // ignore
      }
    }
  }, [messages, storageKey]);

  const loadInitialElicitation = async () => {
    setIsLoading(true);
    try {
      const response = await sendDesignerCopilotTurn({
        training_id: trainingId,
        tab: backendTabName,
      });

      const welcomeMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clarification: response.clarification,
      };
      setMessages([welcomeMsg]);
    } catch (err: any) {
      setMessages([
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `Hello! I'm your Curriculum Copilot for **${tabDisplayName}**. How would you like to structure this section?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTurn = async (userText?: string, selectedOptionId?: string) => {
    const text = (userText || inputValue).trim();
    if (!text && !selectedOptionId) return;

    const userMessageText = text || (selectedOptionId ? `Selected option: ${selectedOptionId}` : '');
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history
      const history = messages.slice(-6).map((m) => ({
        role: m.sender,
        content: m.text,
      }));

      // Find current draft for active tab if available in trainingData
      let currentDraft: any = null;
      if (backendTabName === 'module' && trainingData.modules?.length) {
        currentDraft = { modules: trainingData.modules };
      } else if (backendTabName === 'content-description' && trainingData.contents?.length) {
        currentDraft = { contents: trainingData.contents };
      } else if (backendTabName === 'assessment' && trainingData.assessments?.length) {
        currentDraft = { sections: trainingData.assessments };
      } else if (backendTabName === 'survey' && trainingData.surveys?.length) {
        currentDraft = { surveys: trainingData.surveys };
      } else if (backendTabName === 'training-profile' && trainingData.training) {
        currentDraft = { training: trainingData.training };
      }

      const response: DesignerCopilotResponse = await sendDesignerCopilotTurn({
        training_id: trainingId,
        tab: backendTabName,
        user_message: text || undefined,
        selected_option_id: selectedOptionId || undefined,
        current_draft: selectedOptionId ? undefined : currentDraft,
        conversation_history: history,
      });

      let displayMessage = response.message || '';
      let draftToApply = response.updated_draft;
      let isDraftUpdated = response.response_type === 'UPDATE_DRAFT' && Boolean(response.updated_draft);

      // Defensive client unwrapping if backend ever returns raw JSON string in message
      if (typeof displayMessage === 'string' && displayMessage.trim().startsWith('{')) {
        try {
          const rawParsed = JSON.parse(displayMessage.trim());
          if (rawParsed.message) {
            displayMessage = rawParsed.message;
          }
          if (rawParsed.updated_draft) {
            draftToApply = rawParsed.updated_draft;
            isDraftUpdated = true;
          }
        } catch {
          // If not valid JSON, leave as is
        }
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: displayMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        clarification: response.clarification,
        isDraftUpdated,
        updatedDraft: draftToApply,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If draft was updated by Copilot, save current draft to history for revert, then apply directly to canvas!
      if (isDraftUpdated && draftToApply && onApplyDraftToCanvas) {
        if (currentDraft) {
          setDraftHistory((prev) => ({ ...prev, [backendTabName]: currentDraft }));
        }
        onApplyDraftToCanvas(backendTabName, draftToApply);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ ${err.message || 'Unable to complete copilot turn. Please try again.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertDraft = (tab: string) => {
    const prevDraft = draftHistory[tab];
    if (prevDraft && onApplyDraftToCanvas) {
      onApplyDraftToCanvas(tab, prevDraft);
      setDraftHistory((old) => {
        const copy = { ...old };
        delete copy[tab];
        return copy;
      });
      const revertNotice: ChatMessage = {
        id: `rev-${Date.now()}`,
        sender: 'assistant',
        text: `↺ Reverted **${tabDisplayName}** canvas to the previous draft.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((msgs) => [...msgs, revertNotice]);
    }
  };

  const handleSelectOption = (option: CopilotChoiceOption) => {
    handleSendTurn(option.label, option.id);
  };

  const handleResetSession = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setMessages([]);
    loadInitialElicitation();
  };

  return (
    <>
      {/* Floating Trigger Button (Always visible when panel is closed) */}
      {!isOpen && (
        <button
          onClick={() => onToggleOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 font-medium text-sm group"
          aria-label="Open AI Copilot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
            </span>
          </div>
          <span>Curriculum Copilot</span>
          <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">
            {tabDisplayName}
          </span>
        </button>
      )}

      {/* Slide-out Companion Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-indigo-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-gray-900 text-sm">Curriculum Copilot</h3>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                    AI
                  </span>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span>Assisting with:</span>
                  <strong className="text-indigo-600 font-semibold">{tabDisplayName}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetSession}
                title="Reset Copilot Conversation"
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conversation Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {/* Canvas Live Update Notification */}
                    {msg.isDraftUpdated && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-emerald-600 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Canvas draft updated live</span>
                        </div>
                        {draftHistory[backendTabName] && (
                          <button
                            type="button"
                            onClick={() => handleRevertDraft(backendTabName)}
                            className="text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors flex items-center gap-1"
                            title="Undo this draft update and restore previous state"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Revert
                          </button>
                        )}
                      </div>
                    )}

                    {/* AI Suggested Draft Output Preview */}
                    {msg.updatedDraft && (
                      <div className="mt-3 p-3 bg-gradient-to-br from-indigo-50/90 to-blue-50/90 rounded-xl border border-indigo-200 text-xs space-y-2 text-left">
                        <div className="flex items-center justify-between font-semibold text-indigo-950">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>AI Suggested Draft</span>
                          </div>
                          {msg.updatedDraft.modules && (
                            <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                              {msg.updatedDraft.modules.length} Modules
                            </span>
                          )}
                        </div>

                        {/* Modules Preview */}
                        {msg.updatedDraft.modules && (
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {msg.updatedDraft.modules.map((m: any, mIdx: number) => (
                              <div key={mIdx} className="bg-white p-2.5 rounded-lg border border-indigo-100/90 shadow-2xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-gray-900 text-xs">
                                    {m.title || m.name}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-600 line-clamp-2">
                                  {m.description}
                                </p>
                                {m.practical_assignment && (
                                  <div className="text-[10px] text-indigo-800 bg-indigo-50/80 p-1.5 rounded font-medium">
                                    🛠️ <strong>Lab:</strong> {m.practical_assignment.title}
                                  </div>
                                )}
                                {(m.lessons || m.topics?.[0]?.lessons) && (
                                  <p className="text-[10px] text-gray-500">
                                    📚 {(m.lessons || m.topics[0].lessons).length} Lessons: {(m.lessons || m.topics[0].lessons).map((l: any) => l.title).join(', ')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Surveys Preview */}
                        {(msg.updatedDraft.sections || msg.updatedDraft.questions) && (
                          <div className="bg-white p-2 rounded-lg border border-indigo-100/90 text-[11px] text-gray-700">
                            <span className="font-semibold text-gray-900">
                              {(msg.updatedDraft.sections || msg.updatedDraft.questions).length} Survey Items Generated
                            </span>
                          </div>
                        )}

                        {/* Training Profile Preview */}
                        {msg.updatedDraft.scope && (
                          <div className="bg-white p-2 rounded-lg border border-indigo-100/90 text-[11px] text-gray-700">
                            <span className="font-semibold text-gray-900">Training Scope:</span>
                            <p className="line-clamp-3 text-[10px] text-gray-600 mt-0.5">{msg.updatedDraft.scope}</p>
                          </div>
                        )}

                        {/* Action footer */}
                        <div className="pt-1.5 flex items-center justify-between border-t border-indigo-100">
                          <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Applied to Canvas
                          </span>
                          {onApplyDraftToCanvas && (
                            <button
                              type="button"
                              onClick={() => onApplyDraftToCanvas(backendTabName, msg.updatedDraft)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-semibold transition-colors shadow-2xs"
                            >
                              Re-sync Canvas
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pre-generation Elicitation / Clarification Options */}
                  {msg.clarification && msg.clarification.options?.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{msg.clarification.question || 'Select an option to proceed:'}</span>
                      </div>

                      <div className="space-y-2">
                        {msg.clarification.options.map((opt) => (
                          <button
                            key={opt.id}
                            disabled={isLoading}
                            onClick={() => handleSelectOption(opt)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between group ${
                              opt.is_recommended
                                ? 'bg-indigo-50/70 border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50'
                                : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-gray-50/80'
                            }`}
                          >
                            <div className="space-y-1 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {opt.label}
                                </span>
                                {opt.is_recommended && (
                                  <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              {opt.description && (
                                <p className="text-[11px] text-gray-500 leading-snug">
                                  {opt.description}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                          </button>
                        ))}

                        {/* Option 4: Custom Input Prompt */}
                        {msg.clarification.allow_custom && (
                          <button
                            type="button"
                            onClick={() => inputRef.current?.focus()}
                            className="w-full text-left px-3 py-2.5 rounded-xl border border-dashed border-gray-300 bg-white hover:border-indigo-400 text-xs text-gray-600 flex items-center gap-2 hover:text-indigo-600 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                            <span>Type your own custom requirements below...</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] text-gray-400 block px-1">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="space-y-2 bg-indigo-50/70 border border-indigo-100 p-3.5 rounded-xl">
                <div className="flex items-center justify-between text-xs text-indigo-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>{GENERATION_STAGES[loadingStage]}</span>
                  </div>
                  <span className="text-[10px] text-indigo-500 font-mono">
                    Step {loadingStage + 1}/{GENERATION_STAGES.length}
                  </span>
                </div>
                <div className="w-full bg-indigo-200/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${((loadingStage + 1) / GENERATION_STAGES.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions - Tab Aware */}
          {currentChips.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-white flex gap-1.5 overflow-x-auto text-xs no-scrollbar">
              {currentChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendTurn(chip.replace(/^[\p{Emoji}\s]+/u, ''))}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-full whitespace-nowrap text-[11px] font-medium transition-colors border border-transparent hover:border-indigo-200"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendTurn();
            }}
            className="p-3 border-t border-gray-200 bg-white flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={`Ask Copilot or refine ${tabDisplayName}...`}
              value={inputValue}
              disabled={isLoading}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
};
