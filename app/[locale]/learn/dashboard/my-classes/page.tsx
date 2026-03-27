import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInstructorClassesByUserId } from '@/lib/instructors/queries';
import { InstructorClassCard } from '@/components/learn/InstructorClassCard';
import { GraduationCap, Calendar } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'instructor' });

  return {
    title: t('my_classes'),
  };
}

export default async function MyClassesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/auth`);
  }

  const t = await getTranslations({ locale, namespace: 'instructor' });
  const { profile, classes, upcomingSessions } = await getInstructorClassesByUserId(user.id);

  return (
    <div className="space-y-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-teal/10">
          <GraduationCap size={20} className="text-accent-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-serif text-fg-primary">{t('my_classes')}</h1>
          {profile && (
            <p className="text-sm text-fg-tertiary">{profile.display_name}</p>
          )}
        </div>
      </div>

      {/* No instructor profile or no classes */}
      {(!profile || classes.length === 0) ? (
        <div className="bg-bg-secondary border border-border-default rounded-lg p-8 text-center">
          <GraduationCap size={32} className="text-fg-muted mx-auto mb-3" />
          <p className="text-sm text-fg-tertiary">{t('no_classes')}</p>
        </div>
      ) : (
        <>
          {/* Class cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((item) => (
              <InstructorClassCard key={item.course_id} item={item} />
            ))}
          </div>

          {/* Upcoming Teaching Sessions */}
          {upcomingSessions.length > 0 && (
            <div className="bg-bg-secondary border border-border-default rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-accent-teal" />
                <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
                  {t('upcoming_sessions')}
                </h2>
              </div>
              <div className="space-y-3">
                {upcomingSessions.map((session) => {
                  const sessionTitle = locale === 'ja' && session.title_jp
                    ? session.title_jp : session.title_en;
                  const courseTitle = locale === 'ja' && session.course_title_jp
                    ? session.course_title_jp : session.course_title_en;
                  const sessionDate = new Date(session.scheduled_at);

                  const formatBadgeColor = session.format === 'live'
                    ? 'bg-accent-teal/10 text-accent-teal'
                    : session.format === 'hybrid'
                      ? 'bg-accent-gold/10 text-accent-gold'
                      : 'bg-bg-tertiary text-fg-tertiary';

                  return (
                    <div key={session.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-fg-primary truncate">{sessionTitle}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${formatBadgeColor}`}>
                            {session.format}
                          </span>
                        </div>
                        <span className="text-xs text-fg-tertiary">{courseTitle}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-fg-tertiary">
                          {sessionDate.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-fg-tertiary">
                          {sessionDate.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
