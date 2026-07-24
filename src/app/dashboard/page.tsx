import { authOptions } from "@/lib/auth";
import { roleHomePath } from "@/lib/authz";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  redirect(roleHomePath(session.user.role));
}
