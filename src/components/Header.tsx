import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack }) => {
  return (
    <div className="bg-white md:px-8 px-4 py-6 flex items-center justify-between border-b-[0.5px] border-[#CED4DA]">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-brand hover:text-blue-700 font-semibold text-lg flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
          <span className="text-xs md:text-lg">Back</span>
        </button>
        <h1 className="text-xs font-semibold md:text-base text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {/* Placeholder for header actions if needed */}
      </div>
    </div>
  );
};
