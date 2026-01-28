"use client";

import { useEffect, useState } from "react";
import { Copy, Link as LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  code: string;
  onLinkReady?: (link: string) => void;
};

export function InviteLinkCard({ code, onLinkReady }: Props) {
  const [link, setLink] = useState(`/invite/${code}`);

  useEffect(() => {
    const nextLink = `${window.location.origin}/invite/${code}`;
    setLink(nextLink);
    onLinkReady?.(nextLink);
  }, [code, onLinkReady]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Ignore clipboard errors; user can copy manually.
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm">
        <LinkIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="break-all">{link}</span>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={handleCopy}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy
      </Button>
    </div>
  );
}
