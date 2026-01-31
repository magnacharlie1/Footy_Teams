'use client';

import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className={cn("text-sm font-semibold text-primary", className)}
    >
      Sign out
    </button>
  );
}
