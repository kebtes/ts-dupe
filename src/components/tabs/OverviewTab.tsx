import React from 'react';
import { TrainingData } from '../../types';
import { AccordionItem, AccordionGroup } from '../ui/Accordion';

interface OverviewTabProps {
  data: TrainingData;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
  const { training } = data;

  return (
    <div className="px-[7%] py-10 mb-10">
      <h1 className="text-md md:text-xl text-black mb-4 font-semibold">Overview</h1>
      <h2 className="text-md md:text-lg text-gray-500 font-normal mb-6">
        A concise summary of the course, outlining its purpose, scope, and key features
      </h2>

      <AccordionGroup className="space-y-4">
        {/* Basic Information */}
        <AccordionItem title="Basic Information" defaultOpen={true}>
          <div className="space-y-4">
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Title:</h3>
              <p className="text-gray-600 text-sm md:text-base">{training.title}</p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Rationale:</h3>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                {training.rationale}
              </p>
            </div>
            {training.trainingTags && training.trainingTags.length > 0 && (
              <div>
                <h3 className="text-gray-700 font-medium mb-1">Training Tags:</h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {training.trainingTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Location */}
        <AccordionItem title="Location">
          <div className="space-y-4">
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Countries:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.zones?.[0]?.region?.country?.name || 'Ethiopia'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Regions:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.zones?.[0]?.region?.name || 'Addis Ababa City Administration'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Zones:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.zones?.map((z) => z.name).join(', ') || 'Bole Sub City'}
              </p>
            </div>
          </div>
        </AccordionItem>

        {/* Training Details */}
        <AccordionItem title="Training Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Duration:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.duration} {training.durationType?.toLowerCase() || 'months'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Delivery Method:</h3>
              <p className="text-gray-600 text-sm md:text-base capitalize">
                {training.deliveryMethod?.toLowerCase() || 'Blended'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Start Date:</h3>
              <p className="text-gray-600 text-sm md:text-base">{training.startDate || '7/15/2026'}</p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">End Date:</h3>
              <p className="text-gray-600 text-sm md:text-base">{training.endDate || '9/15/2026'}</p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Training Type:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.trainingType?.name || 'Short Term Training'}
              </p>
            </div>
          </div>
        </AccordionItem>

        {/* Target Audience */}
        <AccordionItem title="Target Audience">
          <div className="space-y-4">
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Total Participants:</h3>
              <p className="text-gray-600 text-sm md:text-base">{training.totalParticipants || 30}</p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Gender Distribution:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.genderPercentages
                  ?.map(
                    (g) => `${g.gender.charAt(0) + g.gender.slice(1).toLowerCase()} (${g.percentage}%)`
                  )
                  .join(', ') || 'Male (50%), Female (50%)'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Age Groups:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.ageGroups?.map((a) => a.name).join(', ') ||
                  '25-29 Years, 30-35 Years, 18–24 Years'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Economic Backgrounds:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.economicBackgrounds?.map((e) => e.name).join(', ') || 'None'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Academic Qualifications:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.academicQualifications?.map((q) => q.name).join(', ') ||
                  'Bachelor’s Degree, Diploma'}
              </p>
            </div>
          </div>
        </AccordionItem>

        {/* Purpose of the training */}
        <AccordionItem title="Purpose of the training">
          <div className="space-y-4">
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Training Purpose:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.trainingPurposes?.map((p) => p.name).join(', ') || 'Skill Development'}
              </p>
            </div>
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Certificate Description:</h3>
              <p className="text-gray-600 text-sm md:text-base">
                {training.certificateDescription || '----'}
              </p>
            </div>
          </div>
        </AccordionItem>
      </AccordionGroup>
    </div>
  );
};
