import { StudentNav } from './StudentNav';

type StudentDashboardLayoutProps = {
  children: React.ReactNode;
};

export function StudentDashboardLayout({ children }: StudentDashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <StudentNav />
      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
