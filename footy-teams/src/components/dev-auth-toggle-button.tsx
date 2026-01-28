"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  mode: "enable" | "disable" | "demo";
  label: string;
  redirectTo: string;
};

export function DevAuthToggleButton({ mode, label, redirectTo }: Props) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      await fetch("/api/dev-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get("callbackUrl");
      const target = callbackUrl ? decodeURIComponent(callbackUrl) : redirectTo;
      window.location.href = target;
    });
  };

  return (
    <Button type="button" variant="secondary" onClick={onClick} disabled={isPending}>
      {label}
    </Button>
  );
}
