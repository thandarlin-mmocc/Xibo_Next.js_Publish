import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

function loginRequestMeta(req: { headers?: Record<string, any> }) {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  const ipAddress =
    (typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : null) ??
    req.headers?.["x-real-ip"] ??
    null;
  const userAgent = req.headers?.["user-agent"] ?? null;
  return { ipAddress, userAgent };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const { ipAddress, userAgent } = loginRequestMeta(req);

        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash || !user.isActive) {
          await logAudit({
            action: AuditAction.LOGIN_FAILURE,
            target: `User:${credentials.email}`,
            tenantId: user?.tenantId,
            ipAddress,
            userAgent,
          });
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!isValid) {
          await logAudit({
            action: AuditAction.LOGIN_FAILURE,
            actorId: user.id,
            target: `User:${user.email}`,
            tenantId: user.tenantId,
            ipAddress,
            userAgent,
          });
          return null;
        }

        await Promise.all([
          logAudit({
            action: AuditAction.LOGIN_SUCCESS,
            actorId: user.id,
            target: `User:${user.email}`,
            tenantId: user.tenantId,
            ipAddress,
            userAgent,
          }),
          prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          }),
        ]);

        // Return only necessary user info for the session
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          locale: user.locale,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.locale = user.locale;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
        session.user.locale = token.locale;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
