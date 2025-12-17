import type { Metadata } from "next";
import "./globals.css";
import { fontSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Footy Teams",
  description: "Organise weekly football sessions, build fair teams, and track the league.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background text-foreground antialiased",
          fontSans.variable,
        )}
      >
        {children}
      </body>
    </html>
  );
}
