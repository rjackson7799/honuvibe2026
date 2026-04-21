export type TenantId = 'honuvibe' | (string & {});

export type SubdomainEntry = {
  prefix: string | null;
  tenant: TenantId;
};

function buildEntries(): Record<string, SubdomainEntry> {
  const primary = process.env.NEXT_PUBLIC_PRIMARY_HOST ?? 'honuvibe.com';
  const learn = process.env.NEXT_PUBLIC_LEARN_HOST ?? 'learn.honuvibe.com';

  return {
    [primary.toLowerCase()]: { prefix: null, tenant: 'honuvibe' },
    [learn.toLowerCase()]: { prefix: '/learn', tenant: 'honuvibe' },
  };
}

const entries = buildEntries();

export function resolveHost(host: string | null | undefined): SubdomainEntry {
  const normalized = (host ?? '').toLowerCase().split(':')[0];
  if (normalized && entries[normalized]) return entries[normalized];

  const withPort = (host ?? '').toLowerCase();
  if (withPort && entries[withPort]) return entries[withPort];

  const primary = (process.env.NEXT_PUBLIC_PRIMARY_HOST ?? 'honuvibe.com').toLowerCase();
  return entries[primary] ?? { prefix: null, tenant: 'honuvibe' };
}

export function listConfiguredHosts(): string[] {
  return Object.keys(entries);
}
