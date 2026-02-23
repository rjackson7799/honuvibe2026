import { AdminNav } from './AdminNav';

type AdminLayoutProps = {
  children: React.ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}
