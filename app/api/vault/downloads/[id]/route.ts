import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireVaultAccess } from '@/lib/vault/access';

// Storage bucket holding all template/protected downloads (created in 041).
const PRIVATE_BUCKET = 'vault-private';
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Mint a signed download URL after access check, then increment the
 * download_count. Returns 403 with a paywall payload when the parent or
 * download row is premium and the caller doesn't have Vault access.
 *
 * Uses the service role for the storage SELECT because `vault_downloads`
 * RLS hides `file_url` from regular clients after migration 041.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    // 1. Fetch the download row + its parent's access tier (service role bypasses RLS).
    const { data: download, error: fetchError } = await admin
      .from('vault_downloads')
      .select('id, file_url, file_name, access_tier, download_count, content_item_id, content_items!inner(access_tier, is_published)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !download) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }

    // PostgREST returns the joined row as either an object or an array
    // depending on FK shape; normalize.
    const parentRaw = (download as unknown as { content_items: unknown }).content_items;
    const parent = (Array.isArray(parentRaw) ? parentRaw[0] : parentRaw) as
      | { access_tier: string; is_published: boolean }
      | null
      | undefined;

    if (!parent || !parent.is_published) {
      return NextResponse.json({ error: 'Download not found' }, { status: 404 });
    }

    // 2. Access check: premium iff EITHER the download or its parent is premium.
    const requiresPremium =
      download.access_tier === 'premium' || parent.access_tier === 'premium';

    if (requiresPremium) {
      const { hasAccess } = await requireVaultAccess();
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Premium access required', paywall: true },
          { status: 403 },
        );
      }
    }

    // 3. Extract the storage path from the stored file_url. We persist either
    // a full Supabase storage URL or a bucket-relative path; handle both.
    const storagePath = extractStoragePath(download.file_url);
    if (!storagePath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 500 });
    }

    // 4. Mint a signed URL via the service role.
    const { data: signed, error: signError } = await admin.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS, {
        download: download.file_name,
      });

    if (signError || !signed) {
      return NextResponse.json(
        { error: signError?.message ?? 'Failed to mint signed URL' },
        { status: 500 },
      );
    }

    // 5. Increment download_count (fire-and-forget; failure doesn't block the download).
    admin
      .from('vault_downloads')
      .update({ download_count: (download.download_count ?? 0) + 1 })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('download_count increment failed:', error);
      });

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    console.error('vault download endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Accepts either a full URL (e.g. `https://<project>.supabase.co/storage/v1/object/sign/vault-private/path/to/file.pdf`)
 * or a bucket-relative path (`path/to/file.pdf`). Returns the bucket-relative
 * path or null if the URL doesn't reference the expected bucket.
 */
function extractStoragePath(fileUrl: string | null): string | null {
  if (!fileUrl) return null;
  if (!fileUrl.includes('://')) return fileUrl; // already a relative path

  const marker = `/${PRIVATE_BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length).split('?')[0];
}
