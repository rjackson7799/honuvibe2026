'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Clock, Check, X } from 'lucide-react';

type ContentRequest = {
  id: string;
  user_id: string;
  topic_text: string;
  tags: string[];
  status: string;
  created_at: string;
  users?: { full_name: string | null; email: string | null };
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-accent-gold/10 text-accent-gold',
  planned: 'bg-accent-teal/10 text-accent-teal',
  completed: 'bg-emerald-500/10 text-emerald-500',
  declined: 'bg-red-500/10 text-red-500',
};

export function VaultContentRequests() {
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch('/api/vault/requests');
        if (res.ok) {
          const data = await res.json();
          setRequests(data.requests ?? []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  if (loading) {
    return <p className="text-sm text-fg-tertiary">Loading requests...</p>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare size={32} className="mx-auto text-fg-tertiary mb-2" />
        <p className="text-sm text-fg-tertiary">No content requests yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-fg-primary uppercase tracking-wider">
        Content Requests ({requests.length})
      </h3>
      <div className="space-y-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className="p-3 rounded-lg bg-bg-secondary border border-border-default"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-fg-primary">{req.topic_text}</p>
                {req.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {req.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-fg-tertiary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-xs text-fg-tertiary">
                  <span>{req.users?.full_name ?? req.users?.email ?? 'Unknown'}</span>
                  <span>·</span>
                  <span>{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded capitalize shrink-0 ${STATUS_STYLES[req.status] ?? STATUS_STYLES.pending}`}
              >
                {req.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
