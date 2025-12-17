import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { Providers } from "@/components/providers";
import { SignOutButton } from "@/components/sign-out-button";
import { fontSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
              <div className="container flex h-14 items-center justify-between">
                <Link href="/" className="text-sm font-semibold">
                  Footy Teams
                </Link>
                <nav className="flex items-center gap-4 text-sm">
                  {session?.user ? (
                    <>
                      <Link href="/groups">Groups</Link>
                      <span className="text-muted-foreground">
                        {session.user.name ?? session.user.email}
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
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
