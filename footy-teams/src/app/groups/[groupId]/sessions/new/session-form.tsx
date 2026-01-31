"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  members: { id: string; name: string }[];
  defaultStartTimeHHMM?: string | null;
  timezoneLabel?: string | null;
};

function normalizeLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function SessionForm({ action, members, defaultStartTimeHHMM, timezoneLabel }: Props) {
  const [paste, setPaste] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberQuery, setMemberQuery] = useState("");

  const players = useMemo(() => normalizeLines(paste), [paste]);
  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => member.name.toLowerCase().includes(query));
  }, [memberQuery, members]);

  const addPlayer = () => {
    const name = playerName.trim();
    if (!name) return;
    setPaste((prev) => (prev ? `${prev}\n${name}` : name));
    setPlayerName("");
  };

  const removePlayer = (index: number) => {
    setPaste(players.filter((_, idx) => idx !== index).join("\n"));
  };

  return (
    <form className="space-y-4" action={action}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sessionDate">Date</Label>
          <Input id="sessionDate" name="sessionDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numTeams">Teams (2 or 4)</Label>
          <Input id="numTeams" name="numTeams" type="number" min={2} max={4} step={2} />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sessionTime">Start time</Label>
          <Input
            id="sessionTime"
            name="sessionTime"
            type="time"
            required
            defaultValue={defaultStartTimeHHMM ?? ""}
          />
          {timezoneLabel ? (
            <p className="text-xs text-muted-foreground">Times shown in {timezoneLabel}.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paste">Paste WhatsApp poll/list</Label>
        <Textarea
          id="paste"
          name="paste"
          placeholder="Paste WhatsApp poll / list here"
          className="min-h-[160px]"
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Add members</p>
            <p className="text-xs text-muted-foreground">
              Select from your group members instead of pasting names.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              if (selectedMembers.size === members.length) {
                setSelectedMembers(new Set());
              } else {
                setSelectedMembers(new Set(members.map((member) => member.id)));
              }
            }}
          >
            {selectedMembers.size === members.length ? "Clear all" : "Select all"}
          </Button>
        </div>
        <Input
          type="search"
          placeholder="Search members"
          value={memberQuery}
          onChange={(event) => setMemberQuery(event.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredMembers.map((member) => {
            const checked = selectedMembers.has(member.id);
            return (
              <label
                key={member.id}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="memberUserIds"
                  value={member.id}
                  checked={checked}
                  onChange={(event) => {
                    const next = new Set(selectedMembers);
                    if (event.target.checked) {
                      next.add(member.id);
                    } else {
                      next.delete(member.id);
                    }
                    setSelectedMembers(next);
                  }}
                />
                <span>{member.name}</span>
              </label>
            );
          })}
          {members.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No members yet. Add members in the group page.
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No matches.</div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          Add players individually (one per line will be saved).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="playerName"
            name="playerName"
            placeholder="Add a player name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addPlayer();
              }
            }}
          />
          <Button type="button" onClick={addPlayer}>
            Add player
          </Button>
        </div>
        {players.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {players.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <span>{name}</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-destructive"
                  onClick={() => removePlayer(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit">Create session</Button>
      </div>
    </form>
  );
}
