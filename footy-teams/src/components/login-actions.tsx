'use client';

import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

type Props = {
  callbackUrl?: string;
  showApple?: boolean;
};

export function LoginActions({ callbackUrl = "/groups", showApple = false }: Props) {
  return (
    <div className="grid w-full max-w-sm gap-3">
      <Button
        variant="default"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl })}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign in with Google
      </Button>
      {showApple ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => signIn("apple", { callbackUrl })}
        >
          <LogIn className="mr-2 h-4 w-4" />
          Sign in with Apple
        </Button>
      ) : null}
    </div>
  );
}
