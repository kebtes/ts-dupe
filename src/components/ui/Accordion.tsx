import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  extraHeader?: React.ReactNode;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  children,
  defaultOpen = false,
  extraHeader,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`border-[0.5px] border-[#CED4DA] rounded-md transition-colors ${
        isOpen ? 'bg-[#f7fbff]' : 'bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full transition-all rounded-lg p-6 flex items-center justify-between hover:no-underline text-left ${
          isOpen ? 'bg-[#f7fbff]' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-md md:text-xl text-gray-900">{title}</span>
          {extraHeader}
        </div>
        <div className="text-gray-400 flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-black transition-transform" />
          ) : (
            <ChevronRight className="h-5 w-5 text-black transition-transform" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="pb-4 pt-0">
          <div className="bg-white p-6 space-y-4 rounded-b-md border-t border-gray-100">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export const AccordionGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = 'space-y-4',
}) => {
  return <div className={className}>{children}</div>;
};
