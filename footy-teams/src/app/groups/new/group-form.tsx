"use client";

import { useActionState } from "react";

import type { CreateGroupState } from "./actions";
import { createGroupAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateGroupState = {
  message: "",
  fieldErrors: {},
  values: {
    timezone: "Europe/London",
  },
};

export function GroupForm() {
  const [state, formAction] = useActionState(createGroupAction, initialState);

  const getError = (field: string) => state.fieldErrors?.[field]?.[0];
  const getValue = (field: string) => state.values?.[field] ?? "";

  return (
    <form className="space-y-4" action={formAction}>
      <div className="space-y-2">
        <Label htmlFor="name">Group name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Charlies Monday Football"
          defaultValue={getValue("name")}
          aria-invalid={Boolean(getError("name"))}
        />
        {getError("name") && (
          <p className="text-sm text-destructive">{getError("name")}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          name="timezone"
          required
          defaultValue={getValue("timezone")}
          aria-invalid={Boolean(getError("timezone"))}
        />
        {getError("timezone") && (
          <p className="text-sm text-destructive">{getError("timezone")}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="defaultDayOfWeek">Default day</Label>
          <select
            id="defaultDayOfWeek"
            name="defaultDayOfWeek"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            defaultValue={getValue("defaultDayOfWeek")}
            aria-invalid={Boolean(getError("defaultDayOfWeek"))}
          >
            <option value="" disabled>
              Select a day
            </option>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
          {getError("defaultDayOfWeek") && (
            <p className="text-sm text-destructive">{getError("defaultDayOfWeek")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultStartTimeHHMM">Start time (HH:MM)</Label>
          <Input
            id="defaultStartTimeHHMM"
            name="defaultStartTimeHHMM"
            required
            placeholder="18:30"
            defaultValue={getValue("defaultStartTimeHHMM")}
            aria-invalid={Boolean(getError("defaultStartTimeHHMM"))}
          />
          {getError("defaultStartTimeHHMM") && (
            <p className="text-sm text-destructive">{getError("defaultStartTimeHHMM")}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultDurationMinutes">Duration (mins)</Label>
          <Input
            id="defaultDurationMinutes"
            name="defaultDurationMinutes"
            type="number"
            min={30}
            max={240}
            required
            placeholder="60"
            defaultValue={getValue("defaultDurationMinutes")}
            aria-invalid={Boolean(getError("defaultDurationMinutes"))}
          />
          {getError("defaultDurationMinutes") && (
            <p className="text-sm text-destructive">{getError("defaultDurationMinutes")}</p>
          )}
        </div>
      </div>
      {state.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit">Create group</Button>
    </form>
  );
}
