import { redirect } from 'next/navigation';
import { isAdmin, revokeAdminSession } from '@/lib/admin-auth';
import { AdminSidebar } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';

async function logout() {
  'use server';
  await revokeAdminSession();
  const slug = process.env.ADMIN_PATH || 'poorvith';
  redirect(`/${slug}/login`);
}

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const slug = process.env.ADMIN_PATH || 'poorvith';
  if (!(await isAdmin())) redirect(`/${slug}/login`);

  return (
    <div className="min-h-screen bg-(--ed-canvas) text-[var(--ed-ink)]">
      <AdminSidebar logout={logout} />
      <main className="md:pl-56">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
