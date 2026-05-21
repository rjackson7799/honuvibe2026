import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import type { VaultArticleBody } from '@/lib/vault/types';

type VaultArticleRendererProps = {
  body: VaultArticleBody | null;
  locale: string;
  isPremium: boolean;
};

/**
 * Renders the markdown body for a content_type='article' item.
 * The body lives in the protected vault_article_bodies table — by the time
 * this component runs, the row has already been gated by RLS (premium bodies
 * only return for subscribers). A null body means either:
 *   - no body has been authored yet, OR
 *   - the body is premium and the user isn't a subscriber (paywall handled
 *     by the parent layout's premium gate).
 */
export function VaultArticleRenderer({ body, locale, isPremium }: VaultArticleRendererProps) {
  if (!body) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-6 text-center text-fg-tertiary text-sm">
        {isPremium
          ? 'Premium subscribers can view this article.'
          : 'This article has no content yet.'}
      </div>
    );
  }

  const markdown = locale === 'ja' && body.body_jp ? body.body_jp : body.body_en;

  if (!markdown?.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-border-default p-6 text-center text-fg-tertiary text-sm">
        This article has no content yet.
      </div>
    );
  }

  return (
    <article className="vault-article prose prose-neutral dark:prose-invert max-w-none">
      {body.reading_time_minutes != null && (
        <p className="text-xs text-fg-tertiary mb-6 not-prose">
          {body.reading_time_minutes} min read
        </p>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
