import { redirect } from 'next/navigation';

import LoginForm from '@/app/features/auth/components/LoginForm';
import { getSession } from '@/app/features/auth/server/session';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect('/admin');
  }

  return (
    <section className="relative overflow-hidden bg-[#0e0e10] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(239,68,68,0.16),_transparent_28%)]" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=1800&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e10]/70 via-[#0e0e10] to-[#0e0e10]" />

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
        <LoginForm />
      </div>
    </section>
  );
}