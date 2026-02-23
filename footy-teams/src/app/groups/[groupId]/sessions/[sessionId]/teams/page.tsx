import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

import { auth } from "@/auth";
import { TeamBuilder } from "./team-builder";
import { prisma } from "@/lib/prisma";
import { aggregateLeagueStats, computePowerRating, computeSessionStats } from "@/lib/scoring";
import { saveTeamsAction } from "./actions";
import { safeDisplayName } from "@/lib/player-name";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

async function loadGroupHistoryStats(groupId: string) {
  const cacheKey = `group-history-${groupId}`;
  const cached = unstable_cache(
    async () => {
      const history = await prisma.matchSession.findMany({
        where: { groupId },
        include: {
          fixtures: {
            select: {
              teamAId: true,
              teamBId: true,
              teamAScore: true,
              teamBScore: true,
            },
          },
          teams: {
            include: {
              assignments: { select: { groupPlayerId: true, teamId: true } },
            },
          },
        },
      });

      const motmVotes = await prisma.motmVote.findMany({
        where: { session: { groupId } },
        select: { sessionId: true, votedGroupPlayerId: true, points: true },
      });

      const pointsBySession = new Map<string, Map<string, number>>();
      const motmTotalPointsByPlayer = new Map<string, number>();
      for (const vote of motmVotes) {
        const sessionPoints = pointsBySession.get(vote.sessionId) ?? new Map<string, number>();
        sessionPoints.set(
          vote.votedGroupPlayerId,
          (sessionPoints.get(vote.votedGroupPlayerId) ?? 0) + vote.points,
        );
        pointsBySession.set(vote.sessionId, sessionPoints);
        motmTotalPointsByPlayer.set(
          vote.votedGroupPlayerId,
          (motmTotalPointsByPlayer.get(vote.votedGroupPlayerId) ?? 0) + vote.points,
        );
      }

      const motmWinnersBySession = new Map<string, Set<string>>();
      for (const [sessionId, sessionPoints] of pointsBySession.entries()) {
        let max = 0;
        for (const value of sessionPoints.values()) {
          if (value > max) max = value;
        }
        if (max === 0) continue;
        const winners = new Set<string>();
        for (const [playerId, value] of sessionPoints.entries()) {
          if (value === max) winners.add(playerId);
        }
        motmWinnersBySession.set(sessionId, winners);
      }

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
        }).map((stat) => ({
          ...stat,
          totalPoints:
            stat.totalPoints +
            (motmWinnersBySession.get(stat.sessionId)?.has(stat.playerId) ? 3 : 0),
        })),
      );

      const goalDiffByPlayer = new Map<string, number>();
      for (const session of history) {
        const playersByTeam = new Map<string, string[]>();
        for (const team of session.teams) {
          for (const assignment of team.assignments) {
            const list = playersByTeam.get(assignment.teamId) ?? [];
            list.push(assignment.groupPlayerId);
            playersByTeam.set(assignment.teamId, list);
          }
        }

        for (const fixture of session.fixtures) {
          const scoreA = fixture.teamAScore ?? 0;
          const scoreB = fixture.teamBScore ?? 0;
          const diffA = scoreA - scoreB;
          const diffB = scoreB - scoreA;

          const teamAPlayers = playersByTeam.get(fixture.teamAId) ?? [];
          for (const playerId of teamAPlayers) {
            goalDiffByPlayer.set(playerId, (goalDiffByPlayer.get(playerId) ?? 0) + diffA);
          }

          const teamBPlayers = playersByTeam.get(fixture.teamBId) ?? [];
          for (const playerId of teamBPlayers) {
            goalDiffByPlayer.set(playerId, (goalDiffByPlayer.get(playerId) ?? 0) + diffB);
          }
        }
      }

      const leagueStats = aggregateLeagueStats(sessionStats);
      return {
        weightedLookupEntries: leagueStats.map((stat) => [
          stat.playerId,
          computePowerRating({
            weightedPoints: stat.weightedPoints,
            goalDiff: goalDiffByPlayer.get(stat.playerId) ?? 0,
            motmPoints: motmTotalPointsByPlayer.get(stat.playerId) ?? 0,
            sessionsPlayed: stat.sessionsPlayed,
          }),
        ]) as Array<[string, number]>,
      };
    },
    [cacheKey],
    { tags: [cacheKey] },
  );

  return cached();
}

export default async function TeamBuilderPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [membership, matchSession, historyStats] = await Promise.all([
    prisma.groupMember.findFirst({
      where: { groupId, userId: session.user.id, isActive: true },
      select: { id: true, role: true, canEditTeams: true },
    }),
    prisma.matchSession.findUnique({
      where: { id: sessionId },
      include: {
        teamEditorMember: true,
        participants: {
          include: {
            player: { select: { displayName: true } },
          },
        },
        teams: {
          orderBy: { index: "asc" },
          include: {
            assignments: { select: { groupPlayerId: true, teamId: true } },
          },
        },
      },
    }),
    loadGroupHistoryStats(groupId),
  ]);
  if (!membership) notFound();
  if (!matchSession) notFound();

  const weightedLookup = new Map<string, number>(historyStats.weightedLookupEntries);

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
  const canEditTeams =
    membership.role === "ADMIN" ||
    membership.canEditTeams ||
    membership.id === matchSession.teamEditorMemberId;

  const saveAction = saveTeamsAction.bind(null, sessionId, groupId);

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
