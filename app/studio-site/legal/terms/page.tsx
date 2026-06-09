import type { Metadata } from 'next';
import { PageHead } from '@/components/marketing/studio/page-head';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms that govern your use of the HonuVibe Studio website.',
};

export default function TermsPage() {
  return (
    <>
      <PageHead crumb="Legal / Terms" title="Terms" />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <p className="muted" style={{ marginBottom: 20 }}>
            This website is provided by HonuVibe Studio for information about our
            services. Content here is a description of those services, not a binding
            offer. Project scope, pricing, and terms are confirmed in a written
            proposal before any engagement begins.
          </p>
          <p className="muted" style={{ marginBottom: 20 }}>
            Care plans, build pricing, and minimum commitments are summarised on the
            Pricing page and finalised in your proposal. We reply to project
            inquiries within one business day.
          </p>
          <p className="muted">
            Questions about these terms? Email{' '}
            <a href="mailto:hello@honuvibe.ai" style={{ color: 'var(--teal-deep)' }}>
              hello@honuvibe.ai
            </a>
            . Full terms will be published ahead of public launch.
          </p>
        </div>
      </section>
    </>
  );
}
