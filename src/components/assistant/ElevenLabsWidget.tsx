import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Copy,
  Check,
  Sparkles,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { queryRag, RagSource } from './ragEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: RagSource[];
}

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  sender: 'assistant',
  text: "Hello! I'm your curriculum AI assistant for the **AI/ML Residency Program**.\n\nAsk me anything about modules, schedule, passing criteria, prerequisites, or assessments.",
  timestamp: 'Just now',
  sources: [
    {
      title: 'Curriculum Repository',
      section: 'Overview & Training Profile',
      snippet: 'AI/ML Residency Program Training documentation and learning roadmap.',
    },
  ],
};

const QUICK_PROMPTS = [
  'What are the 6 modules?',
  'What is the passing score?',
  'Who is the target audience?',
  'What assessments are included?',
];

export const ElevenLabsWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

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

    // Simulate instant RAG retrieval
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
    }, 600);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 bg-[#0f141c] hover:bg-black text-white px-4 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] border border-neutral-700 hover:border-neutral-500 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            title="Open AI Assistant"
          >
            {/* ElevenLabs double vertical bar logo */}
            <div className="flex items-center gap-1 h-4">
              <span className="w-1.5 h-3.5 bg-white rounded-full group-hover:scale-y-110 transition-transform" />
              <span className="w-1.5 h-3.5 bg-white rounded-full group-hover:scale-y-125 transition-transform" />
            </div>

            <span className="text-sm font-medium tracking-wide">Ask Assistant</span>

            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
          </button>
        </div>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[400px] h-[550px] max-h-[82vh] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#0f141c] text-white px-4 py-3 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              {/* ElevenLabs logo icon */}
              <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center gap-1">
                <span className="w-1 h-3 bg-white rounded-full" />
                <span className="w-1 h-3 bg-white rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight flex items-center gap-1">
                  Curriculum AI
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                </h3>
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  RAG Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fcfcfd]">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-neutral-900 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {/* RAG Sources Citation Box */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 space-y-1">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3 text-brand" />
                          Retrieved Sources
                        </span>
                        {msg.sources.map((src, i) => (
                          <div
                            key={i}
                            className="p-1 rounded bg-blue-50/80 border border-blue-100 text-[11px] text-gray-700"
                          >
                            <span className="font-semibold text-blue-700">{src.title}</span>
                            <span className="text-gray-400"> &bull; {src.section}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isUser && (
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 pl-1">
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="hover:text-gray-600 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600 inline" />
                        ) : (
                          <Copy className="w-3 h-3 inline" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-xl w-max shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
                <span>Searching curriculum...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          {messages.length <= 2 && (
            <div className="px-3.5 py-2 border-t border-gray-100 bg-gray-50/70 overflow-x-auto no-scrollbar">
              <div className="flex gap-1.5 whitespace-nowrap">
                {QUICK_PROMPTS.map((prompt, i) => (
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

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-gray-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask about modules, requirements, assessments..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all"
              />

              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="p-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Footer */}
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
    </>
  );
};
