'use client';

import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

type Props = {
  callbackUrl?: string;
};

export function LoginActions({ callbackUrl = "/groups" }: Props) {
  return (
    <div className="grid w-full max-w-sm gap-3">
      <Button
        variant="default"
        className="w-full"
        onClick={() => signIn("auth0", { callbackUrl })}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign in
      </Button>
    </div>
  );
}
