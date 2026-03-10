import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function LibrarySlugRedirectPage({ params }: Props) {
  const { locale, slug } = await params;
  const prefix = locale === 'ja' ? '/ja' : '';
  redirect(`${prefix}/learn/vault/${slug}`);
}
