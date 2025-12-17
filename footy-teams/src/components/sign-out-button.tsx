'use client';

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="text-sm font-semibold text-primary"
    >
      Sign out
    </button>
  );
}
