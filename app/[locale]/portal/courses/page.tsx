import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { PartnerPortalLayout } from '@/components/partner-portal/PartnerPortalLayout';
import {
  resolvePartnerScope,
  getPartnerCourses,
} from '@/lib/partner-portal/queries';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ as?: string }>;
};

export default async function PartnerCoursesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { as: previewId } = await searchParams;
  setRequestLocale(locale);

  const scope = await resolvePartnerScope({ locale, previewId });
  if (!scope) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/admin/partners`);
  }

  const { partner, previewMode } = scope;
  const courses = await getPartnerCourses(partner.id);

  return (
    <PartnerPortalLayout
      partnerName={partner.name_en}
      partnerLogoUrl={partner.logo_url}
      previewMode={previewMode}
    >
      <div className="max-w-[1100px] space-y-6">
        <header>
          <h1 className="font-serif text-3xl text-fg-primary">Courses</h1>
          <p className="mt-1 text-sm text-fg-tertiary">
            Courses featured on your co-branded page, with per-course aggregates. USD and JPY are
            shown separately — no currency conversion.
          </p>
        </header>

        {courses.length === 0 ? (
          <div className="rounded-lg border border-border-default bg-bg-secondary p-8 text-center text-sm text-fg-secondary">
            No courses are currently featured on your page. Contact HonuVibe to update your
            featured courses list.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-default bg-bg-secondary">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-fg-tertiary">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Course</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Lifetime enrolls</th>
                  <th className="px-4 py-3 text-right font-medium">This month</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue (USD)</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue (JPY)</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c, i) => (
                  <tr
                    key={c.course_id}
                    className="border-b border-border-default last:border-0 hover:bg-bg-tertiary"
                  >
                    <td className="px-4 py-3 text-fg-tertiary font-mono">{i + 1}</td>
                    <td className="px-4 py-3 text-fg-primary">
                      <div>{c.title_en}</div>
                      <div className="text-xs text-fg-tertiary font-mono">{c.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          c.is_published
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-bg-tertiary text-fg-tertiary border-border-default'
                        }`}
                      >
                        {c.is_published ? 'Published' : 'Unpublished'}
                      </span>
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
