import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getPartnershipInquiries } from './queries';

function buildPartnershipInquiryClientMock({
  data = [],
  error = null,
}: {
  data?: unknown[];
  error?: { code?: string; message?: string } | null;
}) {
  const chain: Record<string, unknown> = {
    data,
    error,
  };

  for (const method of ['select', 'order', 'eq']) {
    chain[method] = vi.fn(() => chain);
  }

  return {
    chain,
    client: {
      from: vi.fn(() => chain),
    },
  };
}

describe('getPartnershipInquiries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns an empty inbox when the partnership_inquiries table is missing', async () => {
    const { client } = buildPartnershipInquiryClientMock({
      error: {
        code: 'PGRST205',
        message:
          "Could not find the table 'public.partnership_inquiries' in the schema cache",
      },
    });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await expect(getPartnershipInquiries()).resolves.toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('partnership_inquiries table is missing'),
    );
  });

  it('still throws unexpected Supabase errors', async () => {
    const error = { code: '42501', message: 'permission denied' };
    const { client } = buildPartnershipInquiryClientMock({ error });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await expect(getPartnershipInquiries()).rejects.toBe(error);
  });

  it('applies the optional status filter', async () => {
    const { client, chain } = buildPartnershipInquiryClientMock({ data: [] });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await getPartnershipInquiries('received');

    expect(client.from).toHaveBeenCalledWith('partnership_inquiries');
    expect(chain.eq).toHaveBeenCalledWith('status', 'received');
  });
});