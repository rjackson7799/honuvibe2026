import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, DollarSign, BookOpen, JapaneseYen, ExternalLink } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { PartnerPortalLayout } from '@/components/partner-portal/PartnerPortalLayout';
import { EnrollmentTrendChart } from '@/components/partner-portal/EnrollmentTrendChart';
import {
  resolvePartnerScope,
  getPartnerStats,
  getPartnerCourses,
  getPartnerDailyEnrollments,
} from '@/lib/partner-portal/queries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ as?: string }>;
};

export default async function PartnerDashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { as: previewId } = await searchParams;
  setRequestLocale(locale);

  const scope = await resolvePartnerScope({ locale, previewId });
  if (!scope) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/admin/partners`);
  }

  const { partner, previewMode } = scope;
  const [stats, courses, daily] = await Promise.all([
    getPartnerStats(partner.id),
    getPartnerCourses(partner.id),
    getPartnerDailyEnrollments(partner.id, 30),
  ]);

  const shareUrl = `https://honuvibe.com/${locale}/partners/${partner.slug}`;
  const isEmpty = stats.studentCount === 0;

  return (
    <PartnerPortalLayout
      partnerName={partner.name_en}
      partnerLogoUrl={partner.logo_url}
      previewMode={previewMode}
    >
      <div className="max-w-[1100px] space-y-8">
        <header>
          <h1 className="font-serif text-3xl text-fg-primary">Dashboard</h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Aggregate attribution for enrollments driven by your co-branded page.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Students"
            value={stats.studentCount}
            icon={Users}
            trend={formatDelta(stats.monthOverMonth.students, 'vs last month')}
          />
          <StatCard
            label="Revenue (USD)"
            value={formatUsd(stats.revenueUsd)}
            icon={DollarSign}
            trend={
              stats.monthOverMonth.revenueUsd !== 0
                ? `${stats.monthOverMonth.revenueUsd > 0 ? '+' : ''}${formatUsd(stats.monthOverMonth.revenueUsd)} vs last month`
                : undefined
            }
          />
          <StatCard
            label="Revenue (JPY)"
            value={formatJpy(stats.revenueJpy)}
            icon={JapaneseYen}
            trend={
              stats.monthOverMonth.revenueJpy !== 0
                ? `${stats.monthOverMonth.revenueJpy > 0 ? '+' : ''}${formatJpy(stats.monthOverMonth.revenueJpy)} vs last month`
                : undefined
            }
          />
          <StatCard label="Courses featured" value={stats.courseCount} icon={BookOpen} />
        </div>

        {isEmpty ? (
          <section className="rounded-lg border border-dashed border-border-default bg-bg-secondary p-8 text-center">
            <h2 className="font-serif text-xl text-fg-primary">No enrollments yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-fg-secondary">
              Share your co-branded page with your community. Enrollments made through this link
              (or within 30 days of visiting it) will be attributed to you.
            </p>
            <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded border border-border-default bg-bg-primary px-3 py-2">
              <code className="flex-1 truncate text-left font-mono text-xs text-fg-secondary">
                {shareUrl}
              </code>
              <Link
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent-teal hover:underline"
              >
                <ExternalLink size={12} /> Open
              </Link>
            </div>
          </section>
        ) : (
          <>
            <EnrollmentTrendChart data={daily} />

            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-serif text-xl text-fg-primary">Featured courses</h2>
                <Link
                  href="/partner/courses"
                  className="text-sm text-accent-teal hover:underline"
                >
                  View all →
                </Link>
              </div>

              {courses.length === 0 ? (
                <p className="rounded-lg border border-border-default bg-bg-secondary p-6 text-sm text-fg-tertiary">
                  No courses featured on your page yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-default text-fg-tertiary">
                        <th className="px-4 py-3 text-left font-medium">Course</th>
                        <th className="px-4 py-3 text-right font-medium">Lifetime</th>
                        <th className="px-4 py-3 text-right font-medium">This month</th>
                        <th className="px-4 py-3 text-right font-medium">USD</th>
                        <th className="px-4 py-3 text-right font-medium">JPY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c) => (
                        <tr
                          key={c.course_id}
                          className="border-b border-border-default last:border-0"
                        >
                          <td className="px-4 py-3 text-fg-primary">
                            {c.title_en}
                            {!c.is_published && (
                              <span className="ml-2 rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-fg-tertiary">
                                unpublished
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-fg-secondary">
                            {c.lifetimeEnrollments}
                          </td>
                          <td className="px-4 py-3 text-right text-fg-secondary">
                            {c.currentMonthEnrollments}
                          </td>
                          <td className="px-4 py-3 text-right text-fg-secondary">
                            {formatUsd(c.lifetimeRevenueUsd)}
                          </td>
                          <td className="px-4 py-3 text-right text-fg-secondary">
                            {formatJpy(c.lifetimeRevenueJpy)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PartnerPortalLayout>
  );
}

function formatUsd(cents: number): string {
  if (!cents) return '$0';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatJpy(yen: number): string {
  if (!yen) return '¥0';
  return `¥${yen.toLocaleString('en-US')}`;
}

function formatDelta(value: number, suffix: string): string | undefined {
  if (value === 0) return undefined;
  return `${value > 0 ? '+' : ''}${value} ${suffix}`;
}
