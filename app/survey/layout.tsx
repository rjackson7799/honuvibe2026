import { dmSans, dmSerif, jetbrainsMono, notoSansJP } from '@/app/fonts';
import { ThemeProvider } from '@/components/providers/theme-provider';
import '@/styles/globals.css';

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmSerif.variable} ${jetbrainsMono.variable} ${notoSansJP.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
