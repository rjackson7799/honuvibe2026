'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  sendStudentWelcomeEmail,
  sendStudentWelcomeAdminNotification,
} from '@/lib/email/send';
import type { Locale } from '@/lib/email/types';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Not authorized');

  return supabase;
}

export async function createNewUserAndStudent(
  email: string,
  fullName: string,
): Promise<{ userId: string }> {
  const supabase = await requireAdmin();

  // Check no existing user with this email
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    throw new Error('A user with this email already exists. Use the search flow instead.');
  }

  // Create auth user via admin client (no password — student uses recovery link)
  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      throw new Error('This email is already registered in the auth system.');
    }
    throw new Error(`Failed to create user account: ${authError.message}`);
  }

  const newUserId = authData.user.id;

  // Wait for handle_new_user() trigger to create public.users row
  let publicUser = null;
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('id', newUserId)
      .maybeSingle();
    if (data) {
      publicUser = data;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!publicUser) {
    await adminClient.auth.admin.deleteUser(newUserId);
    throw new Error('User profile was not created. Please try again.');
  }

  return { userId: newUserId };
}

export async function sendStudentWelcomeEmailAction(
  email: string,
  fullName: string,
  type: 'new' | 'existing',
  locale: Locale,
  courseTitle?: string,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  const adminClient = createAdminClient();

  try {
    // New users get recovery link to set password; existing get magic link to dashboard
    const linkType = type === 'new' ? 'recovery' : 'magiclink';
    const redirectTo =
      type === 'new'
        ? `${siteUrl}/api/auth/callback?redirect=/learn/auth/reset`
        : `${siteUrl}/api/auth/callback?redirect=/learn/dashboard`;

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: linkType,
        email,
        options: { redirectTo },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Student Email] Failed to generate link:', linkError?.message);
      return { success: false, error: linkError?.message ?? 'Failed to generate login link' };
    }

    await sendStudentWelcomeEmail({
      locale,
      fullName,
      email,
      actionLink: linkData.properties.action_link,
      type,
    });

    await sendStudentWelcomeAdminNotification({
      fullName,
      email,
      type,
      courseTitle,
      notes,
      emailSent: true,
    });

    return { success: true };
  } catch (err) {
    console.error('[Student Email] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send welcome email',
    };
  }
}
