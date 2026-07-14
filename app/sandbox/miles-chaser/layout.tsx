// Spike stub — replaced with the real demo layout in Phase B Task 6.
import '@/styles/globals.css';

export const metadata = {
  title: 'MilesChaser — HonuVibe Sandbox',
  robots: { index: false, follow: true },
};

export default function MilesChaserLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="demo-miles-chaser">{children}</body>
    </html>
  );
}
