import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  children: React.ReactNode;
  locale: string;
};

export async function InstructorGuard({ children, locale }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const prefix = locale === 'ja' ? '/ja' : '';

  if (!user) {
    redirect(`${prefix}/learn/auth?redirect=${prefix}/instructor/courses`);
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'instructor' && profile?.role !== 'admin') {
    redirect(`${prefix}/learn/dashboard`);
  }

  const { data: instructorProfile } = await supabase
    .from('instructor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!instructorProfile) {
    redirect(`${prefix}/learn/dashboard`);
  }

  return <>{children}</>;
}
