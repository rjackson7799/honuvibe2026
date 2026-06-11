// AI-Native intake routes here instead of the templated 15-question flow —
// custom builds need a human scoping conversation, not a deterministic quote.
// Cal.com booking + an admin notification ship in the AI-Native increment; for
// now this is a calm hand-off screen. The lead row already exists (from /start).

export function CustomScopingStub() {
  return (
    <div className="dsc-center">
      <p className="dsc-stepmark">Studio AI-Native</p>
      <h1 className="dsc-q__head">Let&rsquo;s scope this together.</h1>
      <p className="dsc-q__sub">
        AI-Native builds are custom — bespoke AI agents, workflows, and integrations that don&rsquo;t
        fit a templated quote. We&rsquo;d rather understand your operation properly than guess at a
        number.
      </p>
      <div className="dsc-card" style={{ marginTop: 8 }}>
        <p className="dsc-card__title">What happens next</p>
        <p style={{ margin: 0, color: 'var(--ink-2)' }}>
          We&rsquo;ve saved your details. Ryan will reach out within one business day to set up a
          short scoping call and map out a plan.
        </p>
        <p className="dsc-pending" style={{ marginTop: 14 }}>
          <span aria-hidden>📅</span> Instant call booking is coming soon.
        </p>
      </div>
      <p className="dsc-confidential">
        Prepared by HonuVibe.ai · Built in Hawaii 🌺
      </p>
    </div>
  );
}
