import { setRequestLocale } from 'next-intl/server';
import { getAdminLibraryVideos } from '@/lib/library/queries';
import { AdminLibraryList } from '@/components/admin/AdminLibraryList';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Library — Admin',
};

export default async function AdminLibraryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const videos = await getAdminLibraryVideos();

  return (
    <div className="space-y-6 max-w-[1100px]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-fg-primary">Library Videos</h1>
        <Link
          href="/admin/library/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent-teal text-white rounded-lg text-sm font-medium hover:bg-accent-teal/90 transition-colors"
        >
          <PlusCircle size={16} />
          Add Video
        </Link>
      </div>
      <AdminLibraryList videos={videos} />
    </div>
  );
}
