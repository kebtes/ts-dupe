import React, { useState } from 'react';
import { TrainingData } from '../../types';
import { Plus, MoreVertical, Eye, CheckCircle2 } from 'lucide-react';

interface AssessmentTabProps {
  data: TrainingData;
}

export const AssessmentTab: React.FC<AssessmentTabProps> = ({ data }) => {
  const [assessments, setAssessments] = useState(data.assessments || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('INDIVIDUAL');
  const [weight, setWeight] = useState(10);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newAss = {
      id: `ass-${Date.now()}`,
      name,
      type: 'SELF_GRADED',
      target,
      weight,
      assignedTo: 'Not assigned',
      cohort: 'Not assigned',
      approvalStatus: 'APPROVED',
    };
    setAssessments([...assessments, newAss as any]);
    setName('');
    setIsModalOpen(false);
  };

  return (
    <div className="px-[7%] py-10 mb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-md md:text-xl text-black mb-1 font-semibold">Assessment</h1>
          <h2 className="text-md md:text-lg text-gray-500 font-normal">
            Manage course assessments, rubrics, weightings, and approvals
          </h2>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-brand text-white px-5 py-2.5 rounded-md text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Assessment</span>
        </button>
      </div>

      <div className="bg-white border-[0.5px] border-[#CED4DA] rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full caption-bottom text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#CED4DA] bg-gray-50">
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">
                Assessment Type
              </th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Target</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Weight</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Assigned To</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">Cohort</th>
              <th className="py-4 px-5 text-left text-sm font-medium text-gray-500">
                Approval Status
              </th>
              <th className="py-4 px-5 text-right text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assessments.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50/70 transition-colors duration-150"
              >
                <td className="py-4 px-5 font-semibold text-gray-900 max-w-xs">{item.name}</td>
                <td className="py-4 px-5 text-gray-600 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {item.type === 'SELF_GRADED' ? 'Self-graded' : item.type}
                    </span>
                    <span className="text-xs text-gray-500">Admin only</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-gray-700 whitespace-nowrap capitalize">
                  {item.target ? item.target.toLowerCase() : 'Individual'}
                </td>
                <td className="py-4 px-5 text-gray-900 font-semibold whitespace-nowrap">
                  {item.weight || 0}%
                </td>
                <td className="py-4 px-5 text-gray-500 whitespace-nowrap">
                  {item.assignedTo || 'Not assigned'}
                </td>
                <td className="py-4 px-5 text-gray-500 whitespace-nowrap">
                  {item.cohort || 'Not assigned'}
                </td>
                <td className="py-4 px-5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{item.approvalStatus || 'Approved'}</span>
                  </span>
                </td>
                <td className="py-4 px-5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="View assessment"
                      className="p-1.5 text-gray-400 hover:text-brand hover:bg-blue-50 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      title="More options"
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">New Assessment</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Capstone Research Project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Target</label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="GROUP">Group</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Weight (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand border-[#CED4DA]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  Create Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
