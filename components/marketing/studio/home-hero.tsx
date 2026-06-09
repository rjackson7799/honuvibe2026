import Link from 'next/link';
import { ArrowRight, Check, Clock } from './studio-icons';

export function HomeHero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-copy reveal">
            <span className="eyebrow">The production lab from HonuVibe.AI</span>
            <h1>
              Grow without
              <br />
              growing <em>a team.</em>
            </h1>
            <p className="sub">
              HonuVibe Studio builds AI-native websites and systems for small
              businesses — the production lab run by the people teaching AI. We
              don&apos;t just talk about it. We ship it.
            </p>
            <div className="cta-row">
              <Link href="/contact" className="btn btn-coral btn-lg">
                Start a Project
              </Link>
              <Link href="/work" className="btn btn-ghost btn-lg">
                View our work
                <ArrowRight />
              </Link>
            </div>
            <div className="trust">
              <span className="item">
                <Check /> <b>30+</b> sites shipped
              </span>
              <span className="dot" />
              <span className="item">
                <Clock /> <b>1</b>-business-day reply
              </span>
              <span className="dot" />
              <span className="item">Made in Hawaii 🌺</span>
            </div>
          </div>

          <div className="hero-art reveal">
            <div className="proof-card">
              <div className="proof-head">
                <span className="tag">Live build · Creator</span>
                <span className="browser-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
              <div className="preview">
                <div className="pv-nav">
                  <span className="first" />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="pv-body">
                  <div className="pv-h" />
                  <div className="pv-h s" />
                  <div className="pv-cta" />
                  <div className="pv-cards">
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
              </div>
            </div>
            <div className="proof-stat a">
              <div className="n">
                <em>3.4×</em>
              </div>
              <div className="l">more inbound leads</div>
            </div>
            <div className="proof-stat b">
              <div className="n">2 wks</div>
              <div className="l">concept → live</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
