import { notFound, redirect } from "next/navigation";
import { performance } from "node:perf_hooks";

import { auth } from "@/auth";
import { TeamBuilder } from "./team-builder";
import { prisma } from "@/lib/prisma";
import { aggregateLeagueStats, computeSessionStats } from "@/lib/scoring";
import { saveTeamsAction } from "./actions";
import { safeDisplayName } from "@/lib/player-name";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

export default async function TeamBuilderPage({ params }: Props) {
  const startedAt = performance.now();
  let stepStartedAt = startedAt;
  const stepDurations: Record<string, number> = {};
  const markStep = (label: string) => {
    const now = performance.now();
    stepDurations[label] = Math.round(now - stepStartedAt);
    stepStartedAt = now;
  };

  const { groupId, sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  markStep("auth");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();
  markStep("membership");

  const matchSession = await prisma.matchSession.findUnique({
    where: { id: sessionId },
    include: {
      teamEditorMember: true,
      participants: { include: { player: true } },
      teams: {
        orderBy: { index: "asc" },
        include: {
          assignments: true,
        },
      },
    },
  });

  if (!matchSession) notFound();
  markStep("session_lookup");

  const history = await prisma.matchSession.findMany({
    where: { groupId },
    include: {
      fixtures: true,
      teams: { include: { assignments: true } },
    },
  });
  markStep("history");

  const sessionStats = history.flatMap((s) =>
    computeSessionStats({
      sessionId: s.id,
      fixtures: s.fixtures.map((f) => ({
        teamAId: f.teamAId,
        teamBId: f.teamBId,
        teamAScore: f.teamAScore,
        teamBScore: f.teamBScore,
      })),
      assignments: s.teams.flatMap((t) =>
        t.assignments.map((a) => ({
          playerId: a.groupPlayerId,
          teamId: a.teamId,
        })),
      ),
    }),
  );
  markStep("session_stats");

  const leagueStats = aggregateLeagueStats(sessionStats);
  markStep("league_stats");
  const weightedLookup = new Map<string, number>(
    leagueStats.map((stat) => [stat.playerId, stat.weightedPoints]),
  );

  const players = matchSession.participants.map((p) => {
    const currentTeamId = matchSession.teams.find((t) =>
      t.assignments.some((a) => a.groupPlayerId === p.groupPlayerId),
    )?.id;
    return {
      id: p.groupPlayerId,
      name: safeDisplayName(p.player.displayName),
      weightedPoints: weightedLookup.get(p.groupPlayerId) ?? 0,
      teamId: currentTeamId ?? null,
    };
  });
  markStep("players");

  const canEditTeams =
    membership.role === "ADMIN" ||
    membership.canEditTeams ||
    membership.id === matchSession.teamEditorMemberId;

  const saveAction = saveTeamsAction.bind(null, sessionId, groupId);

  const durationMs = Math.round(performance.now() - startedAt);
  console.info(
    `[perf] teamBuilderPage session=${sessionId} total=${durationMs}ms steps=${JSON.stringify(
      stepDurations,
    )}`,
  );

  return (
    <TeamBuilder
      canEdit={canEditTeams}
      numTeams={matchSession.numTeams as 2 | 4}
      teams={matchSession.teams.map((t) => ({
        id: t.id,
        label: t.label,
        index: t.index,
        kitType: t.kitType,
      }))}
      players={players}
      saveAction={saveAction}
    />
  );
}
