import { AdminNav } from './AdminNav';

type AdminLayoutProps = {
  children: React.ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="learn-zone flex min-h-screen bg-bg-primary text-fg-primary">
      <AdminNav />
      {/* overflow-x-clip (not -hidden): hidden would make <main> the sticky
          containing scroller and silently disable position:sticky for page
          headers/navs inside it; clip clips without creating a scroller. */}
      <main className="flex-1 px-5 sm:px-7 md:px-8 py-7 pb-24 md:pb-8 overflow-x-clip relative z-0">
        {children}
      </main>
    </div>
  );
}
