import type { Metadata } from 'next';
import { PageHead } from '@/components/marketing/studio/page-head';
import { StartProjectForm } from '@/components/marketing/studio/start-project-form';

export const metadata: Metadata = {
  title: 'Start a Project',
  description:
    'Tell HonuVibe Studio about your project. We reply within one business day with a plan, a tier recommendation, and a timeline.',
};

const calUrl = process.env.NEXT_PUBLIC_CAL_URL || 'https://cal.com/honuvibe/discovery';

const NEXT_STEPS = [
  {
    t: 'You hear back within 1 business day',
    d: 'A real reply from the team — not an autoresponder thread.',
  },
  {
    t: 'A short discovery call',
    d: 'We map your goals and the wins that matter, and recommend a tier.',
  },
  {
    t: 'A proposal within 5 days',
    d: 'Scope, timeline, and a fixed price — ready to start when you are.',
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHead
        crumb="Start a Project"
        title={
          <>
            Let&apos;s build <em>something.</em>
          </>
        }
        lede="Tell us where you want to grow. The more you share, the sharper our first reply."
      />

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <div className="contact-grid">
            <div>
              <StartProjectForm />
            </div>

            <aside>
              <div className="next-card">
                <span className="eyebrow">What happens next</span>
                <h3 style={{ marginTop: 14 }}>From inquiry to proposal.</h3>
                <ul className="next-list">
                  {NEXT_STEPS.map((s, i) => (
                    <li key={s.t}>
                      <span className="n">{i + 1}</span>
                      <div>
                        <div className="nt">{s.t}</div>
                        <div className="nd">{s.d}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <a
                  href={calUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ width: '100%', marginTop: 26 }}
                >
                  Or book a discovery call
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
