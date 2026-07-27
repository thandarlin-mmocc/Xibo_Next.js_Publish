import { authOptions } from "@/lib/auth";
import { canManageMedia } from "@/lib/authz";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!canManageMedia(session.user.role)) redirect("/dashboard");

  return <>{children}</>;
}
