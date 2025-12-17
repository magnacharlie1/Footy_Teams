import { Metadata } from "next";
import { Suspense } from "react";

import { LoginActions } from "@/components/login-actions";

export const metadata: Metadata = {
  title: "Sign in | Footy Teams",
};

export default function LoginPage() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-6 py-10">
      <div className="max-w-md space-y-3 text-center">
        <p className="text-sm font-semibold text-primary">Welcome back</p>
        <h1 className="text-3xl font-semibold">Sign in to Footy Teams</h1>
        <p className="text-muted-foreground">
          Use Google or Apple to manage your groups and weekly sessions.
        </p>
      </div>
      <Suspense fallback={<div>Loading…</div>}>
        <LoginActions />
      </Suspense>
    </div>
  );
}
