const FAQS = [
  {
    q: 'Do I own my website and the code?',
    a: "Yes. Once your build is paid in full, the site and its code are yours. A care plan covers hosting and upkeep — it's not a lease, you're never locked in, and we'll help you move everything if you ever decide to leave.",
  },
  {
    q: 'What does “AI-native” actually mean?',
    a: "It means AI is built into how your site works, not bolted on after. Depending on your tier that's an assistant that answers visitor questions, content that refreshes itself, or workflows that quietly handle bookings, leads, and follow-up for you.",
  },
  {
    q: 'What happens after my site launches?',
    a: 'Your monthly care plan keeps it hosted, monitored, secure, and improving. We handle updates and fixes and roll out fresh content and small features over time, so the site keeps earning its keep instead of going stale.',
  },
  {
    q: 'Do I need to be technical, or write all the copy myself?',
    a: 'Neither. We guide every step, and copywriting and imagery are available as add-ons. Most clients just bring their goals and a few examples they like — we handle the build, the words, and the visuals.',
  },
  {
    q: 'How much of my time will this take?',
    a: "Less than you'd expect. After a focused kickoff call we do the heavy lifting and bring you a clickable prototype to react to. Plan on a couple of short review rounds — most projects go from concept to live in about two weeks.",
  },
  {
    q: 'Can I start small and upgrade later?',
    a: 'Absolutely. Plenty of clients launch on Starter or Pro and move up as they grow. Your site is built to scale, so upgrading adds capability without starting over.',
  },
  {
    q: 'What if I need to cancel or change direction?',
    a: 'Care plans run a 6-month minimum (12 for AI-Native), then go month-to-month. Scope and price are locked in a written proposal before we start, so there are no surprises and any changes are agreed up front.',
  },
] as const;

export function StudioFAQ() {
  return (
    <section className="section faq-wrap">
      <div className="container">
        <div className="faq-grid">
          <div className="faq-aside sec-head reveal">
            <span className="eyebrow">FAQ</span>
            <h2>The questions we hear most.</h2>
            <p className="contact-line">
              Can&apos;t find yours? Email{' '}
              <a href="mailto:hello@honuvibe.ai">hello@honuvibe.ai</a> — we reply within a
              business day.
            </p>
          </div>
          <dl className="faq-list reveal">
            {FAQS.map(({ q, a }) => (
              <div className="faq-item" key={q}>
                <dt className="faq-q">{q}</dt>
                <dd className="faq-a">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
