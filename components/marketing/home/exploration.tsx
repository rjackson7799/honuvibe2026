import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import {
  Card,
  Container,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

const projectImages = [
  {
    src: '/projects/kwame-brathwaite/Card_Kwame.jpg',
    alt: 'KwameBrathwaite.com homepage',
  },
  {
    src: '/projects/harpers-circle/Card_Harper.jpg',
    alt: "Harper's Circle app interface",
  },
  {
    src: '/projects/hci-medical/Card_HCI.jpg',
    alt: 'HCI Medical Group homepage',
  },
] as const;

const projectTags: ReadonlyArray<readonly string[]> = [
  ['Next.js', 'Tailwind', 'Claude AI'],
  ['Next.js', 'Supabase', 'Claude AI'],
  ['Next.js', 'Supabase', 'Custom PM'],
];

export function HomeExploration() {
  const t = useTranslations('home.exploration');

  const projects = ([1, 2, 3] as const).map((n, i) => ({
    title: t(`project_${n}_title` as 'project_1_title'),
    desc: t(`project_${n}_desc` as 'project_1_desc'),
    image: projectImages[i],
    tags: projectTags[i],
  }));

  return (
    <Section variant="canvas">
      <Container>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionHeading className="mb-2">{t('heading')}</SectionHeading>
            <p className="text-[16px] text-[var(--m-ink-secondary)]">
              {t('subhead')}
            </p>
          </div>
          <a
            href="/explore"
            className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--m-accent-teal)] transition-opacity hover:opacity-80"
          >
            {t('see_all')}
            <ArrowRight size={16} strokeWidth={2} />
          </a>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.title}
              interactive
              className="cursor-default overflow-hidden p-0"
            >
              <div className="relative h-40 overflow-hidden bg-[var(--m-sand)]">
                <Image
                  src={project.image.src}
                  alt={project.image.alt}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background:
                      'linear-gradient(160deg, transparent 60%, rgba(26,43,51,0.15))',
                  }}
                  aria-hidden
                />
              </div>
              <div className="p-5">
                <h4 className="mb-1.5 text-[16px] font-bold text-[var(--m-ink-primary)]">
                  {project.title}
                </h4>
                <p className="mb-3.5 text-[13.5px] leading-[1.5] text-[var(--m-ink-secondary)]">
                  {project.desc}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--m-sand)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--m-ink-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
