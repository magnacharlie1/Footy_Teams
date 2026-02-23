import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { LeagueMetricSelect } from "@/components/league-metric-select";
import { PlayerMetricChart } from "@/components/player-metric-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { safeDisplayName } from "@/lib/player-name";

type Props = {
  params: Promise<{ groupId: string; playerId: string }>;
  searchParams?: Promise<{ metric?: string }>;
};

const metricOptions = [
  {
    value: "totalPoints",
    label: "Total points",
    description: "3 for a win, 1 for a draw, plus 3 for each MoTM.",
  },
  {
    value: "weightedPoints",
    label: "Weighted points",
    description: "Average total points per session across all sessions played.",
  },
  {
    value: "totalWinPoints",
    label: "Total win points",
    description: "3 for a win, 1 for a draw, 0 for a loss across all sessions.",
  },
  {
    value: "weightedWinPoints",
    label: "Weighted win points",
    description: "Average win points per session across all sessions played.",
  },
  {
    value: "goalDiff",
    label: "Goal difference",
    description: "Total goal difference across all fixtures played.",
  },
  {
    value: "motmPoints",
    label: "MoTM points",
    description: "1 point for each session you finish top of the MoTM vote.",
  },
  {
    value: "dodPoints",
    label: "Dick of the day points",
    description: "1 point for each session you finish top of the Dick of the Day vote.",
  },
];

