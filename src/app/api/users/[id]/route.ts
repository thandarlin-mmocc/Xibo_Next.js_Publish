import { authOptions } from "@/lib/auth";
import { canManageUsers } from "@/lib/authz";
import { logAudit, requestMeta } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

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

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.locale === "string") {
    data.locale = body.locale || null;
  }
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  let roleChanged = false;
  if (typeof body.role === "string" && body.role !== target.role) {
    if (!Object.values(UserRole).includes(body.role as UserRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
    roleChanged = true;
  }

  if ("tenantId" in body) {
    const nextTenantId = (body.tenantId as string | null) || null;
    const effectiveRole = (data.role as UserRole | undefined) ?? target.role;
    if (effectiveRole !== UserRole.ADMIN && !nextTenantId) {
      return NextResponse.json(
        { error: "tenantId is required for non-admin roles" },
        { status: 400 },
      );
    }
    if (nextTenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: nextTenantId } });
      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
      }
    }
    data.tenantId = nextTenantId;
  }

  let deactivated = false;
  if (typeof body.isActive === "boolean" && body.isActive !== target.isActive) {
    if (!body.isActive && target.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }
    data.isActive = body.isActive;
    deactivated = !body.isActive;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: SELECT_FIELDS,
  });

  if (roleChanged) {
    await logAudit({
      action: AuditAction.USER_ROLE_CHANGE,
      actorId: session.user.id,
      tenantId: updated.tenantId,
      target: `User:${updated.id}`,
      metadata: { from: target.role, to: updated.role },
      ...requestMeta(request),
    });
  }
  if (deactivated) {
    await logAudit({
      action: AuditAction.USER_DISABLE,
      actorId: session.user.id,
      tenantId: updated.tenantId,
      target: `User:${updated.id}`,
      ...requestMeta(request),
    });
  }

  return NextResponse.json(updated);
}
