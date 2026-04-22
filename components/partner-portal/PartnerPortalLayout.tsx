import { PartnerNav } from './PartnerNav';

type Props = {
  children: React.ReactNode;
  partnerName: string;
  partnerLogoUrl: string | null;
  previewMode?: boolean;
};

export function PartnerPortalLayout({ children, partnerName, partnerLogoUrl, previewMode }: Props) {
  return (
    <div className="flex min-h-screen">
      <PartnerNav
        partnerName={partnerName}
        partnerLogoUrl={partnerLogoUrl}
        previewMode={previewMode}
      />
      <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
