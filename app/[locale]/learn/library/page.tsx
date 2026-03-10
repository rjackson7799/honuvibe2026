import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LibraryRedirectPage({ params }: Props) {
  const { locale } = await params;
  const prefix = locale === 'ja' ? '/ja' : '';
  redirect(`${prefix}/learn/vault`);
}
