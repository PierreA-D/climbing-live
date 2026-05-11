import { redirect } from 'next/navigation';

import AdminConsole from '@/app/components/admin/AdminConsole';
import { getSession } from '@/lib/auth/session';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <AdminConsole userName={session.name} />;
}
