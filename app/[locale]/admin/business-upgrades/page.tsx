import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { PlusCircle } from 'lucide-react';
import { listBusinessUpgradeProjectsAdmin } from '@/lib/business-upgrades/queries';
import { AdminBusinessUpgradeList } from '@/components/admin/AdminBusinessUpgradeList';
export const metadata = { title: 'Business Upgrades — Admin' };
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale }=await params;setRequestLocale(locale);const projects=await listBusinessUpgradeProjectsAdmin();return <div className="max-w-[1100px] space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-fg-primary">Business Upgrades</h1><p className="mt-1 text-sm text-fg-secondary">Author outcome-based projects for Vault members.</p></div><div className="flex gap-3"><Link href="/admin/business-upgrades/member-plans" className="inline-flex min-h-10 items-center rounded-lg border border-border-default px-4 text-sm font-semibold text-fg-secondary">Member plans</Link><Link href="/admin/business-upgrades/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent-teal px-4 text-sm font-semibold text-white"><PlusCircle size={16}/>New project</Link></div></div><AdminBusinessUpgradeList projects={projects}/></div>; }
