import { Metadata } from "next";
import { Suspense } from "react";

import { DevAuthToggleButton } from "@/components/dev-auth-toggle-button";
import { LoginActions } from "@/components/login-actions";

export const metadata: Metadata = {
  title: "Sign in | Footy Teams",
};

type Props = {
  searchParams?: { callbackUrl?: string };
};

export default function LoginPage({ searchParams }: Props) {
  const rawCallbackUrl = searchParams?.callbackUrl;
  const callbackUrl = (() => {
    if (!rawCallbackUrl) return undefined;
    try {
      return decodeURIComponent(rawCallbackUrl);
    } catch {
      return rawCallbackUrl;
    }
  })();
  const postLoginUrl = `/post-login?next=${encodeURIComponent(callbackUrl ?? "/groups")}`;
  const devAuthEnabled =
    process.env.DEV_AUTH_BYPASS === "true" &&
    process.env.NODE_ENV !== "production";

  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center gap-6 py-10">
      <div className="max-w-md space-y-3 text-center">
        <p className="text-sm font-semibold text-primary">Welcome back</p>
        <h1 className="text-3xl font-semibold">Sign in to Footy Teams</h1>
        <p className="text-muted-foreground">
          Sign in to manage your groups and weekly sessions.
        </p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginActions callbackUrl={callbackUrl} />
      </Suspense>
      {devAuthEnabled ? (
        <div className="flex flex-col gap-2">
          <DevAuthToggleButton
            mode="demo"
            label="Create demo user"
            redirectTo={postLoginUrl}
          />
          <DevAuthToggleButton
            mode="enable"
            label="Use dev auth"
            redirectTo={postLoginUrl}
          />
        </div>
      ) : null}
    </div>
  );
}
