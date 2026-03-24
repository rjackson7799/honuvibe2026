'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

const INSTRUCTOR_DATA = [
  { 
    id: 'ryan',
    imgSrc: '/images/partners/instructors/ryan.webp', 
    nameKey: 'ryan_name', 
    roleKey: 'ryan_role', 
    bioKey: 'ryan_bio',
    hasEducation: true
  },
  { 
    id: 'mizuho',
    imgSrc: '/images/partners/instructors/mizuho.webp', 
    nameKey: 'mizuho_name', 
    roleKey: 'mizuho_role', 
    bioKey: 'mizuho_bio' 
  },
  { 
    id: 'chimi',
    imgSrc: '/images/partners/instructors/chimi.webp', 
    nameKey: 'chimi_name', 
    roleKey: 'chimi_role', 
    bioKey: 'chimi_bio' 
  },
] as const;

export function VerticeTeacherProfiles() {
  const t = useTranslations('vertice');

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4">
        {INSTRUCTOR_DATA.map(({ id, imgSrc, nameKey, roleKey, bioKey, hasEducation }) => (
          <div
            key={id}
            className="flex flex-col sm:flex-row items-center sm:items-start rounded-lg border border-border-secondary bg-bg-secondary p-5 sm:p-6 gap-5 sm:gap-6"
          >
            {/* Left: Profile Image */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden flex-shrink-0 bg-bg-tertiary">
              <Image
                src={imgSrc}
                alt={t(`instructors.${nameKey}`)}
                fill
                className="object-cover"
              />
            </div>

            {/* Right: Info */}
            <div className="flex flex-col flex-1 text-center sm:text-left">
              <h4 className="text-xl font-bold tracking-tight text-white mb-1">
                {t(`instructors.${nameKey}`)}
              </h4>
              <p className="text-accent-teal font-medium text-sm mb-3">
                {t(`instructors.${roleKey}`)}
              </p>
              <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap">
                {t(`instructors.${bioKey}`)}
              </p>
              
              {/* Conditional Education Section items */}
              {hasEducation && (
                <div className="mt-4 pt-4 border-t border-border-secondary/50">
                  <p className="text-xs font-semibold text-accent-teal uppercase tracking-wider mb-2">
                    {t('instructors.ryan_education_title')}
                  </p>
                  <p className="text-sm text-fg-secondary leading-snug">
                    {t('instructors.ryan_education_1')}
                  </p>
                  <p className="text-sm text-fg-secondary leading-snug mt-1">
                    {t('instructors.ryan_education_2')}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
