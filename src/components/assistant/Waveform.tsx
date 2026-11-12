import React from 'react';

interface WaveformProps {
  isPlaying?: boolean;
  barCount?: number;
  className?: string;
  color?: string;
}

export const Waveform: React.FC<WaveformProps> = ({
  isPlaying = true,
  barCount = 18,
  className = '',
  color = 'bg-brand',
}) => {
  return (
    <div className={`flex items-center gap-[2.5px] h-6 px-1 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => {
        // Vary heights
        const delays = [0, 0.2, 0.4, 0.1, 0.3, 0.5, 0.25, 0.15, 0.45];
        const delay = delays[i % delays.length];
        const baseHeight = 25 + Math.sin(i * 0.8) * 20;

        return (
          <span
            key={i}
            className={`w-[2.5px] rounded-full transition-all duration-300 ${color} ${
              isPlaying ? 'animate-pulse' : 'h-1.5 opacity-40'
            }`}
            style={{
              height: isPlaying ? `${Math.max(20, baseHeight)}%` : '15%',
              animationDelay: `${delay}s`,
              animationDuration: `${0.8 + (i % 3) * 0.2}s`,
            }}
          />
        );
      })}
    </div>
  );
};
