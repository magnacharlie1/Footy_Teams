"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type UpdateNameState,
  updateProfileNameAction,
} from "./actions";

const initialState: UpdateNameState = {};

type Props = {
  initialName: string | null;
};

export function ProfileNameForm({ initialName }: Props) {
  const [state, formAction] = useActionState(updateProfileNameAction, initialState);
  const fieldError = state.fieldErrors?.name?.[0];
  const value = state.values?.name ?? initialName ?? "";

  return (
    <form action={formAction} className="space-y-3">
      {state.message ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-semibold text-foreground">
          Display name
        </label>
        <Input
          id="name"
          name="name"
          placeholder="Your name"
          defaultValue={value}
          required
          aria-invalid={Boolean(fieldError)}
        />
        {fieldError ? (
          <p className="text-xs text-destructive">{fieldError}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full sm:w-auto">
        Save name
      </Button>
    </form>
  );
}
