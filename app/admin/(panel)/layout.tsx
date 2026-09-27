import { redirect } from 'next/navigation';
import { getAdminSession, revokeAdminSession } from '@/lib/admin-auth';
import { capabilitiesForRoles } from '@/lib/admin-permissions';
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
  // proxy.ts already bounces anonymous requests; this also catches a session the
  // edge accepted but the database no longer should — a deactivated or deleted
  // account — sending it back to the staff sign-in.
  const session = await getAdminSession();
  if (!session) {
    const staffSlug = process.env.STAFF_PATH || 'desk';
    redirect(`/${staffSlug}/login`);
  }

  const capabilities = [...capabilitiesForRoles(session.roles)];

  return (
    <div className="min-h-screen bg-(--ed-canvas) text-[var(--ed-ink)]">
      <AdminSidebar logout={logout} capabilities={capabilities} />
      <main className="md:pl-56">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
