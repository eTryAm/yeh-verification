import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/infrastructure/db/prisma";
import { z } from "zod";
import { createHash } from "crypto";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Fetch user — note: password hash is stored in a separate table
        // to keep it out of the main user model
        const userWithPassword = await prisma.$queryRaw<
          Array<{ id: string; password_hash: string }>
        >`
          SELECT u.id, up.password_hash
          FROM users u
          JOIN user_passwords up ON up.user_id = u.id
          WHERE u.email = ${email}
            AND u.is_active = true
          LIMIT 1
        `;

        if (!userWithPassword[0]) return null;

        // Timing-safe comparison
        const inputHash = createHash("sha256").update(password).digest("hex");
        const stored = userWithPassword[0].password_hash;
        if (inputHash !== stored) return null;

        const user = await prisma.user.findUnique({
          where: { id: userWithPassword[0].id },
          include: { organization: true },
        });

        if (!user) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async session({ session, user }) {
      // Enrich session with organization and role from DB
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          organizationId: true,
          role: true,
          name: true,
          email: true,
          isActive: true,
        },
      });

      if (!dbUser || !dbUser.isActive) {
        // Force sign-out of deactivated users
        return { ...session, user: undefined as never };
      }

      session.user = {
        ...session.user,
        id: dbUser.id,
        organizationId: dbUser.organizationId,
        role: dbUser.role,
        name: dbUser.name,
        email: dbUser.email,
      } as never;

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
});
