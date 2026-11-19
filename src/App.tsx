import React, { useEffect, useState } from 'react';
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
import { getActiveTrainingId, isConfiguredTrainingOverride, pingBackend } from './api/tabs';
import { useTrainingStructure } from './api/useTrainingStructure';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState(MOCK_TRAINING_DATA as any);

  // Real backend training identity (shared, cached structure request).
  const backendTrainingId = getActiveTrainingId(data.training?.id);
  const {
    structure,
    loading: structureLoading,
  } = useTrainingStructure(backendTrainingId);

  // Backend reachability indicator: when the backend is down, AI suggestions
  // come from the clearly-marked offline demo generator. Show that upfront
  // instead of letting users discover it in the draft card.
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const up = await pingBackend();
      if (!cancelled) setBackendUp(up);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const backendTitle = structure?.title || null;
  const headerTitle = backendTitle || data.training.title;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={data} />;
      case 'training_profile':
        return <TrainingProfileTab data={data} onUpdateData={setData} />;
      case 'audience_profile':
        return <AudienceProfileTab data={data} />;
      case 'module':
        return <ModuleTab data={data} onUpdateData={setData} />;
      case 'survey':
        return <SurveyTab data={data} onUpdateData={setData} />;
      case 'assessment':
        return <AssessmentTab data={data} onUpdateData={setData} />;
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
          title={headerTitle}
          onBack={() => {
            console.log('Back clicked');
          }}
        />

        {/* Backend offline indicator: offline demo drafts are clearly labeled,
            but warn upfront so the state is never surprising. */}
        {backendUp === false && (
          <div className="px-[7%]">
            <div className="flex items-center gap-2 border border-red-200 bg-red-50 text-red-700 rounded-lg p-3 text-xs mb-4">
              <span className="font-semibold">AI backend is offline.</span>
              <span>
                Suggestions will be clearly-marked offline demo drafts, not live AI output.
                Start the backend at localhost:8000 to generate real content.
              </span>
            </div>
          </div>
        )}

        {/* Backend training transparency notice: the on-screen title may be demo
            data; generation targets the configured backend training record. */}
        {isConfiguredTrainingOverride(data.training?.id) && (
          <div className="px-[7%]">
            <div className="flex items-start gap-2 border border-sky-200 bg-sky-50 text-sky-900 rounded-lg p-3 text-xs mb-4">
              <span className="font-semibold shrink-0">Backend training in use:</span>
              <span className="font-mono">{backendTrainingId}</span>
              <span className="text-sky-700">
                {structureLoading
                  ? '— loading the backend record…'
                  : backendTitle
                  ? `— backend record: “${backendTitle}” (page title above is demo data).`
                  : '— the title above is demo data and may not match this backend record.'}
              </span>
            </div>
          </div>
        )}

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
