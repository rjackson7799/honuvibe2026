'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PartnerAdminRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

type Props = {
  partnerId: string;
  initialAdmins: PartnerAdminRow[];
};

export function PartnerAdminManager({ partnerId, initialAdmins }: Props) {
  const router = useRouter();
  const [admins, setAdmins] = useState<PartnerAdminRow[]>(initialAdmins);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to grant access');
        return;
      }

      setAdmins((prev) => [
        ...prev,
        {
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          created_at: new Date().toISOString(),
        },
      ]);
      setEmail('');
      setMessage(`Granted portal access to ${data.email}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(userId: string, revokedEmail: string | null) {
    if (!confirm(`Revoke portal access for ${revokedEmail ?? userId}?`)) return;

    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/admins/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to revoke');
        return;
      }
      setAdmins((prev) => prev.filter((a) => a.user_id !== userId));
      setMessage(`Revoked portal access for ${revokedEmail ?? userId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Network error');
    }
  }

  return (
    <section className="rounded-lg border border-border-default bg-bg-secondary p-5 space-y-5">
      <div>
        <h2 className="font-serif text-xl text-fg-primary">Portal access</h2>
        <p className="mt-1 text-sm text-fg-tertiary">
          Users listed here can sign in and see this partner&apos;s aggregate metrics at
          <code className="mx-1 rounded bg-bg-tertiary px-1.5 py-0.5 text-xs">/partner/</code>.
          They cannot see individual student data.
        </p>
      </div>

      {admins.length === 0 ? (
        <p className="text-sm text-fg-tertiary italic">No portal admins yet.</p>
      ) : (
        <ul className="divide-y divide-border-default rounded border border-border-default">
          {admins.map((a) => (
            <li
              key={a.user_id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-fg-primary">{a.email ?? a.user_id}</div>
                <div className="truncate text-xs text-fg-tertiary">
                  {a.full_name ?? '—'} · added {new Date(a.created_at).toLocaleDateString('en-US')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revoke(a.user_id, a.email)}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-fg-tertiary hover:bg-bg-tertiary hover:text-fg-primary"
                aria-label={`Revoke access for ${a.email ?? a.user_id}`}
              >
                <X size={14} /> Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={grant} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          placeholder="partner-contact@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="flex-1 rounded border border-border-default bg-bg-primary px-3 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:border-accent-teal focus:outline-none"
        />
        <Button type="submit" disabled={submitting || !email.trim()} variant="primary" size="sm" icon={UserPlus}>
          {submitting ? 'Granting…' : 'Grant access'}
        </Button>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-accent-teal">{message}</p>}
      <p className="text-xs text-fg-tertiary">
        The user must sign up at <code>/learn/auth</code> first. Granting access promotes their role
        to <code>partner</code>.
      </p>
    </section>
  );
}
