// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProposalAcceptForm } from './ProposalAcceptForm';

// The client click-wrap: Accept is disabled until name + checkbox; the POST
// body is {accepted_by_name, accepted:true} plus the (empty) honeypot and NO
// token (the cookie authorizes); 409 → "already accepted", 410 → the expired
// band, 403 → the "open from your email again" card; the success copy says
// "recorded", never "notified" (the email is best-effort in after()).

const ID = '3f2a1c9e-0b7d-4e6a-9c1f-2d8b7a6e5f40';
const fetchMock = vi.fn();

function jsonResponse(status: number, body: Record<string, unknown>) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

function mount() {
  render(<ProposalAcceptForm proposalId={ID} locale="en" businessName="Palm Clinic" />);
  const name = screen.getByLabelText(/your name/i) as HTMLInputElement;
  const box = screen.getByRole('checkbox') as HTMLInputElement;
  const button = screen.getByRole('button', { name: /accept proposal/i }) as HTMLButtonElement;
  return { name, box, button };
}

async function fill({ name, box }: { name: HTMLInputElement; box: HTMLInputElement }) {
  fireEvent.change(name, { target: { value: 'Test Client' } });
  fireEvent.click(box);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProposalAcceptForm', () => {
  it('is disabled until both the name and the checkbox are filled; the checkbox names the business', async () => {
    const { name, box, button } = mount();
    expect(button.disabled).toBe(true);
    expect(screen.getByLabelText(/I accept this proposal on behalf of Palm Clinic/)).toBe(box);
    fireEvent.change(name, { target: { value: 'Test Client' } });
    expect(button.disabled).toBe(true);
    fireEvent.click(box);
    expect(button.disabled).toBe(false);
    fireEvent.change(name, { target: { value: '   ' } });
    expect(button.disabled).toBe(true);
  });

  it('carries the honeypot (present, empty, hidden from people) and caps the name at 200', () => {
    mount();
    const hp = document.querySelector('input[name="company_url"]') as HTMLInputElement;
    expect(hp).toBeTruthy();
    expect(hp.value).toBe('');
    expect(hp.getAttribute('tabindex')).toBe('-1');
    expect(hp.getAttribute('aria-hidden')).toBe('true');
    const name = screen.getByLabelText(/your name/i) as HTMLInputElement;
    expect(name.maxLength).toBe(200);
  });

  it('POSTs {accepted_by_name, accepted:true} to the accept route with no token, then shows the "recorded" copy', async () => {
    fetchMock.mockImplementation(() => jsonResponse(200, { ok: true, applied: true }));
    const f = mount();
    await fill(f);
    fireEvent.click(f.button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/engagement/proposal/${ID}/accept`);
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toEqual({ accepted_by_name: 'Test Client', accepted: true, company_url: '' });
    expect(JSON.stringify(body)).not.toMatch(/token/i);
    await waitFor(() => expect(screen.getByText(/your acceptance is recorded/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/notified/i);
    expect(screen.queryByRole('button', { name: /accept proposal/i })).toBeNull();
  });

  it('409 already_accepted → "already accepted"', async () => {
    fetchMock.mockImplementation(() => jsonResponse(409, { error: 'already_accepted' }));
    const f = mount();
    await fill(f);
    fireEvent.click(f.button);
    await waitFor(() => expect(screen.getByText(/already been accepted/i)).toBeTruthy());
  });

  it('410 expired → the expired band, no form', async () => {
    fetchMock.mockImplementation(() => jsonResponse(410, { error: 'expired' }));
    const f = mount();
    await fill(f);
    fireEvent.click(f.button);
    await waitFor(() => expect(screen.getByText(/this proposal has expired/i)).toBeTruthy());
    expect(screen.queryByRole('button', { name: /accept proposal/i })).toBeNull();
  });

  it('410 link_expired → the "link has expired" card (the link lapsed, not the proposal)', async () => {
    fetchMock.mockImplementation(() => jsonResponse(410, { error: 'link_expired' }));
    const f = mount();
    await fill(f);
    fireEvent.click(f.button);
    await waitFor(() => expect(screen.getByText(/this link has expired/i)).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/this proposal has expired/i);
    expect(screen.queryByRole('button', { name: /accept proposal/i })).toBeNull();
  });

  it('403 forbidden → the "open from your email again" card', async () => {
    fetchMock.mockImplementation(() => jsonResponse(403, { error: 'forbidden' }));
    const f = mount();
    await fill(f);
    fireEvent.click(f.button);
    await waitFor(() => expect(screen.getByText(/from your email again/i)).toBeTruthy());
    expect(screen.queryByRole('button', { name: /accept proposal/i })).toBeNull();
  });

  it('a network failure keeps the form and shows a retryable error', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('offline')));
    const f = mount();
    await fill(f);
    fireEvent.click(f.button);
    await waitFor(() => expect(screen.getByText(/try again/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /accept proposal/i })).toBeTruthy();
  });
});
