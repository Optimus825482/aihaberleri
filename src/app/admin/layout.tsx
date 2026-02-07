// Force dynamic rendering for all admin pages
// This prevents static generation issues with useContext/useSession
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
