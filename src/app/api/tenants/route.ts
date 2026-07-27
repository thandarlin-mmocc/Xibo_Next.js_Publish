import { authOptions } from "@/lib/auth";
import { canManageUsers } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Protected, ADMIN-only - feeds the tenant picker in user management. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tenants);
}
