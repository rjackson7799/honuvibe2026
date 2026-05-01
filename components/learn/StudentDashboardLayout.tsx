import { StudentNav } from './StudentNav';

type StudentDashboardLayoutProps = {
  children: React.ReactNode;
};

export function StudentDashboardLayout({ children }: StudentDashboardLayoutProps) {
  return (
    <div className="learn-zone flex min-h-screen bg-bg-primary text-fg-primary">
      <StudentNav />
      <main className="flex-1 px-5 sm:px-7 md:px-8 py-7 pb-24 md:pb-8 overflow-x-hidden relative z-0">
        {children}
      </main>
    </div>
  );
}
