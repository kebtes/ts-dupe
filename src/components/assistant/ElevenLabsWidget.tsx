import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  FileText,
  MessageSquare,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { VoiceOrb, AgentState } from './VoiceOrb';
import { Waveform } from './Waveform';
import { queryRag, RagSource } from './ragEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: RagSource[];
}

export const ElevenLabsWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I'm your AI Curriculum Assistant for the **AI/ML Residency Program**.\n\nI have direct access to all modules, prerequisites, passing standards, and assessment rubrics. How can I help you today?",
      timestamp: 'Just now',
      sources: [
        {
          title: 'Curriculum Knowledge Base',
          section: 'Overview & Training Profile',
          snippet: 'AI/ML Residency Program Training documentation and learning roadmap.',
        },
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && mode === 'chat') {
      scrollToBottom();
    }
  }, [messages, isOpen, mode, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    if (mode === 'voice') {
      setAgentState('thinking');
    }

    // Simulate RAG retrieval latency
    setTimeout(() => {
      const ragResult = queryRag(query);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: ragResult.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: ragResult.sources,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);

      if (mode === 'voice') {
        setAgentState('speaking');
        speakText(ragResult.answer, aiMsg.id, () => {
          setAgentState('idle');
        });
      }
    }, 750);
  };

  const speakText = (text: string, msgId: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (speakingMsgId === msgId) {
      setSpeakingMsgId(null);
      setAgentState('idle');
      return;
    }

    setSpeakingMsgId(msgId);
    setAgentState('speaking');

    // Clean markdown for speech
    const cleanText = text.replace(/[*_#•]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeakingMsgId(null);
      setAgentState('idle');
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
      setAgentState('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'What are the 6 modules?',
    'What is the passing score?',
    'Who is the target audience?',
    'What are the assessment rubrics?',
  ];

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 bg-[#0f141c] hover:bg-black text-white px-5 py-3.5 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.35)] border border-neutral-700 hover:border-neutral-500 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            title="Open ElevenLabs AI Assistant"
          >
            {/* Ambient pulse effect */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 opacity-20 blur-md group-hover:opacity-40 transition-opacity" />

            {/* ElevenLabs double vertical bar logo */}
            <div className="relative flex items-center gap-1 h-5">
              <span className="w-1.5 h-4 bg-white rounded-full transition-transform group-hover:scale-y-110" />
              <span className="w-1.5 h-4 bg-white rounded-full transition-transform group-hover:scale-y-125" />
            </div>

            <div className="relative flex flex-col text-left">
              <span className="text-xs font-semibold tracking-wide flex items-center gap-1.5">
                Talk to AI
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                Curriculum RAG Assistant
              </span>
            </div>

            {/* Mini soundwave preview */}
            <Waveform isPlaying={true} barCount={6} color="bg-cyan-400" className="relative ml-1" />
          </button>
        </div>
      )}

      {/* Expanded Widget Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] sm:w-[410px] h-[590px] max-h-[85vh] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#0f141c] text-white px-4 py-3.5 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              {/* ElevenLabs Logo mark */}
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center gap-1 shadow-inner">
                <span className="w-1 h-3.5 bg-white rounded-full" />
                <span className="w-1 h-3.5 bg-white rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                  Curriculum AI
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                </h3>
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  RAG Knowledge Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode switch pills */}
              <div className="bg-neutral-900/90 p-0.5 rounded-lg border border-neutral-800 flex text-xs">
                <button
                  onClick={() => {
                    setMode('chat');
                    window.speechSynthesis?.cancel();
                    setAgentState('idle');
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    mode === 'chat'
                      ? 'bg-neutral-700 text-white font-medium shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  Chat
                </button>
                <button
                  onClick={() => {
                    setMode('voice');
                    setAgentState('idle');
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    mode === 'voice'
                      ? 'bg-brand text-white font-medium shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  Voice
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  window.speechSynthesis?.cancel();
                  setIsOpen(false);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content: Voice Mode or Chat Mode */}
          {mode === 'voice' ? (
            /* Voice Mode View */
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#0f141c] via-[#121927] to-[#0a0e14] text-white">
              {/* Top call bar */}
              <div className="w-full flex justify-between items-center text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Conversational Session
                </span>
                <span className="font-mono text-gray-400">00:42</span>
              </div>

              {/* Central Glowing ElevenLabs Orb */}
              <div className="flex flex-col items-center justify-center my-auto space-y-4">
                <VoiceOrb
                  state={agentState}
                  size={170}
                  onClick={() => {
                    if (agentState === 'idle') {
                      setAgentState('listening');
                    } else if (agentState === 'listening') {
                      setAgentState('thinking');
                      setTimeout(() => {
                        const sampleAnswer =
                          'The AI/ML Residency Program covers 6 comprehensive modules, starting from exploratory data analysis to fine-tuning large language models and reinforcement learning tokenization.';
                        setAgentState('speaking');
                        speakText(sampleAnswer, 'voice-sample', () => setAgentState('idle'));
                      }, 1000);
                    } else {
                      window.speechSynthesis?.cancel();
                      setAgentState('idle');
                    }
                  }}
                />

                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-white capitalize">
                    {agentState === 'speaking'
                      ? 'Assistant Speaking...'
                      : agentState === 'listening'
                      ? 'Listening to your voice...'
                      : agentState === 'thinking'
                      ? 'Searching curriculum knowledge...'
                      : 'Click orb or speak to begin'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {agentState === 'speaking' ? 'Tap orb or speak to interrupt' : 'Voice synthesis powered by ElevenLabs'}
                  </p>
                </div>

                {/* Waveform indicator */}
                <Waveform
                  isPlaying={agentState === 'speaking'}
                  barCount={16}
                  color="bg-cyan-400"
                  className="h-8"
                />
              </div>

              {/* Bottom Voice Controls */}
              <div className="w-full flex items-center justify-center gap-4 pt-4 border-t border-neutral-800">
                <button
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`p-3.5 rounded-full border transition-all ${
                    isMicMuted
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700'
                  }`}
                  title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setMode('chat');
                    setAgentState('idle');
                  }}
                  className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg shadow-rose-600/30"
                  title="End voice session"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    setMode('chat');
                  }}
                  className="p-3.5 rounded-full bg-neutral-800 text-white border border-neutral-700 hover:bg-neutral-700 transition-all"
                  title="Switch to chat"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            /* Chat Mode View */
            <div className="flex-1 flex flex-col bg-[#fcfcfd] overflow-hidden">
              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-neutral-900 text-white rounded-br-none'
                            : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-none'
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.text}</div>

                        {/* RAG Citations Tag */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <FileText className="w-3 h-3 text-brand" />
                              Retrieved RAG Sources
                            </span>
                            {msg.sources.map((src, i) => (
                              <div
                                key={i}
                                className="p-1.5 rounded bg-blue-50/70 border border-blue-100 text-[11px] text-gray-700"
                              >
                                <span className="font-semibold text-blue-700">
                                  {src.title}
                                </span>{' '}
                                &bull; <span className="text-gray-500">{src.section}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action tools for assistant messages */}
                      {!isUser && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 pl-1">
                          <span>{msg.timestamp}</span>
                          <button
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className="hover:text-gray-600 p-1 rounded transition-colors flex items-center gap-1"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => speakText(msg.text, msg.id)}
                            className="hover:text-gray-600 p-1 rounded transition-colors"
                            title="Listen with ElevenLabs Voice"
                          >
                            {speakingMsgId === msg.id ? (
                              <VolumeX className="w-3.5 h-3.5 text-brand" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-xl w-max shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
                    <span>Searching curriculum RAG index...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompts */}
              {messages.length <= 2 && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60 overflow-x-auto no-scrollbar">
                  <div className="flex gap-1.5 whitespace-nowrap">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className="px-2.5 py-1 text-xs bg-white text-gray-700 rounded-full border border-gray-200 hover:border-brand hover:text-brand transition-colors shrink-0 shadow-2xs"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-gray-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Ask anything about this curriculum..."
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      className="w-full pl-3 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setMode('voice')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand transition-colors"
                      title="Switch to voice mode"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputVal.trim()}
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                {/* Footer Brand Credit */}
                <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-gray-400">
                  <span>Powered by</span>
                  <div className="flex items-center gap-1 font-semibold text-gray-600">
                    <span className="flex gap-0.5">
                      <span className="w-0.5 h-2.5 bg-gray-600 rounded-full" />
                      <span className="w-0.5 h-2.5 bg-gray-600 rounded-full" />
                    </span>
                    <span>ElevenLabs Conversational AI</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
