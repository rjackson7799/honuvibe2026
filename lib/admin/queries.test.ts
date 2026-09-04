import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getEngagements, getPartnershipInquiries, getProspects } from './queries';

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

function buildProspectsClientMock({
  data = [],
  error = null,
}: {
  data?: unknown[];
  error?: { code?: string; message?: string } | null;
}) {
  const chain: Record<string, unknown> = { data, error };
  for (const method of ['select', 'order', 'limit', 'eq', 'neq', 'or']) {
    chain[method] = vi.fn(() => chain);
  }
  return { chain, client: { from: vi.fn(() => chain) } };
}

describe('getProspects', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('excludes dismissed rows by default', async () => {
    const { client, chain } = buildProspectsClientMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await getProspects();
    expect(chain.neq).toHaveBeenCalledWith('status', 'dismissed');
    expect(chain.eq).not.toHaveBeenCalled();
    expect(chain.limit).toHaveBeenCalledWith(200);
  });

  it('an explicit status filter replaces the dismissed exclusion', async () => {
    const { client, chain } = buildProspectsClientMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await getProspects({ status: 'dismissed' });
    expect(chain.eq).toHaveBeenCalledWith('status', 'dismissed');
    expect(chain.neq).not.toHaveBeenCalled();
  });

  it('sanitizes the search to [\\w\\s-] before interpolating into .or()', async () => {
    const { client, chain } = buildProspectsClientMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    // Commas, parens, quotes, %, _ are PostgREST filter syntax — all stripped.
    await getProspects({ search: "foo,bar(baz)%_'" });
    expect(chain.or).toHaveBeenCalledWith(
      'name.ilike.%foobarbaz_%,industry.ilike.%foobarbaz_%,location.ilike.%foobarbaz_%',
    );
  });

  it('a punctuation-heavy business name still matches on its word characters', async () => {
    const { client, chain } = buildProspectsClientMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await getProspects({ search: "Bob's Plumbing & Sons!" });
    expect(chain.or).toHaveBeenCalledWith(
      'name.ilike.%Bobs Plumbing  Sons%,industry.ilike.%Bobs Plumbing  Sons%,location.ilike.%Bobs Plumbing  Sons%',
    );
  });

  it('skips .or() entirely when the sanitized search is empty', async () => {
    const { client, chain } = buildProspectsClientMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await getProspects({ search: "',()%" });
    expect(chain.or).not.toHaveBeenCalled();
  });

  it('throws on a query error (never [])', async () => {
    const error = { code: '42501', message: 'permission denied' };
    const { client } = buildProspectsClientMock({ error });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await expect(getProspects()).rejects.toBe(error);
  });
});

function buildEngagementsClientMock({
  data = [],
  error = null,
}: {
  data?: unknown[];
  error?: { code?: string; message?: string } | null;
}) {
  const chain: Record<string, unknown> = { data, error };
  for (const method of ['select', 'order', 'eq']) {
    chain[method] = vi.fn(() => chain);
  }
  return { chain, client: { from: vi.fn(() => chain) } };
}

describe('getEngagements', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reads the pre-aggregated engagement_list view, newest activity first', async () => {
    const { client, chain } = buildEngagementsClientMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await getEngagements();
    expect(client.from).toHaveBeenCalledWith('engagement_list');
    expect(chain.order).toHaveBeenCalledWith('last_activity_at', { ascending: false, nullsFirst: false });
    expect(chain.eq).not.toHaveBeenCalled();
  });

  it('applies the optional stage filter', async () => {
    const { client, chain } = buildEngagementsClientMock({});
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await getEngagements({ stage: 'build' });
    expect(chain.eq).toHaveBeenCalledWith('stage', 'build');
  });

  it('throws on a query error (never [])', async () => {
    const error = { code: '42501', message: 'permission denied' };
    const { client } = buildEngagementsClientMock({ error });
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(client);

    await expect(getEngagements()).rejects.toBe(error);
  });
});