export default async function PlayerPage({ params, searchParams }: Props) {
  const { groupId, playerId } = await params;
  const { metric } = (await searchParams) ?? {};
  const selectedMetric = metricOptions.some((option) => option.value === metric)
    ? (metric as (typeof metricOptions)[number]["value"])
    : "totalPoints";

  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();

  const player = await prisma.groupPlayer.findFirst({
    where: { id: playerId, groupId },
  });
  if (!player) notFound();

  const stats = await prisma.sessionStat.findMany({
    where: { groupPlayerId: playerId, session: { groupId } },
    select: {
      sessionId: true,
      winPoints: true,
      session: { select: { sessionDate: true, createdAt: true } },
    },
  });

  const sessionsWithTeams = await prisma.matchSession.findMany({
    where: {
      groupId,
      teams: {
        some: {
          assignments: { some: { groupPlayerId: playerId } },
        },
      },
    },
    select: {
      id: true,
      fixtures: { select: { teamAId: true, teamBId: true, teamAScore: true, teamBScore: true } },
      teams: {
        include: {
          assignments: { select: { groupPlayerId: true, teamId: true } },
        },
      },
    },
  });

  const goalDiffBySession = new Map<string, number>();
  for (const sessionEntry of sessionsWithTeams) {
    let playerTeamId: string | null = null;
    for (const team of sessionEntry.teams) {
      if (team.assignments.some((a) => a.groupPlayerId === playerId)) {
        playerTeamId = team.id;
        break;
      }
    }
    if (!playerTeamId) continue;

    for (const fixture of sessionEntry.fixtures) {
      const scoreA = fixture.teamAScore ?? 0;
      const scoreB = fixture.teamBScore ?? 0;
      if (fixture.teamAId === playerTeamId) {
        goalDiffBySession.set(
          sessionEntry.id,
          (goalDiffBySession.get(sessionEntry.id) ?? 0) + (scoreA - scoreB),
        );
      } else if (fixture.teamBId === playerTeamId) {
        goalDiffBySession.set(
          sessionEntry.id,
          (goalDiffBySession.get(sessionEntry.id) ?? 0) + (scoreB - scoreA),
        );
      }
    }
  }

  const motmVotes = await prisma.motmVote.findMany({
    where: { session: { groupId } },
    select: { sessionId: true, votedGroupPlayerId: true, points: true },
  });
  const dodVotes = await prisma.dickOfDayVote.findMany({
    where: { session: { groupId } },
    select: { sessionId: true, votedGroupPlayerId: true, points: true },
  });

  const pointsBySession = new Map<string, Map<string, number>>();
  for (const vote of motmVotes) {
    const sessionPoints = pointsBySession.get(vote.sessionId) ?? new Map<string, number>();
    sessionPoints.set(
      vote.votedGroupPlayerId,
      (sessionPoints.get(vote.votedGroupPlayerId) ?? 0) + vote.points,
    );
    pointsBySession.set(vote.sessionId, sessionPoints);
  }

  const winnersBySession = new Map<string, Set<string>>();
  for (const [sessionId, sessionPoints] of pointsBySession.entries()) {
    let max = 0;
    for (const value of sessionPoints.values()) {
      if (value > max) max = value;
    }
    if (max === 0) continue;
    const winners = new Set<string>();
    for (const [id, value] of sessionPoints.entries()) {
      if (value === max) winners.add(id);
    }
    winnersBySession.set(sessionId, winners);
  }

  const dodPointsBySession = new Map<string, Map<string, number>>();
  for (const vote of dodVotes) {
    const sessionPoints = dodPointsBySession.get(vote.sessionId) ?? new Map<string, number>();
    sessionPoints.set(
      vote.votedGroupPlayerId,
      (sessionPoints.get(vote.votedGroupPlayerId) ?? 0) + vote.points,
    );
    dodPointsBySession.set(vote.sessionId, sessionPoints);
  }

  const dodWinnersBySession = new Map<string, Set<string>>();
  for (const [sessionId, sessionPoints] of dodPointsBySession.entries()) {
    let max = 0;
    for (const value of sessionPoints.values()) {
      if (value > max) max = value;
    }
    if (max === 0) continue;
    const winners = new Set<string>();
    for (const [id, value] of sessionPoints.entries()) {
      if (value === max) winners.add(id);
    }
    dodWinnersBySession.set(sessionId, winners);
  }

  const orderedStats = [...stats].sort((a, b) => {
    const dateDiff = a.session.sessionDate.getTime() - b.session.sessionDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.session.createdAt.getTime() - b.session.createdAt.getTime();
  });

  let cumulativeTotal = 0;
  let cumulativeWin = 0;
  let cumulativeMotm = 0;
  let cumulativeDod = 0;
  let cumulativeGoalDiff = 0;
  let sessionCount = 0;

  const data = orderedStats.map((stat) => {
    sessionCount += 1;
    cumulativeTotal += stat.winPoints;
    cumulativeWin += stat.winPoints;
    cumulativeGoalDiff += goalDiffBySession.get(stat.sessionId) ?? 0;
    if (winnersBySession.get(stat.sessionId)?.has(playerId)) {
      cumulativeMotm += 1;
      cumulativeTotal += 3;
    }
    if (dodWinnersBySession.get(stat.sessionId)?.has(playerId)) {
      cumulativeDod += 1;
    }

    const value =
      selectedMetric === "totalPoints"
        ? cumulativeTotal
        : selectedMetric === "weightedPoints"
          ? cumulativeTotal / sessionCount
          : selectedMetric === "totalWinPoints"
            ? cumulativeWin
            : selectedMetric === "goalDiff"
              ? cumulativeGoalDiff
            : selectedMetric === "motmPoints"
              ? cumulativeMotm
              : selectedMetric === "dodPoints"
                ? cumulativeDod
                : cumulativeWin / sessionCount;

    return { date: stat.session.sessionDate.toISOString(), value };
  });

  const metricMeta = metricOptions.find((option) => option.value === selectedMetric);
  const yLabel = metricMeta?.label ?? "Points";

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Player performance</p>
        <h1 className="text-3xl font-semibold">
          {safeDisplayName(player.displayName)}
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Progress over time</CardTitle>
            <p className="text-xs text-muted-foreground">
              Sessions on the x-axis. Metric totals update each session.
            </p>
          </div>
          <LeagueMetricSelect value={selectedMetric} options={metricOptions} />
        </CardHeader>
        <CardContent className="space-y-4">
          {data.length ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <PlayerMetricChart data={data} yLabel={yLabel} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No sessions yet. Add fixtures to start tracking progress.
            </div>
          )}
          {metricMeta?.description ? (
            <p className="text-sm text-muted-foreground">{metricMeta.description}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
