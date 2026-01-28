'use client';

import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, useTransition } from "react";

import { autoBalanceTeams, assignPositionSlots, type TeamPlayer } from "@/lib/team-balance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlayerInput = TeamPlayer & { teamId: string | null; positionSlot?: number };

type TeamInfo = { id: string; label: string; index: number; kitType: string };

type Props = {
  canEdit: boolean;
  numTeams: 2 | 4;
  teams: TeamInfo[];
  players: PlayerInput[];
  saveAction: (input: {
    assignments: { playerId: string; teamId: string; positionSlot?: number | null }[];
    publish?: boolean;
  }) => Promise<void>;
};

type AssignmentsState = Record<string, string>; // playerId -> containerId

const BENCH_ID = "bench";

export function TeamBuilder({
  canEdit,
  numTeams,
  teams,
  players,
  saveAction,
}: Props) {
  const [assignments, setAssignments] = useState<AssignmentsState>(() => {
    const next: AssignmentsState = {};
    for (const player of players) {
      next[player.id] = player.teamId ?? BENCH_ID;
    }
    return next;
  });
  const [positions, setPositions] = useState<Record<string, number | undefined>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const itemsByContainer = useMemo(
    () => buildContainers(assignments, positions, players, teams),
    [assignments, positions, players, teams],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canEdit) return;
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const containerId = getContainerId(overId, itemsByContainer);
    if (!containerId) return;
    if (assignments[activeId] === containerId) return;
    setAssignments((prev) => ({ ...prev, [activeId]: containerId }));
    setPositions((prev) => ({ ...prev, [activeId]: undefined }));
  };

  const handleAutoBalance = () => {
    if (!canEdit) return;
    const orderedTeams = [...teams].sort((a, b) => a.index - b.index);
    const allPlayers: TeamPlayer[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      weightedPoints: p.weightedPoints ?? 0,
    }));

    const balanced = autoBalanceTeams(allPlayers, numTeams);
    const next: AssignmentsState = {};
    const nextPositions: Record<string, number> = {};

    for (const team of balanced) {
      const teamId = orderedTeams.find((t) => t.index === team.teamIndex)?.id;
      if (!teamId) continue;
      const slotted = assignPositionSlots(team.players);
      slotted.forEach((player, idx) => {
        next[player.id] = teamId;
        nextPositions[player.id] = idx + 1;
      });
    }

    const everyoneCovered = { ...next };
    for (const player of players) {
      if (!everyoneCovered[player.id]) {
        everyoneCovered[player.id] = BENCH_ID;
      }
    }

    setPositions(nextPositions);
    setAssignments(everyoneCovered);
  };

  const handleSave = (publish: boolean) => {
    if (!canEdit) return;
    startTransition(async () => {
      const containers = buildContainers(assignments, positions, players, teams);
      const payload = teams.flatMap((team) =>
        (containers[team.id] ?? []).map((player, idx) => ({
          playerId: player.id,
          teamId: team.id,
          positionSlot: positions[player.id] ?? idx + 1,
        })),
      );

      const filtered = payload.filter((p) => p.teamId);
      await saveAction({
        assignments: filtered,
        publish,
      });
      setMessage(publish ? "Teams published" : "Draft saved");
    });
  };

  const bibsTeamId = teams.find((team) => team.kitType === "BIBS")?.id;
  const nonBibsTeamId = teams.find((team) => team.kitType === "NON_BIBS")?.id;

  const assignToTeam = (playerId: string, teamId: string) => {
    if (!canEdit) return;
    setAssignments((prev) => ({ ...prev, [playerId]: teamId }));
    setPositions((prev) => ({ ...prev, [playerId]: undefined }));
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Team builder</p>
          <h1 className="text-2xl font-semibold">Manual or auto-balance</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleAutoBalance} disabled={!canEdit}>
            Auto-generate
          </Button>
          <Button disabled={isPending || !canEdit} onClick={() => handleSave(false)}>
            Save draft
          </Button>
          <Button
            disabled={isPending || !canEdit}
            variant="default"
            onClick={() => handleSave(true)}
          >
            Publish teams
          </Button>
        </div>
      </div>
      {!canEdit ? (
        <div className="text-sm text-muted-foreground">
          Read-only: only admins or delegated editors can change teams.
        </div>
      ) : null}
      {message && <div className="text-sm text-emerald-600">{message}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Drag players into teams</CardTitle>
          <p className="text-sm text-muted-foreground">
            Uneven teams are allowed. Auto mode uses weighted points and greedy balancing.
          </p>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToFirstScrollableAncestor]}
          >
            <div className="space-y-4">
              <DroppableColumn
                id={BENCH_ID}
                title="Unassigned"
                subtitle="Drag to a team"
                items={itemsByContainer[BENCH_ID] ?? []}
                onAssign={assignToTeam}
                bibsTeamId={bibsTeamId}
                nonBibsTeamId={nonBibsTeamId}
                canEdit={canEdit}
                itemsClassName="grid gap-2 sm:grid-cols-2"
              />
              <div className="grid gap-4 md:grid-cols-2">
                {teams
                  .sort((a, b) => a.index - b.index)
                  .map((team) => (
                    <DroppableColumn
                      key={team.id}
                      id={team.id}
                      title={team.label}
                      subtitle={`Team ${team.index}`}
                      items={itemsByContainer[team.id] ?? []}
                      onAssign={assignToTeam}
                      bibsTeamId={bibsTeamId}
                      nonBibsTeamId={nonBibsTeamId}
                      canEdit={canEdit}
                    />
                  ))}
              </div>
            </div>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}

