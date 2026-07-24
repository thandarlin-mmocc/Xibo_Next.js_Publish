import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

type SessionUser = Session["user"];

/**
 * Prisma where-fragment enforcing tenant isolation.
 * Platform ADMIN has no tenantId and can see across tenants; everyone else
 * is scoped to their own tenant. Spread this into every tenant-scoped query.
 *
 * Fails closed: a non-admin with no tenantId gets a never-matching filter,
 * not an empty object. Prisma treats `{ tenantId: undefined }` as "omit this
 * field from the where clause" (not "IS NULL"), which would silently return
 * every tenant's rows instead of zero - the opposite of what tenant scoping
 * is for.
 */
export function tenantWhere(user: SessionUser): { tenantId: string } {
  if (user.role === UserRole.ADMIN) return {} as { tenantId: string };
  return { tenantId: user.tenantId ?? "__no_tenant__" };
}

export function canUploadArtwork(role: UserRole): boolean {
  return role === UserRole.TEACHER;
}

export function canReviewArtwork(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.TEACHER;
}

export function canPublishArtwork(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.TEACHER;
}

export function canManageFlights(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.AIRPORT_ADMIN ||
    role === UserRole.OPS
  );
}

export function canManageFacilities(role: UserRole): boolean {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.AIRPORT_ADMIN ||
    role === UserRole.OPS
  );
}

const SCHOOL_ROLES: UserRole[] = [
  UserRole.SCHOOL_ADMIN,
  UserRole.TEACHER,
  UserRole.STUDENT,
];

const AIRPORT_ROLES: UserRole[] = [UserRole.AIRPORT_ADMIN, UserRole.OPS];

export function isSchoolRole(role: UserRole): boolean {
  return SCHOOL_ROLES.includes(role);
}

export function isAirportRole(role: UserRole): boolean {
  return AIRPORT_ROLES.includes(role);
}

/**
 * "Can visit" checks for route guards - unlike isSchoolRole/isAirportRole
 * (pure role classification, used for e.g. roleHomePath), these also let the
 * platform ADMIN in, since a super admin needs to see into every area for
 * real cross-tenant oversight.
 */
export function canAccessSchoolArea(role: UserRole): boolean {
  return isSchoolRole(role) || role === UserRole.ADMIN;
}

export function canAccessAirportArea(role: UserRole): boolean {
  return isAirportRole(role) || role === UserRole.ADMIN;
}

/**
 * Single source of truth for "where does this role land after login."
 * Reused by /dashboard's redirect and by middleware's role<->route-group check.
 *
 * CONTENT_EDITOR has no confirmed tenant type yet (flagged as an open
 * follow-up) - defaults to the school group until that's decided.
 */
export function roleHomePath(role: UserRole): string {
  if (role === UserRole.ADMIN) return "/admin";
  if (isAirportRole(role)) return "/ops";
  return "/teacher";
}
