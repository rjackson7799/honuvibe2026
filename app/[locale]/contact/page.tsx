import { setRequestLocale } from 'next-intl/server';
import { ContactHero } from '@/components/sections/contact/contact-hero';
import { ContactForm } from '@/components/sections/contact/contact-form';
import { ContactSocial } from '@/components/sections/contact/contact-social';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <ContactHero />
      <ContactForm />
      <ContactSocial />
    </>
  );
}
