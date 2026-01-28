"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 rounded-full bg-white/90 shadow-sm hover:bg-white"
      onClick={() => router.back()}
    >
      <span aria-hidden="true">&lt;</span>
      <span className="sr-only">Back</span>
    </Button>
  );
}
