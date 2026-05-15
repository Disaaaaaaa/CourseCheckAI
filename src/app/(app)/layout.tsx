import { AppShell } from "@/components/app-shell";
import { getAuthenticatedTeacher } from "@/lib/auth";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { teacher } = await getAuthenticatedTeacher();
  return (
    <AppShell
      user={{ fullName: teacher.full_name ?? teacher.email, email: teacher.email }}
    >
      {children}
    </AppShell>
  );
}
