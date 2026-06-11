import type { Metadata } from 'next';
import { CustomScopingStub } from '@/components/discover/CustomScopingStub';

export const metadata: Metadata = {
  title: 'Custom scoping',
};

export default function CustomScopingPage() {
  return <CustomScopingStub />;
}
