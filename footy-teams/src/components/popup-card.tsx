"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
};

export function PopupCard({ title, message, actionLabel = "Okay" }: Props) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{message}</p>
          <Button type="button" onClick={() => setOpen(false)}>
            {actionLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
