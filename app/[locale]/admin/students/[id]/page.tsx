import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getStudentDetail } from '@/lib/admin/queries';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { DeleteStudentButton } from '@/components/admin/DeleteStudentButton';
import { ResendConfirmationButton } from '@/components/admin/ResendConfirmationButton';
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
        className="inline-flex items-center gap-1 text-sm font-medium text-fg-tertiary hover:text-fg-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Students
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
            {student.full_name || 'Unknown Student'}
          </h1>
          <p className="text-sm text-fg-tertiary mt-1">{student.email}</p>
        </div>
        {student.role === 'student' && (
          <DeleteStudentButton
            studentId={student.id}
            studentName={student.full_name || student.email || 'Unknown'}
          />
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="bg-bg-secondary border border-border-default rounded-[14px] p-4 shadow-[var(--shadow-md)]">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-fg-tertiary block mb-1">
            Email Status
          </span>
          <span
            className={`text-sm font-semibold ${
              student.email_confirmed_at
                ? 'text-[color:var(--accent-teal)]'
                : 'text-[color:var(--accent-coral)]'
            }`}
          >
            {student.email_confirmed_at ? 'Confirmed' : 'Pending Confirmation'}
          </span>
        </div>
      </div>

      {/* Resend confirmation (only for unconfirmed users) */}
      {!student.email_confirmed_at && student.email && (
        <ResendConfirmationButton
          studentId={student.id}
          email={student.email}
          fullName={student.full_name}
        />
      )}

      {/* Enrollments */}
      <div>
        <h2 className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-fg-tertiary mb-3">
          Enrollments ({student.enrollments.length})
        </h2>
        {student.enrollments.length === 0 ? (
          <div className="py-8 px-4 rounded-[14px] border border-dashed border-border-default bg-bg-tertiary text-center">
            <p className="text-sm text-fg-tertiary">No enrollments.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {student.enrollments.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-4 bg-bg-secondary border border-border-default rounded-[14px] p-4 shadow-[var(--shadow-md)]"
              >
                <div className="min-w-0">
                  <span className="text-[14px] font-semibold text-fg-primary">
                    {e.course_title}
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-[12px] text-fg-tertiary">
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
                        <span className="font-semibold text-fg-secondary">
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
    <div className="bg-bg-secondary border border-border-default rounded-[14px] p-4 shadow-[var(--shadow-md)]">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-fg-tertiary block mb-1">
        {label}
      </span>
      <span className={`text-sm text-fg-primary capitalize font-semibold ${mono ? 'font-mono text-xs normal-case' : ''}`}>
        {value}
      </span>
    </div>
  );
}
