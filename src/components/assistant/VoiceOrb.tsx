import React, { useEffect, useState } from 'react';

export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface VoiceOrbProps {
  state: AgentState;
  onClick?: () => void;
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, onClick, size = 160 }) => {
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    if (state === 'speaking' || state === 'listening') {
      const interval = setInterval(() => {
        setPulseScale(0.95 + Math.random() * 0.12);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setPulseScale(1);
    }
  }, [state]);

  const stateColors = {
    idle: 'from-blue-600 via-indigo-600 to-sky-400 shadow-blue-500/30',
    listening: 'from-emerald-500 via-teal-500 to-cyan-400 shadow-teal-500/40 ring-4 ring-emerald-300/30',
    thinking: 'from-amber-500 via-orange-500 to-rose-400 shadow-orange-500/40 animate-spin',
    speaking: 'from-blue-600 via-cyan-500 to-purple-600 shadow-cyan-500/50',
  };

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none group"
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl opacity-60 transition-all duration-700 ${
          state === 'speaking' ? 'bg-gradient-to-tr from-cyan-400 to-blue-600 scale-125' : 'bg-blue-400/20'
        }`}
      />

      {/* Ripple ring 1 */}
      {(state === 'listening' || state === 'speaking') && (
        <div
          className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping opacity-75"
          style={{ animationDuration: '2s' }}
        />
      )}

      {/* Ripple ring 2 */}
      {state === 'speaking' && (
        <div
          className="absolute -inset-4 rounded-full border border-blue-400/30 animate-pulse"
          style={{ animationDuration: '1.5s' }}
        />
      )}

      {/* Core Fluid Orb */}
      <div
        className={`relative rounded-full shadow-2xl transition-transform duration-200 bg-gradient-to-tr ${stateColors[state]} flex items-center justify-center overflow-hidden`}
        style={{
          width: size * 0.75,
          height: size * 0.75,
          transform: `scale(${pulseScale})`,
        }}
      >
        {/* Dynamic inner surface light shimmer */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7),transparent_60%)] pointer-events-none" />

        {/* Ambient floating inner sphere */}
        <div className="absolute -top-6 -left-6 w-20 h-20 bg-white/30 rounded-full blur-md" />

        {/* Micro equalizer inside when speaking */}
        {state === 'speaking' && (
          <div className="flex items-center gap-1 z-10">
            <span className="w-1 bg-white rounded-full h-4 animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-1 bg-white rounded-full h-7 animate-bounce" style={{ animationDelay: '0.15s' }} />
            <span className="w-1 bg-white rounded-full h-5 animate-bounce" style={{ animationDelay: '0.3s' }} />
            <span className="w-1 bg-white rounded-full h-8 animate-bounce" style={{ animationDelay: '0.1s' }} />
            <span className="w-1 bg-white rounded-full h-4 animate-bounce" style={{ animationDelay: '0.25s' }} />
          </div>
        )}

        {state === 'listening' && (
          <div className="z-10 text-white font-medium text-xs tracking-wider uppercase opacity-90 animate-pulse">
            Listening
          </div>
        )}

        {state === 'thinking' && (
          <div className="z-10 text-white font-medium text-xs tracking-wider uppercase opacity-90">
            Thinking...
          </div>
        )}

        {state === 'idle' && (
          <div className="z-10 flex flex-col items-center">
            {/* ElevenLabs double vertical bar icon */}
            <div className="flex gap-1.5 h-6 items-center">
              <span className="w-1.5 h-5 bg-white rounded-full" />
              <span className="w-1.5 h-5 bg-white rounded-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
