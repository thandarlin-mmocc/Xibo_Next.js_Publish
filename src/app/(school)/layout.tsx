import { authOptions } from "@/lib/auth";
import { canAccessSchoolArea } from "@/lib/authz";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!canAccessSchoolArea(session.user.role)) redirect("/dashboard");

  return <>{children}</>;
}
