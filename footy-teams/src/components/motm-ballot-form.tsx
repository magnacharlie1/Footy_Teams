"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type PlayerOption = {
  id: string;
  name: string;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  options: PlayerOption[];
  disabled?: boolean;
};

export function MotmBallotForm({ action, options, disabled = false }: Props) {
  const [firstChoice, setFirstChoice] = useState("");
  const [secondChoice, setSecondChoice] = useState("");
  const [thirdChoice, setThirdChoice] = useState("");
  const [dodChoice, setDodChoice] = useState("");

  const disabledIds = useMemo(
    () => new Set([firstChoice, secondChoice, thirdChoice, dodChoice].filter(Boolean)),
    [firstChoice, secondChoice, thirdChoice, dodChoice],
  );

  const optionList = options.map((option) => ({
    ...option,
    isSelected: disabledIds.has(option.id),
  }));

  return (
    <form action={action} className="grid gap-3 md:grid-cols-3">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">
          First choice (3 pts)
        </label>
        <select
          name="firstChoice"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={firstChoice}
          onChange={(event) => setFirstChoice(event.target.value)}
          required
          disabled={disabled}
        >
          <option value="" disabled>
            Select player
          </option>
          {optionList.map((player) => (
            <option
              key={player.id}
              value={player.id}
              disabled={player.isSelected && player.id !== firstChoice}
            >
              {player.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">
          Second choice (2 pts)
        </label>
        <select
          name="secondChoice"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={secondChoice}
          onChange={(event) => setSecondChoice(event.target.value)}
          required
          disabled={disabled}
        >
          <option value="" disabled>
            Select player
          </option>
          {optionList.map((player) => (
            <option
              key={player.id}
              value={player.id}
              disabled={player.isSelected && player.id !== secondChoice}
            >
              {player.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">
          Third choice (1 pt)
        </label>
        <select
          name="thirdChoice"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={thirdChoice}
          onChange={(event) => setThirdChoice(event.target.value)}
          required
          disabled={disabled}
        >
          <option value="" disabled>
            Select player
          </option>
          {optionList.map((player) => (
            <option
              key={player.id}
              value={player.id}
              disabled={player.isSelected && player.id !== thirdChoice}
            >
              {player.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1 md:col-span-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Dick of the day (1 pt)
        </label>
        <select
          name="dodChoice"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={dodChoice}
          onChange={(event) => setDodChoice(event.target.value)}
          required
          disabled={disabled}
        >
          <option value="" disabled>
            Select player
          </option>
          {optionList.map((player) => (
            <option
              key={player.id}
              value={player.id}
              disabled={player.isSelected && player.id !== dodChoice}
            >
              {player.name}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-3 flex justify-end">
        <Button type="submit" disabled={disabled}>
          Submit vote
        </Button>
      </div>
    </form>
  );
}
