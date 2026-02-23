import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type AuthGuardProps = {
  children: React.ReactNode;
  locale: string;
};

export async function AuthGuard({ children, locale }: AuthGuardProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/auth`);
  }

  return <>{children}</>;
}
