// src/types/next-auth.d.ts
import { UserRole } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      tenantId: string | null;
      locale: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    tenantId: string | null;
    locale: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tenantId: string | null;
    locale: string | null;
  }
}
