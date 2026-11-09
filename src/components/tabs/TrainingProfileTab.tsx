import React from 'react';
import { TrainingData } from '../../types';
import { AccordionItem, AccordionGroup } from '../ui/Accordion';

interface TrainingProfileTabProps {
  data: TrainingData;
}

export const TrainingProfileTab: React.FC<TrainingProfileTabProps> = ({ data }) => {
  const { trainingProfile, objectives } = data as any;

  return (
    <div className="px-[7%] py-10 mb-10">
      <h1 className="text-md md:text-xl text-black mb-4 font-semibold">Training Profile</h1>
      <h2 className="text-md md:text-lg text-gray-500 font-normal mb-6">
        The Training Profile section is designed to provide a comprehensive overview of a training program.
      </h2>

      {/* Keywords section */}
      <div className="border-[0.5px] border-[#CED4DA] rounded-md p-6 bg-white mb-4">
        <h3 className="text-gray-900 font-semibold text-md md:text-lg mb-3">Keywords</h3>
        <div className="flex flex-wrap gap-2">
          {trainingProfile?.keywords?.map((kw: string, idx: number) => (
            <span
              key={idx}
              className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#1D4ED8] text-white"
            >
              {kw}
            </span>
          )) || (
            <>
              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#1D4ED8] text-white">AI</span>
              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#1D4ED8] text-white">ML</span>
            </>
          )}
        </div>
      </div>

      <AccordionGroup className="space-y-4">
        {/* Scope */}
        <AccordionItem title="Scope" defaultOpen={true}>
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Scope Description:</h4>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              {trainingProfile?.scope || 'The AI/ML Residency Program is a two-month, project-based training program...'}
            </p>
          </div>
        </AccordionItem>

        {/* Attendance Requirement */}
        <AccordionItem title="Attendance Requirement">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Minimum Attendance Percentage:</h4>
            <p className="text-gray-600 text-sm md:text-base font-semibold">
              {trainingProfile?.attendanceRequirementPercentage || 80}%
            </p>
          </div>
        </AccordionItem>

        {/* Assessment Result Requirement */}
        <AccordionItem title="Assessment Result Requirement">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Minimum Passing Percentage:</h4>
            <p className="text-gray-600 text-sm md:text-base font-semibold">
              {trainingProfile?.assessmentResultPercentage || 90}%
            </p>
          </div>
        </AccordionItem>

        {/* Competency Outcomes */}
        <AccordionItem title="Competency Outcomes">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Competency Outcomes / Professional Background:</h4>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              {trainingProfile?.professionalBackground || 'Upon successful completion of Phase 1 of the AI/ML Residency Program, residents will be able to collaborate in engineering teams, build production-grade AI solutions, and deploy machine learning models.'}
            </p>
          </div>
        </AccordionItem>

        {/* Alignment with Standard */}
        <AccordionItem title="Alignment with Standard">
          <div className="space-y-3">
            {trainingProfile?.alignmentsWithStandard?.map((std: any) => (
              <div key={std.id} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                <p className="font-medium text-gray-900">{std.name}</p>
                {std.description && std.description !== std.name && (
                  <p className="text-sm text-gray-500 mt-1">{std.description}</p>
                )}
              </div>
            )) || <p className="text-gray-600 text-sm">EDGE training standard guideline</p>}
          </div>
        </AccordionItem>

        {/* Prior Knowledge */}
        <AccordionItem title="Prior Knowledge">
          <div className="space-y-2">
            {trainingProfile?.priorKnowledgeList?.map((pk: string, idx: number) => (
              <span
                key={idx}
                className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-md text-sm mr-2 mb-2"
              >
                {pk}
              </span>
            )) || <p className="text-gray-600 text-sm">AI and ML Basics</p>}
          </div>
        </AccordionItem>

        {/* Learning Style Preferences */}
        <AccordionItem title="Learning Style Preferences">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trainingProfile?.learnerStylePreferences?.map((style: any) => (
              <div key={style.id} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                <p className="font-medium text-gray-900">{style.name}</p>
                {style.description && <p className="text-sm text-gray-500 mt-1">{style.description}</p>}
              </div>
            ))}
          </div>
        </AccordionItem>

        {/* Delivery Tools */}
        <AccordionItem title="Delivery Tools">
          <div className="space-y-3">
            {trainingProfile?.deliveryTools?.map((tool: any) => (
              <div key={tool.id} className="p-3 bg-gray-50 rounded-md border border-gray-100">
                <p className="font-medium text-gray-900">{tool.name.trim()}</p>
                {tool.description && <p className="text-sm text-gray-500 mt-1">{tool.description}</p>}
              </div>
            ))}
          </div>
        </AccordionItem>

        {/* Technological Requirements */}
        <AccordionItem title="Technological Requirements">
          <div className="space-y-4">
            <div>
              <h4 className="text-gray-700 font-medium mb-2">Learner Technological Requirements:</h4>
              <div className="space-y-2">
                {trainingProfile?.learnerTechnologicalRequirements?.map((req: any) => (
                  <div key={req.id} className="p-2.5 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700">
                    <span className="font-semibold">{req.name}</span>
                    {req.description && req.description !== 'None' && ` - ${req.description}`}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-gray-700 font-medium mb-2">Instructor Technological Requirements:</h4>
              <div className="space-y-2">
                {trainingProfile?.instructorTechnologicalRequirements?.map((req: any) => (
                  <div key={req.id} className="p-2.5 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700">
                    <span className="font-semibold">{req.name}</span>
                    {req.description && req.description !== 'None' && ` - ${req.description}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AccordionItem>

        {/* Training Objectives */}
        <AccordionItem title="Training Objectives">
          <div className="space-y-4">
            {objectives?.generalObjective && (
              <div>
                <h4 className="text-gray-700 font-medium mb-1">General Objective:</h4>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                  {typeof objectives.generalObjective === 'string'
                    ? objectives.generalObjective
                    : objectives.generalObjective.definition}
                </p>
              </div>
            )}
            {objectives?.specificObjectives && objectives.specificObjectives.length > 0 && (
              <div>
                <h4 className="text-gray-700 font-medium mb-2">Specific Objectives:</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-600 text-sm md:text-base">
                  {objectives.specificObjectives.map((obj: any, idx: number) => (
                    <li key={obj.id || idx} className="leading-relaxed">
                      {obj.definition}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AccordionItem>
      </AccordionGroup>
    </div>
  );
};
