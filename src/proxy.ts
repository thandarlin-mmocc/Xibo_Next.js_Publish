import { UserRole } from "@prisma/client";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessAirportArea, canAccessSchoolArea, roleHomePath } from "@/lib/authz";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role as UserRole | undefined;
    const pathname = req.nextUrl.pathname;

    if (!role) return NextResponse.next();

    const inAdminArea = pathname.startsWith("/admin");
    const inSchoolArea = pathname.startsWith("/teacher");
    const inAirportArea = pathname.startsWith("/ops");

    // Platform ADMIN can see into every area - a super admin needs real
    // cross-tenant oversight, not just its own /admin corner.
    const allowed =
      role === UserRole.ADMIN ||
      (inSchoolArea && canAccessSchoolArea(role)) ||
      (inAirportArea && canAccessAirportArea(role)) ||
      (!inAdminArea && !inSchoolArea && !inAirportArea); // e.g. /dashboard

    if (!allowed) {
      return NextResponse.redirect(new URL(roleHomePath(role), req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

// Pages only - API routes self-enforce auth via getServerSession and return
// JSON 401s; withAuth's default unauthorized behavior is an HTML redirect,
// which would be wrong for fetch() callers.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/ops/:path*",
  ],
};
