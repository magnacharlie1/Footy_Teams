"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeDisplayName } from "@/lib/player-name";

type Player = {
  displayName: string;
  nickname: string | null;
  jerseyNumber: number | null;
};

type Assignment = {
  id: string;
  player: Player;
};

type Team = {
  id: string;
  label: string;
  kitType: string;
  index: number;
  assignments: Assignment[];
};

type Props = {
  groupName: string;
  sessionId: string;
  sessionDate: string;
  status: string;
  teams: Team[];
  maxJerseyNumber: number;
};

type FormationOption = {
  label: string;
  rows: number[];
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getFormationOptions(teamSize: number): FormationOption[] {
  const options: Record<number, FormationOption[]> = {
    4: [
      { label: "2-1-1", rows: [2, 1, 1] },
      { label: "1-2-1", rows: [1, 2, 1] },
    ],
    5: [
      { label: "2-2-1", rows: [2, 2, 1] },
      { label: "1-2-2", rows: [1, 2, 2] },
    ],
    6: [
      { label: "2-2-2", rows: [2, 2, 2] },
      { label: "3-2-1", rows: [3, 2, 1] },
    ],
    7: [
      { label: "2-3-2", rows: [2, 3, 2] },
      { label: "3-2-2", rows: [3, 2, 2] },
    ],
    8: [
      { label: "3-3-2", rows: [3, 3, 2] },
      { label: "2-3-3", rows: [2, 3, 3] },
    ],
    9: [
      { label: "3-3-3", rows: [3, 3, 3] },
      { label: "4-3-2", rows: [4, 3, 2] },
    ],
    10: [
      { label: "4-4-2", rows: [4, 4, 2] },
      { label: "3-4-3", rows: [3, 4, 3] },
    ],
  };

  if (options[teamSize]) {
    return options[teamSize];
  }

  const half = Math.ceil(teamSize / 2);
  return [{ label: `${half}-${teamSize - half}`, rows: [half, teamSize - half] }];
}

function shuffleWithRandom<T>(items: T[], rand: () => number) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function formatShirtName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { first: "PLAYER", last: "" };
  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? "PLAYER";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return { first: first.toUpperCase(), last: last.toUpperCase() };
}

function getKitColors(kitType: string) {
  if (kitType === "BIBS") {
    return { shirt: "#fde047", number: "#111827" };
  }
  if (kitType === "NON_BIBS") {
    return { shirt: "#3b82f6", number: "#111827" };
  }
  return { shirt: "#e2e8f0", number: "#111827" };
}

function getKitColorClass(kitType: string) {
  if (kitType === "BIBS") {
    return "text-yellow-300";
  }
  if (kitType === "NON_BIBS") {
    return "text-blue-500";
  }
  return "text-slate-200";
}

function getKitTextClass(kitType: string) {
  if (kitType === "BIBS") {
    return "text-black";
  }
  if (kitType === "NON_BIBS") {
    return "text-black";
  }
  return "text-black";
}

function buildTeamNumbers(
  assignments: { id: string; player: { jerseyNumber: number | null } }[],
  seedKey: string,
  maxNumber: number,
) {
  const rand = createRandom(hashString(seedKey));
  const map = new Map<string, number>();
  const used = new Set<number>();

  for (const assignment of assignments) {
    const number = assignment.player.jerseyNumber ?? null;
    if (number && number >= 1 && number <= 999 && !used.has(number)) {
      map.set(assignment.id, number);
      used.add(number);
    }
  }

  const safeMax = Math.min(Math.max(1, maxNumber), 999);
  const available = Array.from({ length: safeMax }, (_, idx) => idx + 1).filter(
    (num) => !used.has(num),
  );
  const shuffled = shuffleWithRandom(available, rand);

  for (const assignment of assignments) {
    if (!map.has(assignment.id)) {
      const next = shuffled.shift();
      if (!next) break;
      map.set(assignment.id, next);
    }
  }

  return map;
}

function resolveDisplayName(player: Player, showNicknames: boolean) {
  if (!showNicknames) return safeDisplayName(player.displayName);
  const nickname = player.nickname?.trim();
  return safeDisplayName(nickname || player.displayName);
}

