'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  sendInstructorApplicationReceived,
  sendInstructorApplicationAdminNotification,
  sendInstructorApplicationRejected,
  sendInstructorWelcomeEmail,
  sendInstructorWelcomeAdminNotification,
} from '@/lib/email/send';
import { resolvePartnerIdBySlug } from '@/lib/partner-attribution';
import type {
  InstructorApplication,
  InstructorApplicationSubmitInput,
  InstructorApplicationWithPartner,
} from './types';

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

// ─── Public submit (service-role, no auth required) ─────────

export async function submitInstructorApplication(
  input: InstructorApplicationSubmitInput,
): Promise<{ id: string }> {
  const admin = createAdminClient();

  // Resolve partner slug -> id (cookie or explicit)
  const partnerId = await resolvePartnerIdBySlug(admin, input.partner_slug);

  // If there's a logged-in user with this email, link it
  const {
    data: existingUser,
  } = await admin.from('users').select('id').eq('email', input.applicant_email).maybeSingle();

  const { data: inserted, error } = await admin
    .from('instructor_applications')
    .insert({
      applicant_user_id: existingUser?.id ?? null,
      applicant_email: input.applicant_email.toLowerCase().trim(),
      applicant_full_name: input.applicant_full_name.trim(),
      applicant_locale: input.applicant_locale,
      referred_by_partner_id: partnerId,
      bio_short: input.bio_short.trim(),
      expertise_areas: input.expertise_areas.length > 0 ? input.expertise_areas : null,
      proposed_topic: input.proposed_topic.trim() || null,
      sample_material_url: input.sample_material_url?.trim() || null,
      linkedin_url: input.linkedin_url?.trim() || null,
      website_url: input.website_url?.trim() || null,
      why_honuvibe: input.why_honuvibe?.trim() || null,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    throw new Error(`Failed to submit application: ${error?.message ?? 'unknown error'}`);
  }

  // Partner name for admin notification (best-effort)
  let partnerName: string | null = null;
  if (partnerId) {
    const { data: partner } = await admin
      .from('partners')
      .select('name_en')
      .eq('id', partnerId)
      .maybeSingle();
    partnerName = partner?.name_en ?? null;
  }

  // Fire-and-forget emails
  void Promise.all([
    sendInstructorApplicationReceived({
      locale: input.applicant_locale,
      applicantName: input.applicant_full_name,
      applicantEmail: input.applicant_email,
    }),
    sendInstructorApplicationAdminNotification({
      applicantName: input.applicant_full_name,
      applicantEmail: input.applicant_email,
      bioShort: input.bio_short,
      proposedTopic: input.proposed_topic || null,
      expertiseAreas: input.expertise_areas,
      sampleMaterialUrl: input.sample_material_url || null,
      linkedinUrl: input.linkedin_url || null,
      websiteUrl: input.website_url || null,
      whyHonuvibe: input.why_honuvibe || null,
      referredByPartnerName: partnerName,
      applicationId: inserted.id,
    }),
  ]);

  return { id: inserted.id };
}

// ─── Admin queries ──────────────────────────────────────────

export async function getInstructorApplications(): Promise<InstructorApplicationWithPartner[]> {
  const supabase = await requireAdmin();

  const { data, error } = await supabase
    .from('instructor_applications')
    .select('*, partner:partners(name_en, slug)')
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(`Failed to load applications: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const { partner, ...rest } = row as Record<string, unknown> & {
      partner?: { name_en?: string | null; slug?: string | null } | null;
    };
    return {
      ...(rest as unknown as InstructorApplication),
      partner_name: partner?.name_en ?? null,
      partner_slug: partner?.slug ?? null,
    };
  });
}

export async function getInstructorApplicationById(
  id: string,
): Promise<InstructorApplicationWithPartner | null> {
  const supabase = await requireAdmin();

  const { data, error } = await supabase
    .from('instructor_applications')
    .select('*, partner:partners(name_en, slug)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load application: ${error.message}`);
  if (!data) return null;

  const { partner, ...rest } = data as Record<string, unknown> & {
    partner?: { name_en?: string | null; slug?: string | null } | null;
  };

  return {
    ...(rest as unknown as InstructorApplication),
    partner_name: partner?.name_en ?? null,
    partner_slug: partner?.slug ?? null,
  };
}

// ─── Admin actions ──────────────────────────────────────────

export async function approveInstructorApplication(
  applicationId: string,
  opts: {
    displayName: string;
    titleEn: string | null;
    titleJp: string | null;
    bioShortEn: string | null;
    bioShortJp: string | null;
    reviewNotes?: string;
  },
): Promise<{ instructorProfileId: string }> {
  const supabase = await requireAdmin();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  if (!adminUser) throw new Error('Not authenticated');

  const app = await getInstructorApplicationById(applicationId);
  if (!app) throw new Error('Application not found');
  if (app.status !== 'pending') {
    throw new Error(`Application already ${app.status}`);
  }

  const adminClient = createAdminClient();

  // Find or create the user record
  let userId = app.applicant_user_id;

  if (!userId) {
    // Check by email
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, role')
      .eq('email', app.applicant_email)
      .maybeSingle();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create a new auth user (instructor will get a password-reset link via welcome email)
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: app.applicant_email,
        email_confirm: true,
        user_metadata: { full_name: app.applicant_full_name },
      });

      if (authError || !authData.user) {
        throw new Error(`Failed to create auth user: ${authError?.message ?? 'unknown'}`);
      }

      userId = authData.user.id;

      // Wait for handle_new_user() trigger to create public.users row
      let publicUser: { id: string } | null = null;
      for (let i = 0; i < 3; i++) {
        const { data } = await adminClient
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (data) {
          publicUser = data;
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!publicUser) {
        await adminClient.auth.admin.deleteUser(userId);
        throw new Error('User profile not created after auth user — please retry');
      }
    }
  }

  // Check user isn't already an instructor / admin
  const { data: targetUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (!targetUser) throw new Error('User not found after creation');
  if (targetUser.role === 'admin') {
    throw new Error('Applicant is an admin — cannot demote to instructor');
  }

  // Create the instructor profile (skip if already instructor)
  let instructorProfileId: string;
  if (targetUser.role === 'instructor') {
    const { data: existingProfile } = await adminClient
      .from('instructor_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!existingProfile) {
      throw new Error('User is marked as instructor but has no instructor_profile — data inconsistency');
    }
    instructorProfileId = existingProfile.id;
  } else {
    const { data: profile, error: profileError } = await adminClient
      .from('instructor_profiles')
      .insert({
        user_id: userId,
        display_name: opts.displayName,
        title_en: opts.titleEn,
        title_jp: opts.titleJp,
        bio_short_en: opts.bioShortEn,
        bio_short_jp: opts.bioShortJp,
      })
      .select('id')
      .single();

    if (profileError || !profile) {
      throw new Error(`Failed to create instructor profile: ${profileError?.message}`);
    }

    instructorProfileId = profile.id;

    // Promote user role
    const { error: roleError } = await adminClient
      .from('users')
      .update({ role: 'instructor', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (roleError) {
      await adminClient.from('instructor_profiles').delete().eq('id', instructorProfileId);
      throw new Error(`Failed to promote to instructor: ${roleError.message}`);
    }
  }

  // Stamp the application
  const { error: updateError } = await adminClient
    .from('instructor_applications')
    .update({
      status: 'approved',
      reviewed_by_user_id: adminUser.id,
      reviewed_at: new Date().toISOString(),
      review_notes: opts.reviewNotes ?? null,
      created_instructor_profile_id: instructorProfileId,
    })
    .eq('id', applicationId);

  if (updateError) {
    throw new Error(`Application approved but stamping failed: ${updateError.message}`);
  }

  // Send welcome email via instructor welcome flow (magic link / recovery link)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  const redirectTo = `${siteUrl}/api/auth/callback?redirect=/learn/auth/reset`;

  try {
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: app.applicant_email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Instructor Apply Approve] Failed to generate login link:', linkError?.message);
    } else {
      await sendInstructorWelcomeEmail({
        locale: app.applicant_locale,
        displayName: opts.displayName,
        email: app.applicant_email,
        titleEn: opts.titleEn,
        titleJp: opts.titleJp,
        actionLink: linkData.properties.action_link,
        type: 'new',
      });

      await sendInstructorWelcomeAdminNotification({
        displayName: opts.displayName,
        email: app.applicant_email,
        type: 'new',
        emailSent: true,
      });
    }
  } catch (err) {
    console.error('[Instructor Apply Approve] Welcome email error:', err);
  }

  revalidatePath('/admin/instructor-applications');
  revalidatePath(`/admin/instructor-applications/${applicationId}`);
  revalidatePath('/admin/instructors');

  return { instructorProfileId };
}

