// Calm "analysis" beat shown while the flow hydrates. In a later increment this
// is where the lean scrape + Claude context synthesis run; for now it's the
// hydrate/resume wait, kept calm rather than instant.
export function AnalysisLoader() {
  return (
    <div className="dsc-loader">
      <div className="dsc-loader__spinner" aria-hidden />
      <p className="dsc-loader__text">Taking a look at what you&rsquo;ve got…</p>
    </div>
  );
}
