import { authOptions } from "@/lib/auth";
import { canManageFacilities, tenantWhere } from "@/lib/authz";
import { logAudit, requestMeta } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction, ToiletIssueStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const issueId = Number(id);
  if (!Number.isFinite(issueId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !canManageFacilities(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}) as any);
  const status = body?.status as ToiletIssueStatus | undefined;
  if (!status || !Object.values(ToiletIssueStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const issue = await prisma.toiletIssue.findFirst({
    where: { id: issueId, ...tenantWhere(session.user) },
  });
  if (!issue) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.toiletIssue.update({
    where: { id: issueId },
    data: {
      status,
      resolvedAt: status === ToiletIssueStatus.RESOLVED ? new Date() : issue.resolvedAt,
    },
  });

  if (status === ToiletIssueStatus.RESOLVED) {
    await logAudit({
      action: AuditAction.TOILET_ISSUE_RESOLVE,
      actorId: session.user.id,
      tenantId: issue.tenantId,
      target: `ToiletIssue:${issue.id}`,
      ...requestMeta(request),
    });
  }

  return NextResponse.json(updated);
}
