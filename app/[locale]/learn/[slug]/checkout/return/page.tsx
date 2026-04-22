import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { stripe } from '@/lib/stripe/client';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: Props) {
  const { locale, slug } = await params;
  const { session_id } = await searchParams;
  setRequestLocale(locale);

  const prefix = locale === 'ja' ? '/ja' : '';

  if (!session_id) {
    redirect(`${prefix}/learn/${slug}`);
  }

  let destination: string;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid') {
      destination = `${prefix}/learn/dashboard/${slug}?enrolled=true`;
    } else {
      destination = `${prefix}/learn/${slug}/checkout?error=payment_failed`;
    }
  } catch {
    destination = `${prefix}/learn/${slug}`;
  }

  redirect(destination);
}
