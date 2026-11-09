import React, { useState } from 'react';
import { TrainingData } from '../../types';
import { ChevronDown, MoreVertical, Plus, BookOpen } from 'lucide-react';

interface ModuleTabProps {
  data: TrainingData;
}

export const ModuleTab: React.FC<ModuleTabProps> = ({ data }) => {
  const [modules, setModules] = useState(data.modules || []);
  const [openModuleId, setOpenModuleId] = useState<string | null>(modules[0]?.id || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  const toggleModule = (id: string) => {
    setOpenModuleId(openModuleId === id ? null : id);
  };

  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;
    const newMod = {
      id: `module-${Date.now()}`,
      name: newModuleName,
      description: newModuleDesc,
      trainingTag: { name: 'Custom' },
    };
    setModules([...modules, newMod]);
    setNewModuleName('');
    setNewModuleDesc('');
    setIsAddModalOpen(false);
    setOpenModuleId(newMod.id);
  };

  return (
    <div className="px-[7%] py-10 mb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-md md:text-xl text-black mb-1 font-semibold">Modules</h1>
          <h2 className="text-md md:text-lg text-gray-500 font-normal">
            A concise summary of the course modules, outlining their content and structure
          </h2>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-brand text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm self-start md:self-auto"
        >
          <img src="/modulePlus.svg" alt="" className="w-4 h-4 invert" />
          <span>Module</span>
        </button>
      </div>

      <div className="space-y-4">
        {modules.map((mod) => {
          const isOpen = openModuleId === mod.id;
          return (
            <div
              key={mod.id}
              className={`border-[0.5px] border-[#CED4DA] rounded-md transition-all ${
                isOpen ? 'bg-[#f7fbff]' : 'bg-white'
              }`}
            >
              <div
                onClick={() => toggleModule(mod.id)}
                className={`p-6 flex items-center justify-between cursor-pointer rounded-lg ${
                  isOpen ? 'bg-[#f7fbff]' : 'bg-white hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-semibold text-md md:text-xl text-gray-900">
                    {mod.name}
                  </span>
                  {mod.trainingTag?.name && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {mod.trainingTag.name}
                    </span>
                  )}
                </div>

                <div className="text-gray-400 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="hover:bg-gray-100 h-8 w-8 p-0 rounded-md flex items-center justify-center text-gray-500 transition-colors"
                    title="Module options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    className={`p-1 hover:bg-gray-100 rounded-md text-black transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="pb-6 px-6 pt-0">
                  <div className="bg-white p-6 rounded-md border border-gray-100 space-y-4">
                    <div>
                      <h4 className="text-gray-700 font-medium mb-1">Description:</h4>
                      <p className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-line">
                        {mod.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-brand" />
                        <span>Module ID: {mod.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Module Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Module</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddModule} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Module Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Week 5 - Advanced Deep Learning"
                  value={newModuleName}
                  onChange={(e) => setNewModuleName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide module overview, objectives, and structure..."
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  Save Module
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
