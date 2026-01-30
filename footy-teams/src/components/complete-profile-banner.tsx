"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

type Props = {
  show: boolean;
};

export function CompleteProfileBanner({ show }: Props) {
  const pathname = usePathname();
  if (!show || pathname === "/profile") return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="container flex flex-col gap-3 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Add your name so teammates can recognize you. Your email is never shown.
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/profile">Set your name</Link>
        </Button>
      </div>
    </div>
  );
}
