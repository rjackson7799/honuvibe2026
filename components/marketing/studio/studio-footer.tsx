import Link from 'next/link';
import { StudioLockup } from './studio-lockup';

export function StudioFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <StudioLockup tone="dark" />
            <p>
              AI-native websites and systems for small businesses that want to
              grow without growing a team.
            </p>
          </div>
          <div className="foot-col">
            <h4>Studio</h4>
            <Link href="/work">Work</Link>
            <Link href="/services">Services</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/#process">Process</Link>
          </div>
          <div className="foot-col">
            <h4>Industries</h4>
            <Link href="/industries/creator">Creators</Link>
            <Link href="/#industries">Healthcare</Link>
            <Link href="/#industries">Service Business</Link>
            <Link href="/#industries">Professional</Link>
          </div>
          <div className="foot-col">
            <h4>Connect</h4>
            <Link href="/contact">Start a Project</Link>
            <a href="https://honuvibe.ai">HonuVibe.AI</a>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div className="foot-bottom">
          <span className="aloha">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z" />
            </svg>
            Made in Hawaii with Aloha
          </span>
          <span className="legal">© 2026 HonuVibe Studio · studio.honuvibe.ai</span>
        </div>
      </div>
    </footer>
  );
}
