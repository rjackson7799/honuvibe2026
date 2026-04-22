import { getFromAddress, getResendClient } from './client';
import {
  accentBanner,
  baseLayout,
  ctaButton,
  detailsTable,
  divider,
  heading,
  paragraph,
} from './templates';
import type { Locale } from './types';

type PaymentLinkEmailOptions = {
  locale: Locale;
  email: string;
  fullName: string;
  courseTitle: string;
  paymentUrl: string;
  priceUsd: number;
};

export async function sendLocalizedPaymentLinkEmail(
  data: PaymentLinkEmailOptions,
): Promise<void> {
  const { locale, email, fullName, courseTitle, paymentUrl, priceUsd } = data;
  const isJP = locale === 'ja';
  const price = `$${(priceUsd / 100).toLocaleString('en-US')}`;

  const body = [
    accentBanner(isJP ? 'お支払いリンク' : 'Your Payment Link'),
    heading(isJP ? `${fullName}さん、こんにちは` : `Hi ${fullName},`),
    paragraph(
      isJP
        ? `<strong>${courseTitle}</strong> の受講お申し込み用お支払いリンクをお送りします。下のボタンから決済を完了して、お席を確保してください。`
        : `You've been invited to enroll in <strong>${courseTitle}</strong>. Use the button below to complete your payment and secure your spot.`,
    ),
    ctaButton({
      href: paymentUrl,
      label: isJP ? '支払いを完了する →' : 'Complete Payment →',
    }),
    detailsTable([
      { label: isJP ? 'コース' : 'Course', value: courseTitle },
      { label: isJP ? '金額' : 'Price', value: price },
      { label: isJP ? '通貨' : 'Currency', value: 'USD' },
    ]),
    divider(),
    paragraph(
      isJP
        ? 'このリンクの有効期限は23時間です。ご不明な点があれば、このメールに返信してください。'
        : 'This link expires in 23 hours. If you have any questions, reply to this email.',
    ),
  ].join('');

  const resend = getResendClient();
  if (!resend) return;

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: email,
    subject: isJP
      ? `受講お支払いリンク — ${courseTitle}`
      : `Complete your payment — ${courseTitle}`,
    html: baseLayout({ locale, body }),
  });

  if (error) console.error('[sendLocalizedPaymentLinkEmail] Failed:', error.message);
}
