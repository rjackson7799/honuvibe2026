import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type AdminGuardProps = {
  children: React.ReactNode;
  locale: string;
};

export async function AdminGuard({ children, locale }: AdminGuardProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/auth`);
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    const prefix = locale === 'ja' ? '/ja' : '';
    redirect(`${prefix}/learn/dashboard`);
  }

  return <>{children}</>;
}
