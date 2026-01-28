"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  action: () => Promise<void>;
};

export function DeleteSessionButton({ action }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this session? This cannot be undone.")) return;
        startTransition(() => {
          void action();
        });
      }}
    >
      Delete session
    </Button>
  );
}
