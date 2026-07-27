import { authOptions } from "@/lib/auth";
import { canManageUsers } from "@/lib/authz";
import { logAudit, requestMeta } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SELECT_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  tenantId: true,
  isActive: true,
  locale: true,
  lastLoginAt: true,
  createdAt: true,
  tenant: { select: { id: true, name: true, type: true } },
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: SELECT_FIELDS,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  const name = (body?.name as string | undefined)?.trim();
  const password = body?.password as string | undefined;
  const role = body?.role as UserRole | undefined;
  const tenantId = (body?.tenantId as string | undefined) || null;
  const locale = (body?.locale as string | undefined) || null;

  if (!email || !name || !password || !role) {
    return NextResponse.json(
      { error: "email, name, password, and role are required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }
  if (!Object.values(UserRole).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (role !== UserRole.ADMIN && !tenantId) {
    return NextResponse.json(
      { error: "tenantId is required for non-admin roles" },
      { status: 400 },
    );
  }
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role, tenantId, locale, isActive: true },
    select: SELECT_FIELDS,
  });

  await logAudit({
    action: AuditAction.USER_CREATE,
    actorId: session.user.id,
    tenantId: user.tenantId,
    target: `User:${user.id}`,
    metadata: { email: user.email, role: user.role },
    ...requestMeta(request),
  });

  return NextResponse.json(user, { status: 201 });
}
