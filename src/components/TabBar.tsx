import React from 'react';
import { TabType } from '../types';

interface TabItem {
  id: TabType;
  label: string;
  icon: string;
  activeIcon: string;
}

const TABS: TabItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '/overview.svg',
    activeIcon: '/overview_active.svg',
  },
  {
    id: 'training_profile',
    label: 'Training Profile',
    icon: '/trainingProfile.svg',
    activeIcon: '/baseDataActive.svg',
  },
  {
    id: 'audience_profile',
    label: 'Audience Profile',
    icon: '/audienceProfile.svg',
    activeIcon: '/audience_active.svg',
  },
  {
    id: 'module',
    label: 'Module',
    icon: '/module.svg',
    activeIcon: '/module_active.svg',
  },
  {
    id: 'survey',
    label: 'Survey',
    icon: '/survey.svg',
    activeIcon: '/surveyActive.svg',
  },
  {
    id: 'assessment',
    label: 'Assessment',
    icon: '/assessment.svg',
    activeIcon: '/assessmentSelected.svg',
  },
  {
    id: 'content',
    label: 'Content',
    icon: '/content.svg',
    activeIcon: '/content-active.svg',
  },
];

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex my-14 min-w-max gap-8 border-b-[0.5px] border-[#CED4DA] mb-6 px-[7%]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`pb-4 text-sm font-medium flex items-center gap-2 relative whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-brand border-b-2 border-brand font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <img
                src={isActive ? tab.activeIcon : tab.icon}
                alt=""
                className="w-4 h-4 object-contain"
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
