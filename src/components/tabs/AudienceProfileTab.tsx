import React from 'react';
import { TrainingData } from '../../types';
import { AccordionItem, AccordionGroup } from '../ui/Accordion';

interface AudienceProfileTabProps {
  data: TrainingData;
}

export const AudienceProfileTab: React.FC<AudienceProfileTabProps> = ({ data }) => {
  const { audienceProfile } = data as any;

  return (
    <div className="px-[7%] py-10 mb-10">
      <h1 className="text-md md:text-xl text-black mb-4 font-semibold">Audience Profile</h1>
      <h2 className="text-md md:text-lg text-gray-500 font-normal mb-6">
        A concise summary of the course audience, outlining their learning level and prerequisites
      </h2>

      <AccordionGroup className="space-y-4">
        {/* Learner Characteristics */}
        <AccordionItem title="Learner Characteristics" defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Learner Level:</h3>
              <p className="text-gray-900 font-semibold text-base">
                {audienceProfile?.learnerLevel?.name || 'Advanced'}
              </p>
              {audienceProfile?.learnerLevel?.description && (
                <p className="text-gray-500 text-sm mt-0.5">
                  {audienceProfile.learnerLevel.description}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-gray-700 font-medium mb-1">Education Level:</h3>
              <p className="text-gray-900 font-semibold text-base">
                {audienceProfile?.educationLevel?.name || 'Bachelor’s Degree'}
              </p>
              {audienceProfile?.educationLevel?.description && (
                <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">
                  {audienceProfile.educationLevel.description}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-gray-700 font-medium mb-1">Language:</h3>
              <p className="text-gray-900 font-semibold text-base">
                {audienceProfile?.language?.name || 'English'}
              </p>
            </div>

            <div>
              <h3 className="text-gray-700 font-medium mb-1">Work Experience:</h3>
              <p className="text-gray-900 font-semibold text-base">
                {audienceProfile?.workExperience?.name || 'No Work Experience'}
              </p>
            </div>
          </div>
        </AccordionItem>

        {/* Prerequisites */}
        <AccordionItem title="Prerequisites">
          <div className="space-y-4">
            <div>
              <h3 className="text-gray-700 font-medium mb-1">Specific Prerequisites:</h3>
              {audienceProfile?.specificPrerequisites && audienceProfile.specificPrerequisites.length > 0 ? (
                <ul className="list-disc list-inside text-gray-600 text-sm md:text-base">
                  {audienceProfile.specificPrerequisites.map((p: any, idx: number) => (
                    <li key={idx}>{typeof p === 'string' ? p : p.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm italic">None specified</p>
              )}
            </div>

            <div>
              <h3 className="text-gray-700 font-medium mb-1">Certifications & Licenses:</h3>
              <p className="text-gray-500 text-sm italic">None specified</p>
            </div>
          </div>
        </AccordionItem>
      </AccordionGroup>
    </div>
  );
};
