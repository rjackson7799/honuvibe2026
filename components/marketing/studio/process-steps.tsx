const STEPS = [
  {
    num: '01',
    title: 'Discover',
    desc: 'A focused call to map your goals, audience and the wins that matter most.',
  },
  {
    num: '02',
    title: 'Design',
    desc: 'A clickable, on-brand prototype you can react to before a line ships.',
  },
  {
    num: '03',
    title: 'Build & ship',
    desc: 'We build AI-native, test on real devices, and launch — typically in two weeks.',
  },
  {
    num: '04',
    title: 'Care & grow',
    desc: 'Monthly care keeps it fast, fresh and improving with new content and features.',
  },
] as const;

export function ProcessSteps() {
  return (
    <section className="section proc-wrap" id="process">
      <div className="container">
        <div className="sec-head reveal">
          <span className="eyebrow">Process</span>
          <h2>How we build.</h2>
          <p>
            A calm, four-step rhythm. You always know what&apos;s next — and
            you&apos;re live in weeks, not quarters.
          </p>
        </div>

        <div className="proc-grid">
          {STEPS.map((s) => (
            <div className="step reveal" key={s.num}>
              <div className="num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
