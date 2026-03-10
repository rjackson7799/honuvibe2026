import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getVaultUserNotes } from '@/lib/vault/queries';
import { VaultSubNav } from '@/components/vault/VaultSubNav';
import { StickyNote, ExternalLink } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Notes — The Vault',
  description: 'Your notes on Vault content.',
};

export default async function VaultNotesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/learn');
  }

  const notes = await getVaultUserNotes(user.id);

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-fg-primary mb-2">Notes</h1>
        <p className="text-fg-secondary">Your notes across all Vault content.</p>
      </div>

      <VaultSubNav isAuthenticated />

      {notes.length > 0 ? (
        <div className="space-y-4">
          {notes.map((note) => {
            const title =
              locale === 'ja' && note.content_item.title_jp
                ? note.content_item.title_jp
                : note.content_item.title_en;

            return (
              <div
                key={note.id}
                className="bg-bg-secondary border border-border-default rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    href={`/learn/vault/${note.content_item.slug}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-accent-teal hover:text-accent-teal/80 transition-colors"
                  >
                    {title}
                    <ExternalLink size={12} />
                  </Link>
                  <span className="text-xs text-fg-tertiary shrink-0">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {note.timestamp_seconds != null && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded bg-bg-tertiary text-fg-tertiary mb-2">
                    @ {Math.floor(note.timestamp_seconds / 60)}:{String(note.timestamp_seconds % 60).padStart(2, '0')}
                  </span>
                )}

                <p className="text-sm text-fg-secondary whitespace-pre-wrap line-clamp-4">
                  {note.note_text}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <StickyNote size={32} className="mx-auto mb-3 text-fg-tertiary" />
          <p className="text-fg-tertiary text-sm">
            No notes yet. Add notes while viewing Vault content.
          </p>
        </div>
      )}
    </div>
  );
}
