import { redirect } from 'next/navigation';

import AdminDashboard from '@/app/components/admin/dashboard/AdminDashboard';
import { getSession } from '@/lib/auth/session';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <AdminDashboard userName={session.name} />;
}
