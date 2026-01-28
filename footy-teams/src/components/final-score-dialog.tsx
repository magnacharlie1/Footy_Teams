"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FixtureSummary = {
  id: string;
  teamA: { label: string };
  teamB: { label: string };
  teamAScore: number;
  teamBScore: number;
};

type Props = {
  fixture: FixtureSummary;
  action: (formData: FormData) => Promise<void>;
};

export function FinalScoreDialog({ fixture, action }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);

  const hasExistingScore = fixture.teamAScore > 0 || fixture.teamBScore > 0;

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          if (hasExistingScore) {
            setConfirmChange(true);
            return;
          }
          setOpen(true);
        }}
      >
        Final Score
      </Button>
      {confirmChange ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-lg">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Change final score?</h2>
              <p className="text-sm text-muted-foreground">
                A score is already saved. Are you sure you want to update it?
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmChange(false);
                  setOpen(true);
                }}
              >
                Yes, change it
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-lg">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Final Score</h2>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to save this final score?
              </p>
            </div>
            <form
              action={action}
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                if (!event.currentTarget.checkValidity()) return;
                setOpen(false);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor={`teamA-${fixture.id}`}>{fixture.teamA.label}</Label>
                <Input
                  id={`teamA-${fixture.id}`}
                  name="teamAScore"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={fixture.teamAScore}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`teamB-${fixture.id}`}>{fixture.teamB.label}</Label>
                <Input
                  id={`teamB-${fixture.id}`}
                  name="teamBScore"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={fixture.teamBScore}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save score</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
