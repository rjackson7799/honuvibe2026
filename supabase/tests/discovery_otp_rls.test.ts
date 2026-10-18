import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { anonClient, serviceClient } from './helpers/clients';

let leadId: string;
const service = serviceClient();
beforeEach(async () => {
  leadId = randomUUID();
  const { error } = await service.from('leads').insert({ id: leadId, name: 'OTP fixture', email: 'otp@example.test', business_name: 'Fixture' });
  if (error) throw error;
});
afterEach(async () => {
  const { error } = await service.from('leads').delete().eq('id', leadId);
  if (error) throw error;
});
async function issue() {
  const { data, error } = await service.rpc('issue_discovery_email_otp', { p_lead_id: leadId, p_code_hash: 'correct-hash' });
  expect(error).toBeNull();
  return data;
}
async function verify(hash = 'correct-hash') {
  const { data, error } = await service.rpc('verify_discovery_email_otp', { p_lead_id: leadId, p_code_hash: hash });
  expect(error).toBeNull();
  return data;
}

test('correct code is single use under concurrent verification', async () => {
  expect(await issue()).toBeTruthy();
  const results = await Promise.all([verify(), verify()]);
  expect(results.filter(Boolean)).toHaveLength(1);
  const { data } = await service.from('leads').select('email_verified, lifecycle').eq('id', leadId).single();
  expect(data).toEqual({ email_verified: true, lifecycle: 'verified' });
});
test('five failed guesses exhaust the challenge without verifying the lead', async () => {
  await issue();
  for (let i = 0; i < 5; i++) expect(await verify('wrong-hash')).toBe(false);
  expect(await verify()).toBe(false);
  const { data } = await service.from('leads').select('email_verified').eq('id', leadId).single();
  expect(data?.email_verified).toBe(false);
});
test('expired codes are rejected', async () => {
  const id = await issue();
  const { error } = await service.from('email_otps').update({ expires_at: '2000-01-01T00:00:00Z' }).eq('id', id);
  expect(error).toBeNull();
  expect(await verify()).toBe(false);
});
test('a null hash is rejected even from a trusted caller', async () => {
  await issue();
  const { data, error } = await service.rpc('verify_discovery_email_otp', { p_lead_id: leadId, p_code_hash: null });
  expect(error).toBeNull();
  expect(data).toBe(false);
});
test('issuance enforces cooldown and a three-per-hour limit', async () => {
  expect(await issue()).toBeTruthy();
  expect(await issue()).toBeNull();
  for (let i = 0; i < 2; i++) {
    const { error } = await service.from('email_otps').update({ created_at: new Date(Date.now() - 120_000).toISOString() }).eq('lead_id', leadId);
    expect(error).toBeNull();
    expect(await issue()).toBeTruthy();
  }
  const { error } = await service.from('email_otps').update({ created_at: new Date(Date.now() - 120_000).toISOString() }).eq('lead_id', leadId);
  expect(error).toBeNull();
  expect(await issue()).toBeNull();
});
test('anonymous callers cannot issue or verify directly', async () => {
  for (const name of ['issue_discovery_email_otp', 'verify_discovery_email_otp']) {
    const { error } = await anonClient().rpc(name, { p_lead_id: leadId, p_code_hash: 'anything' });
    // Assert a privilege failure, not just any error: an exposed issue function
    // would also error ('Lead not found') because RLS hides the lead from anon.
    expect(error?.code).toBe('42501');
  }
});
