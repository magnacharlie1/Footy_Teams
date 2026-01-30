import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { DevUserSelect } from "@/components/dev-user-select";
import { Providers } from "@/components/providers";
import { SignOutButton } from "@/components/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { fontSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { safeDisplayName } from "@/lib/player-name";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Home, User } from "lucide-react";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth";
import { CompleteProfileBanner } from "@/components/complete-profile-banner";
import { MobileMenu } from "@/components/mobile-menu";

export const metadata: Metadata = {
  title: "Footy Teams",
  description: "Organise weekly football sessions, build fair teams, and track the league.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const devAuthBypass = await isDevAuthBypassEnabled();
  const devUsers = devAuthBypass
    ? await prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background text-foreground antialiased",
          fontSans.variable,
        )}
      >
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-border bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
              <div className="container flex flex-col gap-2 py-3 sm:h-14 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="sm:hidden">
                    <MobileMenu isAuthed={Boolean(session?.user)} />
                  </div>
                  <Link
                    href="/"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "icon" }),
                      "hidden h-9 w-9 rounded-full bg-white/90 shadow-sm hover:bg-white sm:inline-flex",
                    )}
                  >
                    <Home className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Home</span>
                  </Link>
                  <Breadcrumbs />
                </div>
                <nav className="hidden flex-wrap items-center gap-3 text-xs sm:flex sm:text-sm">
                  {session?.user ? (
                    <>
                      <Link href="/groups">Groups</Link>
                      <Link
                        href="/profile"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "icon" }),
                          "h-9 w-9 rounded-full bg-white/90 shadow-sm hover:bg-white",
                        )}
                        aria-label="Profile"
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      {devAuthBypass ? (
                        <DevUserSelect
                          users={devUsers}
                          currentUserId={session.user.id}
                        />
                      ) : null}
                      <span className="hidden text-muted-foreground sm:inline">
                        {safeDisplayName(session.user.name)}
                      </span>
                      <SignOutButton />
                    </>
                  ) : (
                    <Link href="/login" className="text-primary font-semibold">
                      Sign in
                    </Link>
                  )}
                </nav>
              </div>
            </header>
            <CompleteProfileBanner show={Boolean(session?.user && !session.user.name)} />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
