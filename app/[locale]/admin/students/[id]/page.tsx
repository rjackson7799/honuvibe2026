import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getStudentDetail } from '@/lib/admin/queries';
import { StatusBadge } from '@/components/admin/StatusBadge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const student = await getStudentDetail(id);
  return { title: student ? `${student.full_name ?? 'Student'} — Admin` : 'Student Not Found' };
}

export default async function AdminStudentDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const student = await getStudentDetail(id);
  if (!student) notFound();

  return (
    <div className="space-y-6 max-w-[800px]">
      {/* Back link */}
      <Link
        href="/admin/students"
        className="flex items-center gap-1 text-sm text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Students
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif text-fg-primary">
          {student.full_name || 'Unknown Student'}
        </h1>
        <p className="text-sm text-fg-tertiary">{student.email}</p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoField label="User ID" value={student.id} mono />
        <InfoField label="Role" value={student.role} />
        <InfoField
          label="Joined"
          value={new Date(student.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        />
        <InfoField label="Subscription" value={student.subscription_tier} />
      </div>

      {/* Enrollments */}
      <div>
        <h2 className="text-sm font-semibold text-fg-primary uppercase tracking-wider mb-3">
          Enrollments ({student.enrollments.length})
        </h2>
        {student.enrollments.length === 0 ? (
          <p className="text-sm text-fg-tertiary">No enrollments.</p>
        ) : (
          <div className="space-y-2">
            {student.enrollments.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between bg-bg-secondary border border-border-default rounded-lg p-4"
              >
                <div>
                  <span className="text-sm font-medium text-fg-primary">
                    {e.course_title}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-xs text-fg-tertiary">
                    <span>
                      {new Date(e.enrolled_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {e.amount_paid !== null && (
                      <>
                        <span>·</span>
                        <span>
                          {e.currency === 'jpy'
                            ? `¥${e.amount_paid.toLocaleString()}`
                            : `$${(e.amount_paid / 100).toFixed(2)}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-3">
      <span className="text-xs text-fg-tertiary block mb-0.5">{label}</span>
      <span className={`text-sm text-fg-primary capitalize ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}
