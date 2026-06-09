import Link from 'next/link';
import { Clock } from './studio-icons';

export function CtaBand() {
  return (
    <section className="section cta-band">
      <div className="container">
        <div className="cta-inner reveal">
          <span className="eyebrow on-dark" style={{ justifyContent: 'center' }}>
            Let&apos;s build
          </span>
          <h2 style={{ marginTop: 18 }}>
            Start a project, <em>not</em> a hiring spree.
          </h2>
          <p>
            Tell us where you want to grow. We&apos;ll send back a clear plan, a
            tier recommendation, and a timeline — usually within one business day.
          </p>
          <div className="cta-row">
            <Link href="/contact" className="btn btn-coral btn-lg">
              Start a Project
            </Link>
            <Link href="/work" className="btn btn-ghost-dark btn-lg">
              See the work
            </Link>
          </div>
          <span className="promise">
            <Clock />
            We reply within one business day. Always.
          </span>
        </div>
      </div>
    </section>
  );
}
