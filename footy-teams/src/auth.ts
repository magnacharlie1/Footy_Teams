import "server-only";
import NextAuth, { type Session, type User } from "next-auth";
import Auth0 from "next-auth/providers/auth0";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";

const devUserId = "dev-user";
const devUserEmail = "dev@example.com";

function getDevUserId() {
  const globalValue = (globalThis as { __devAuthUserId?: string }).__devAuthUserId;
  return globalValue ?? devUserId;
}

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Auth0({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER,
    }),
  ],
  callbacks: {
    session: async ({ session, user }: { session: Session; user: User }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  trustHost: true,
});

export const { handlers, signIn, signOut } = nextAuth;

type AuthSession = () => Promise<Session | null>;

export const auth: AuthSession = async () => {
  if (await isDevAuthBypassEnabled()) {
    const requestedUserId = getDevUserId();
    const requestedUser = await prisma.user.findUnique({
      where: { id: requestedUserId },
    });
    const user =
      requestedUser ??
      (await prisma.user.upsert({
        where: { id: devUserId },
        create: {
          id: devUserId,
          name: "Dev User",
          email: devUserEmail,
        },
        update: {
          name: "Dev User",
          email: devUserEmail,
        },
      }));

    return {
      user: {
        id: user.id,
        name: user.name ?? "Dev User",
        email: user.email ?? devUserEmail,
      },
      expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    } satisfies Session;
  }
  return nextAuth.auth();
};
