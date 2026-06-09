export function IndustriesStrip() {
  return (
    <section className="section" id="industries">
      <div className="container">
        <div className="sec-head reveal">
          <span className="eyebrow">Industries</span>
          <h2>Built for the businesses we know best.</h2>
          <p>
            Deep playbooks for a handful of fields — so you get a partner who
            already speaks your language.
          </p>
        </div>

        <div className="ind-grid">
          <div className="ind feature reveal">
            <div>
              <span className="tag-feat">Featured focus</span>
              <div className="ic" style={{ marginTop: 14 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </div>
            </div>
            <div>
              <h3>Creators</h3>
              <p>Archives, drops, memberships and storefronts that turn an audience into a business.</p>
            </div>
          </div>

          <div className="ind reveal">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z" />
              </svg>
            </div>
            <h3>Healthcare</h3>
            <p>Intake, booking and patient comms — calm, compliant, automated.</p>
          </div>

          <div className="ind reveal">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5" />
              </svg>
            </div>
            <h3>Service Business</h3>
            <p>Quotes, scheduling and reviews that fill the calendar while you work.</p>
          </div>

          <div className="ind reveal">
            <div className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3>Professional</h3>
            <p>Trust-building sites for firms, consultants and advisors.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
