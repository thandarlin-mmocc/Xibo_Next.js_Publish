import { authOptions } from "@/lib/auth";
import { canAccessAirportArea } from "@/lib/authz";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function AirportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!canAccessAirportArea(session.user.role)) redirect("/dashboard");

  return <>{children}</>;
}
