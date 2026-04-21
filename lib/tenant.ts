import { headers } from 'next/headers';
import { resolveHost, type SubdomainEntry, type TenantId } from './subdomain-config';

export async function getSubdomainEntry(): Promise<SubdomainEntry> {
  const host = (await headers()).get('host');
  return resolveHost(host);
}

export async function getTenant(): Promise<TenantId> {
  return (await getSubdomainEntry()).tenant;
}
