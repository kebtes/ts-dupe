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
import { ElevenLabsWidget } from './components/assistant/ElevenLabsWidget';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data] = useState(MOCK_TRAINING_DATA as any);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={data} />;
      case 'training_profile':
        return <TrainingProfileTab data={data} />;
      case 'audience_profile':
        return <AudienceProfileTab data={data} />;
      case 'module':
        return <ModuleTab data={data} />;
      case 'survey':
        return <SurveyTab data={data} />;
      case 'assessment':
        return <AssessmentTab data={data} />;
      case 'content':
        return <ContentTab data={data} />;
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

      {/* ElevenLabs Conversational AI RAG Assistant (Bottom Right) */}
      <ElevenLabsWidget />
    </div>
  );
}

export default App;