export async function rejectInstructorApplication(
  applicationId: string,
  opts: { rejectionReason: string; reviewNotes?: string },
): Promise<void> {
  const supabase = await requireAdmin();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();
  if (!adminUser) throw new Error('Not authenticated');

  const app = await getInstructorApplicationById(applicationId);
  if (!app) throw new Error('Application not found');
  if (app.status !== 'pending') throw new Error(`Application already ${app.status}`);

  const { error } = await supabase
    .from('instructor_applications')
    .update({
      status: 'rejected',
      reviewed_by_user_id: adminUser.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: opts.rejectionReason,
      review_notes: opts.reviewNotes ?? null,
    })
    .eq('id', applicationId);

  if (error) throw new Error(`Failed to reject application: ${error.message}`);

  await sendInstructorApplicationRejected({
    locale: app.applicant_locale,
    applicantName: app.applicant_full_name,
    applicantEmail: app.applicant_email,
    rejectionReason: opts.rejectionReason,
  });

  revalidatePath('/admin/instructor-applications');
  revalidatePath(`/admin/instructor-applications/${applicationId}`);
}

export async function saveInstructorApplicationNotes(
  applicationId: string,
  reviewNotes: string,
): Promise<void> {
  const supabase = await requireAdmin();

  const { error } = await supabase
    .from('instructor_applications')
    .update({ review_notes: reviewNotes })
    .eq('id', applicationId);

  if (error) throw new Error(`Failed to save notes: ${error.message}`);

  revalidatePath(`/admin/instructor-applications/${applicationId}`);
}