function buildContainers(
  assignments: AssignmentsState,
  positions: Record<string, number | undefined>,
  players: PlayerInput[],
  teams: { id: string; label: string; index: number }[],
) {
  const base: Record<string, PlayerInput[]> = {};
  for (const team of teams) {
    base[team.id] = [];
  }
  base[BENCH_ID] = [];

  for (const player of players) {
    const bucket = assignments[player.id] ?? BENCH_ID;
    base[bucket]?.push({ ...player, positionSlot: positions[player.id] });
  }

  for (const key of Object.keys(base)) {
    base[key].sort((a, b) => {
      const posA = positions[a.id] ?? Number.MAX_SAFE_INTEGER;
      const posB = positions[b.id] ?? Number.MAX_SAFE_INTEGER;
      if (posA === posB) return a.name.localeCompare(b.name);
      return posA - posB;
    });
  }

  return base;
}

function getContainerId(
  overId: string,
  itemsByContainer: Record<string, PlayerInput[]>,
) {
  if (overId in itemsByContainer) return overId;
  for (const [containerId, items] of Object.entries(itemsByContainer)) {
    if (items.some((item) => item.id === overId)) {
      return containerId;
    }
  }
  return null;
}

function DroppableColumn({
  id,
  title,
  subtitle,
  items,
  onAssign,
  bibsTeamId,
  nonBibsTeamId,
  canEdit,
  itemsClassName,
}: {
  id: string;
  title: string;
  subtitle?: string;
  items: PlayerInput[];
  onAssign: (playerId: string, teamId: string) => void;
  bibsTeamId?: string;
  nonBibsTeamId?: string;
  canEdit: boolean;
  itemsClassName?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !canEdit,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-lg border border-dashed p-3 ${
        isOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className={itemsClassName ?? "space-y-2"}>
          {items.map((player) => (
              <DraggableCard
                key={player.id}
                player={player}
                onAssign={onAssign}
                bibsTeamId={bibsTeamId}
                nonBibsTeamId={nonBibsTeamId}
                canEdit={canEdit}
              />
            ))}
          {items.length === 0 && (
            <div className="text-xs text-muted-foreground">Drop players here</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableCard({
  player,
  onAssign,
  bibsTeamId,
  nonBibsTeamId,
  canEdit,
}: {
  player: PlayerInput;
  onAssign: (playerId: string, teamId: string) => void;
  bibsTeamId?: string;
  nonBibsTeamId?: string;
  canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
    disabled: !canEdit,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-sm shadow-sm ${
        isDragging ? "opacity-70" : ""
      }`}
      {...attributes}
      {...(canEdit ? listeners : {})}
    >
      <div className="flex items-center gap-2">
        <span>{player.name}</span>
        <Badge variant="outline">{player.weightedPoints.toFixed(1)}</Badge>
      </div>
      {canEdit ? (
        <div className="flex items-center gap-1">
          {bibsTeamId ? (
            <button
              type="button"
              className="rounded-full bg-yellow-300 px-2 py-1 text-[11px] font-semibold text-yellow-900"
              onClick={() => onAssign(player.id, bibsTeamId)}
            >
              Bib
            </button>
          ) : null}
          {nonBibsTeamId ? (
            <button
              type="button"
              className="rounded-full bg-blue-500 px-2 py-1 text-[11px] font-semibold text-white"
              onClick={() => onAssign(player.id, nonBibsTeamId)}
            >
              Non-bib
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
