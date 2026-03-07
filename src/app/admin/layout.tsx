// Force dynamic rendering for all admin pages
// This prevents static generation issues with useContext/useSession
import { AdminShell } from "@/components/AdminLayout";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
