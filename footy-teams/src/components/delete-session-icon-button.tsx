"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  action: () => Promise<void>;
};

export function DeleteSessionIconButton({ action }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this session? This cannot be undone.")) return;
        startTransition(() => {
          void action();
        });
      }}
      aria-label="Delete session"
      title="Delete session"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
