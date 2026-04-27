import { setRequestLocale } from 'next-intl/server';
import { getPartnershipInquiries } from '@/lib/admin/queries';
import { AdminPartnershipInquiriesList } from '@/components/admin/AdminPartnershipInquiriesList';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Partnership Inquiries — Admin',
};

export default async function AdminPartnershipInquiriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const inquiries = await getPartnershipInquiries();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <h1 className="text-[clamp(22px,2.5vw,28px)] font-bold text-fg-primary tracking-[-0.02em]">
        Partnership Inquiries
      </h1>
      <AdminPartnershipInquiriesList inquiries={inquiries} />
    </div>
  );
}
