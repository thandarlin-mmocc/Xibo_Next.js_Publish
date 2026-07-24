import { prisma } from "@/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";

type LogAuditParams = {
  action: AuditAction;
  actorId?: string | null;
  tenantId?: string | null;
  target?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Never throws - an audit-log write failure must not break the action it's
 * recording (a login, an approval, a Xibo sync). Errors are logged and
 * swallowed.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId ?? null,
        tenantId: params.tenantId ?? null,
        target: params.target,
        metadata: params.metadata,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", params.action, error);
  }
}

/** Extracts client ip/user-agent from a fetch-style Request (API routes). */
export function requestMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const userAgent = request.headers.get("user-agent");
  return { ipAddress, userAgent };
}
