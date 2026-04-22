import { InstructorNav } from './InstructorNav';

type Props = {
  children: React.ReactNode;
  displayName: string;
};

export function InstructorPortalLayout({ children, displayName }: Props) {
  return (
    <div className="flex min-h-screen">
      <InstructorNav displayName={displayName} />
      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
