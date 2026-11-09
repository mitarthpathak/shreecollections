import type { Metadata } from 'next';
import { Page } from '@/components/Page';
import { AdminApp } from '@/components/admin/AdminApp';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/** The shop's admin panel: log in with the admin password, add / edit / remove sarees and suits. */
export default function AdminPage() {
  return (
    <Page>
      <AdminApp />
    </Page>
  );
}
