import type { Metadata } from 'next';
import { PageHead } from '@/components/marketing/studio/page-head';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How HonuVibe Studio collects and uses the information you share.',
};

export default function PrivacyPage() {
  return (
    <>
      <PageHead crumb="Legal / Privacy" title="Privacy" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <p className="muted" style={{ marginBottom: 20 }}>
            HonuVibe Studio is the production arm of HonuVibe.AI. When you submit a
            project inquiry, we collect the details you provide (such as your name,
            email, company, and project description) solely to respond to your
            request and scope potential work.
          </p>
          <p className="muted" style={{ marginBottom: 20 }}>
            We do not sell your information. We use trusted processors — including
            Supabase for storage and Resend for email — to handle inquiries. We
            retain inquiries only as long as needed to follow up and keep our
            records.
          </p>
          <p className="muted">
            To request access to or deletion of your information, email{' '}
            <a href="mailto:hello@honuvibe.ai" style={{ color: 'var(--teal-deep)' }}>
              hello@honuvibe.ai
            </a>
            . This page will be expanded with full APPI/GDPR detail ahead of public
            launch.
          </p>
        </div>
      </section>
    </>
  );
}
