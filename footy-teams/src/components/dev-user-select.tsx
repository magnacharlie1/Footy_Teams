"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type UserOption = {
  id: string;
  name: string | null;
  email: string | null;
};

type Props = {
  users: UserOption[];
  currentUserId: string;
};

export function DevUserSelect({ users, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(currentUserId);

  const onChange = (nextValue: string) => {
    setValue(nextValue);
    startTransition(async () => {
      await fetch("/api/dev-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: nextValue }),
      });
      router.refresh();
    });
  };

  const disableDevAuth = () => {
    startTransition(async () => {
      await fetch("/api/dev-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "disable" }),
      });
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <label className="flex items-center gap-2">
        <span className="font-semibold text-foreground">Dev user</span>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isPending}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name ?? user.email ?? user.id}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
        onClick={disableDevAuth}
        disabled={isPending}
      >
        View as new user
      </button>
    </div>
  );
}
