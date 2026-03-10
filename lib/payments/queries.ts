import { createClient } from '@/lib/supabase/server';
import type { Payment } from './types';

export async function getUserPayments(userId: string): Promise<Payment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
