// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ send: vi.fn(), enabled: true, admin: 'admin@example.com' }));
vi.mock('@/lib/email/client', () => ({
  getResendClient: () => client.enabled ? { emails: { send: client.send } } : null,
  getAdminEmail: () => client.admin,
  getFromAddress: () => 'HonuVibe <hello@example.com>',
}));
import {
  sendContactAdminNotification, sendContactConfirmation,
  sendApplicationConfirmation, sendApplicationAdminNotification,
  sendPartnershipInquiryConfirmation, sendPartnershipInquiryAdminNotification,
  sendStudioLeadConfirmation, sendStudioLeadAdminNotification,
  sendHonuHubContactConfirmation, sendHonuHubContactAdminNotification,
  sendExplorationInquiryConfirmation, sendExplorationInquiryAdminNotification,
  sendConfirmationEmail, sendMagicLoginEmail, sendPasswordResetEmail,
} from '@/lib/email/send';

const data = { locale: 'en' as const, name: 'Visitor', email: 'visitor@example.com', subject: 'general' as const, message: 'Hello' };
beforeEach(() => {
  client.enabled = true;
  client.admin = 'admin@example.com';
  client.send.mockReset().mockResolvedValue({ error: null });
});

describe('required contact delivery', () => {
  it('escapes profile names in account access emails', async () => {
    const common = { email: 'visitor@example.com', fullName: '<b>Visitor</b>' };
    await sendConfirmationEmail({ ...common, confirmLink: 'https://example.com/confirm' });
    await sendMagicLoginEmail({ ...common, loginLink: 'https://example.com/login' });
    await sendPasswordResetEmail({ ...common, resetLink: 'https://example.com/reset' });
    for (const [options] of client.send.mock.calls) {
      expect(options.html).not.toContain('<b>Visitor</b>');
      expect(options.html).toContain('&lt;b&gt;Visitor&lt;/b&gt;');
    }
  });
  it('escapes visitor markup across public inquiry email families', async () => {
    const attack = '<a href="https://attacker.example">Fake payment</a>';
    const common = {
      locale: 'en' as const, email: 'visitor@example.com', name: attack, fullName: attack, message: attack,
      company: attack, website: null, engagement: null, timeline: null, budget: null, referralSource: null,
      industryLabel: null, projectTypeLabel: null, budgetLabel: null, timelineLabel: null,
      audienceSizeLabel: null, languageLabel: null, referralSourceLabel: null,
    };
    await sendApplicationConfirmation({ ...common, project: attack });
    await sendApplicationAdminNotification({ ...common, project: attack, company: attack, website: attack });
    const partnership = { ...common, organization: attack, orgTypeLabel: attack, communityDescription: attack, programDescription: attack };
    await sendPartnershipInquiryConfirmation(partnership);
    await sendPartnershipInquiryAdminNotification(partnership);
    await sendStudioLeadConfirmation({ ...common, company: attack });
    await sendStudioLeadAdminNotification({ ...common, company: attack });
    await sendHonuHubContactConfirmation({ ...common, type: 'other' });
    await sendHonuHubContactAdminNotification({ ...common, type: 'other' });
    await sendExplorationInquiryConfirmation(common);
    await sendExplorationInquiryAdminNotification(common);
    expect(client.send).toHaveBeenCalledTimes(10);
    for (const [options] of client.send.mock.calls) {
      expect(options.html).not.toContain(attack);
      expect(options.html).toContain('&lt;a href=&quot;https://attacker.example&quot;&gt;Fake payment&lt;/a&gt;');
    }
  });
  it('renders submitted markup as text in both contact emails', async () => {
    const input = { ...data, name: '<b>Visitor</b>', message: '<a href="https://example.com">Message</a>' };
    await sendContactAdminNotification(input);
    await sendContactConfirmation(input);
    for (const [options] of client.send.mock.calls) {
      expect(options.html).not.toContain('<b>Visitor</b>');
      expect(options.html).toContain('&lt;b&gt;Visitor&lt;/b&gt;');
    }
    expect(client.send.mock.calls[0][0].html).toContain('&lt;a href=&quot;https://example.com&quot;&gt;Message&lt;/a&gt;');
  });
  it('rejects when no provider is configured', async () => {
    client.enabled = false;
    await expect(sendContactAdminNotification(data)).rejects.toThrow('not configured');
  });
  it('rejects when the admin recipient is missing', async () => {
    client.admin = '';
    await expect(sendContactAdminNotification(data)).rejects.toThrow('not configured');
  });
  it('propagates a provider failure for the admin notification', async () => {
    client.send.mockResolvedValueOnce({ error: { name: 'delivery_error', message: 'Unavailable' } });
    await expect(sendContactAdminNotification(data)).rejects.toThrow('delivery failed');
  });
  it('keeps visitor confirmation best-effort', async () => {
    client.send.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(sendContactConfirmation(data)).resolves.toBeUndefined();
  });
});