function TeamsGrid({
  teams,
  sessionId,
  showNicknames,
  maxJerseyNumber,
  compact,
  exportMode,
}: {
  teams: Team[];
  sessionId: string;
  showNicknames: boolean;
  maxJerseyNumber: number;
  compact?: boolean;
  exportMode?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-1" : "md:grid-cols-2"}`}>
      {teams.map((team) => {
        const teamNumbers = buildTeamNumbers(
          team.assignments,
          `${sessionId}-${team.id}`,
          maxJerseyNumber,
        );
        const colors = getKitColors(team.kitType);
        const kitColorClass = getKitColorClass(team.kitType);
        const kitTextClass = getKitTextClass(team.kitType);
        return (
          <div key={team.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">
                {team.label} ({team.kitType})
              </div>
              <Badge variant="outline"># {team.index}</Badge>
            </div>
            {team.assignments.length === 0 ? (
              <div className="mt-2 text-sm text-muted-foreground">No players yet</div>
            ) : (
              <div className="mt-3 space-y-3 rounded-lg bg-emerald-50/60 p-3">
                {(() => {
                  const rand = createRandom(hashString(`${sessionId}-${team.id}`));
                  const options = getFormationOptions(team.assignments.length);
                  const formation = options[Math.floor(rand() * options.length)];
                  const shuffled = shuffleWithRandom(team.assignments, rand);

                  const rows = formation.rows.map((count) => shuffled.splice(0, count));
                  return (
                    <div className="space-y-3">
                      {rows.map((row, rowIndex) => (
                        <div
                          key={`${team.id}-row-${rowIndex}`}
                          className="flex justify-center gap-6"
                        >
                          {row.map((assignment) => {
                            const displayName = resolveDisplayName(
                              assignment.player,
                              showNicknames,
                            );
                            const shirtName = formatShirtName(displayName);
                            const shirtNumber = teamNumbers.get(assignment.id) ?? 0;
                            return (
                              <div
                                key={assignment.id}
                                className="flex flex-col items-center gap-1"
                              >
                                <div className="relative h-20 w-20">
                                  <svg
                                    viewBox="0 -7.72 127.24603 127.24603"
                                    className={`h-full w-full ${
                                      exportMode ? "" : kitColorClass
                                    }`}
                                    style={exportMode ? { color: colors.shirt } : undefined}
                                    aria-hidden="true"
                                    focusable="false"
                                  >
                                    <path
                                      className="fill-current"
                                      style={exportMode ? { fill: colors.shirt } : undefined}
                                      d="m32 109c-1.4 0-2.5-1.1-2.5-2.5v-62.6l-7 5.9c-.1.1-.2.1-.2.2-1 .6-2.1 1-3.2 1-2 0-3.8-1-4.9-2.6l-10.7-16.1c-1.8-2.7-1-6.3 1.7-8.1l29.7-20.7c.2-.1.4-.3.7-.3.1 0 2.8-.9 6.6-1h3.1c.7 0 1.4.3 1.8.8.5.5.7 1.2.6 1.9 0 .1 0 .3-.1.4.2 7.5 8.1 14.5 16.5 14.5s16.3-7 16.5-14.5c0-.1 0-.3-.1-.4-.1-.7.2-1.4.6-1.9s1.1-.8 1.8-.8h6.1c2.4 0 4.3 1.1 4.5 1.2.1 0 .1.1.2.1l28.7 20.7c2.6 1.7 3.4 5.4 1.6 8.1l-10.7 15.2c-1 1.6-2.9 2.6-4.9 2.6-1.2 0-2.3-.3-3.2-1-.1 0-.1-.1-0.2-.2l-6.4-5.3-.2 62.9c0 1.4-1.1 2.5-2.5 2.5h-63.9z"
                                    />
                                    <path
                                      className="fill-black/20"
                                      style={exportMode ? { fill: "rgba(0,0,0,0.2)" } : undefined}
                                      d="m89.1 5c1.8 0 3.1.9 3.1.9l28.7 20.6c1.6 1 2 3.1.9 4.7l-10.7 15.1c-0.6 1-1.7 1.5-2.8 1.5-.6 0-1.3-.2-1.9-.6l-10.5-8.6-.2 68.2h-63.7v-68l-11.2 9.4c-.6.4-1.2.6-1.9.6-1.1 0-2.2-.5-2.8-1.5l-10.6-16.1c-1-1.6-.6-3.6.9-4.7l29.7-20.7s2.4-.8 5.8-.9h3.1v.2.2c0 9 9.1 17.3 19 17.3s19-8.3 19-17.3v-.2-.2h5.9.2c-.1.1 0 .1 0 .1m0-5s-.1 0 0 0h-.2-5.9c-1.4 0-2.7.6-3.7 1.6-.9 1-1.4 2.4-1.3 3.8v.4c-.3 6.1-7.1 11.9-14 11.9s-13.7-5.8-14-11.9v-.4c.1-1.4-.3-2.8-1.3-3.8-.9-1-2.3-1.6-3.7-1.6h-3.1-.1c-4 .1-6.9 1-7.3 1.1-.5.2-.9.4-1.3.7l-29.5 20.6c-3.8 2.6-4.8 7.7-2.3 11.6l10.7 16.1c1.6 2.3 4.2 3.7 7 3.7 1.6 0 3.2-.5 4.6-1.4.2-.1.3-.2.5-.3l2.9-2.5v57.2c0 2.8 2.2 5 5 5h63.8c2.8 0 5-2.2 5-5l.1-57.7 2.3 1.9c.1.1.3.2.4.3 1.4.9 3 1.4 4.6 1.4 2.8 0 5.4-1.4 6.9-3.7l10.6-15 .1-.1c2.5-3.8 1.5-9-2.3-11.5l-28-20.9c-.1-.1-.2-.1-.3-.2-.3-.2-2.6-1.5-5.6-1.5z"
                                    />
                                  </svg>
                                  <div
                                    className={`absolute inset-0 flex items-center justify-center text-[18px] font-black ${
                                      exportMode ? "" : kitTextClass
                                    }`}
                                    style={exportMode ? { color: colors.number } : undefined}
                                  >
                                    {shirtNumber}
                                  </div>
                                </div>
                                <div className="flex flex-col items-center text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                                  <span>{shirtName.first}</span>
                                  {shirtName.last ? <span>{shirtName.last}</span> : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const NICKNAMES_ENABLED = false;

export function SessionTeamsCard({
  groupName,
  sessionId,
  sessionDate,
  status,
  teams,
  maxJerseyNumber,
}: Props) {
  const [showNicknames, setShowNicknames] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const formattedDate = useMemo(
    () => new Date(sessionDate).toLocaleDateString("en-GB"),
    [sessionDate],
  );

  const handleSave = async () => {
    if (!exportRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${groupName}-${formattedDate}-teams.png`.replace(/\s+/g, "-");
      link.href = dataUrl;
      link.click();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Teams</CardTitle>
          <div className="text-xs text-muted-foreground">
            {groupName} - {formattedDate}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {NICKNAMES_ENABLED ? (
            <Button
              type="button"
              size="sm"
              variant={showNicknames ? "default" : "outline"}
              onClick={() => setShowNicknames((current) => !current)}
            >
              {showNicknames ? "Showing nicknames" : "Show nicknames"}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="secondary" onClick={handleSave}>
            {isSaving ? "Saving..." : "Save teams image"}
          </Button>
          <Badge variant="secondary">{status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <TeamsGrid
          teams={teams}
          sessionId={sessionId}
          showNicknames={NICKNAMES_ENABLED ? showNicknames : false}
          maxJerseyNumber={maxJerseyNumber}
        />
      </CardContent>

      <div className="absolute -left-[9999px] top-0" aria-hidden="true">
        <div
          ref={exportRef}
          style={{
            width: "1080px",
            height: "1920px",
            padding: "48px",
            background: "#f8fafc",
            color: "#0f172a",
            fontFamily: "inherit",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "32px", fontWeight: 700 }}>{groupName}</div>
            <div style={{ fontSize: "20px", color: "#475569" }}>{formattedDate}</div>
          </div>
          <TeamsGrid
            teams={teams}
            sessionId={sessionId}
            showNicknames={NICKNAMES_ENABLED ? showNicknames : false}
            maxJerseyNumber={maxJerseyNumber}
            compact
            exportMode
          />
        </div>
      </div>
    </Card>
  );
}
