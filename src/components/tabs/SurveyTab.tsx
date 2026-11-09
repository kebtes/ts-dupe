import React, { useState } from 'react';
import { TrainingData } from '../../types';
import { ClipboardList, Plus, Eye, Edit2, Trash2 } from 'lucide-react';

interface SurveyTabProps {
  data: TrainingData;
}

export const SurveyTab: React.FC<SurveyTabProps> = ({ data }) => {
  const [surveys, setSurveys] = useState(data.surveys || []);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSurveyName, setNewSurveyName] = useState('');
  const [newSurveyDesc, setNewSurveyDesc] = useState('');
  const [newSurveyType, setNewSurveyType] = useState('OTHER');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurveyName.trim()) return;
    const newSurvey = {
      id: `survey-${Date.now()}`,
      name: newSurveyName,
      type: newSurveyType,
      description: newSurveyDesc,
      sectionCount: 1,
    };
    setSurveys([...surveys, newSurvey]);
    setNewSurveyName('');
    setNewSurveyDesc('');
    setIsCreateOpen(false);
  };

  return (
    <div className="px-[7%] py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Surveys</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Create and manage surveys for gathering trainee feedback
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-brand text-white px-4 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Survey</span>
        </button>
      </div>

      <div className="space-y-4">
        {surveys.map((survey) => (
          <div
            key={survey.id}
            className="border-[0.5px] border-[#CED4DA] rounded-lg p-5 bg-white hover:border-brand/50 transition-all group"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-brand transition-colors">
                    {survey.name}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium shrink-0">
                    {survey.type}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3 leading-relaxed line-clamp-2">
                  {survey.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-gray-400" />
                    <span>{(survey as any).sectionCount || 6} sections</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  title="Preview survey"
                  className="p-1.5 text-gray-500 hover:text-brand hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  title="Edit survey"
                  className="p-1.5 text-gray-500 hover:text-brand hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Create New Survey</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Survey Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-term Participant Feedback"
                  value={newSurveyName}
                  onChange={(e) => setNewSurveyName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Survey Type
                </label>
                <select
                  value={newSurveyType}
                  onChange={(e) => setNewSurveyType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                >
                  <option value="PRE_TRAINING">PRE_TRAINING</option>
                  <option value="POST_TRAINING">POST_TRAINING</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the purpose of this survey to trainees..."
                  value={newSurveyDesc}
                  onChange={(e) => setNewSurveyDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  Create Survey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
