import React, { useState } from 'react';
import { MOCK_TRAINING_DATA } from './data/mockData';
import type { TabType } from './types';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { OverviewTab } from './components/tabs/OverviewTab';
import { TrainingProfileTab } from './components/tabs/TrainingProfileTab';
import { AudienceProfileTab } from './components/tabs/AudienceProfileTab';
import { ModuleTab } from './components/tabs/ModuleTab';
import { SurveyTab } from './components/tabs/SurveyTab';
import { AssessmentTab } from './components/tabs/AssessmentTab';
import { ContentTab } from './components/tabs/ContentTab';
import { CurriculumCopilot } from './components/assistant/CurriculumCopilot';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState(MOCK_TRAINING_DATA as any);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [suggestedDrafts, setSuggestedDrafts] = useState<Record<string, any>>({});

  const handleApplyDraftToCanvas = (tab: string, updatedDraft: any) => {
    const cleanTab = tab.replace('_', '-');
    setSuggestedDrafts((prev) => ({ ...prev, [cleanTab]: updatedDraft }));

    if (cleanTab === 'module' && updatedDraft.modules) {
      const converted = updatedDraft.modules.map((m: any, idx: number) => ({
        id: m.id || `mod-ai-${idx}-${Date.now()}`,
        name: m.title || m.name,
        title: m.title || m.name,
        description: m.description,
        trainingTag: { name: 'AI Suggested' },
        practical_assignment: m.practical_assignment,
        topics: m.topics || (m.lessons ? [{ title: 'Core Lessons & Topics', order: 1, lessons: m.lessons }] : []),
        lessons: m.lessons || [],
      }));
      setData((prev: any) => ({ ...prev, modules: converted }));
    } else if (cleanTab === 'survey' && (updatedDraft.questions || updatedDraft.sections)) {
      setData((prev: any) => ({ ...prev, surveys: updatedDraft.sections || updatedDraft.questions }));
    } else if (cleanTab === 'assessment' && updatedDraft.sections) {
      setData((prev: any) => ({ ...prev, assessments: updatedDraft.sections }));
    } else if (cleanTab === 'training-profile' && updatedDraft.scope) {
      setData((prev: any) => ({
        ...prev,
        trainingProfile: { ...prev.trainingProfile, scope: updatedDraft.scope },
      }));
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={data} />;
      case 'training_profile':
        return (
          <TrainingProfileTab
            data={data}
            onUpdateData={setData}
            suggestedDraft={suggestedDrafts['training-profile']}
            onDismissDraft={() => setSuggestedDrafts((prev) => ({ ...prev, 'training-profile': null }))}
          />
        );
      case 'audience_profile':
        return <AudienceProfileTab data={data} />;
      case 'module':
        return (
          <ModuleTab
            data={data}
            onUpdateData={setData}
            onOpenCopilot={() => setIsCopilotOpen(true)}
            suggestedDraft={suggestedDrafts['module']}
            onDismissDraft={() => setSuggestedDrafts((prev) => ({ ...prev, module: null }))}
          />
        );
      case 'survey':
        return (
          <SurveyTab
            data={data}
            onUpdateData={setData}
            suggestedDraft={suggestedDrafts['survey']}
            onDismissDraft={() => setSuggestedDrafts((prev) => ({ ...prev, survey: null }))}
          />
        );
      case 'assessment':
        return (
          <AssessmentTab
            data={data}
            onUpdateData={setData}
            suggestedDraft={suggestedDrafts['assessment']}
            onDismissDraft={() => setSuggestedDrafts((prev) => ({ ...prev, assessment: null }))}
          />
        );
      case 'content':
        return <ContentTab data={data} onUpdateData={setData} />;
      default:
        return <OverviewTab data={data} />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans relative">
      <div className="opacity-100 transition-opacity duration-300 min-h-screen pb-16">
        {/* Top Header */}
        <Header
          title={data.training.title}
          onBack={() => {
            console.log('Back clicked');
          }}
        />

        {/* Tab Navigation */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Active Tab View */}
        <main className="w-full">
          {renderTabContent()}
        </main>
      </div>

      {/* Interactive Curriculum Designer Copilot Drawer & Trigger */}
      <CurriculumCopilot
        activeTab={activeTab}
        trainingData={data}
        isOpen={isCopilotOpen}
        onToggleOpen={setIsCopilotOpen}
        onApplyDraftToCanvas={handleApplyDraftToCanvas}
      />
    </div>
  );
}

export default App;
