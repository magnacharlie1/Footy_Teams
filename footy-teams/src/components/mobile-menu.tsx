"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Menu, User, Users, X } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";

type Props = {
  isAuthed: boolean;
};

export function MobileMenu({ isAuthed }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm transition hover:bg-background"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>

      <div
        className={`fixed inset-0 z-50 transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/40 transition-opacity dark:bg-slate-950/60 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-slate-50 shadow-2xl ring-1 ring-border/50 transition-transform duration-200 ease-out dark:bg-slate-950 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4">
            <div className="text-sm font-semibold text-muted-foreground">Menu</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 border-t border-border/60 px-4 py-4">
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Home
              </Link>

            {isAuthed ? (
              <>
                <Link
                  href="/groups"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Groups
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Profile
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Sign in
              </Link>
            )}

              {isAuthed ? (
                <div className="pt-3">
                  <SignOutButton />
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
