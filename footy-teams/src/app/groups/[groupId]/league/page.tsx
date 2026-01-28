import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { LeagueMetricSelect } from "@/components/league-metric-select";
import { LeagueMetricChart } from "@/components/league-metric-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { aggregateLeagueStats } from "@/lib/scoring";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ metric?: string }>;
};

const metricOptions = [
  { value: "totalPoints", label: "Total points" },
  { value: "weightedPoints", label: "Weighted points" },
  { value: "totalWinPoints", label: "Total win points" },
  { value: "weightedWinPoints", label: "Weighted win points" },
  { value: "motmPoints", label: "MoTM points" },
];

export default async function LeaguePage({ params, searchParams }: Props) {
  const { groupId } = await params;
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

  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });
  if (!group) notFound();

  const sessionStats = await prisma.sessionStat.findMany({
    where: { session: { groupId } },
    select: {
      sessionId: true,
      groupPlayerId: true,
      totalPoints: true,
      winPoints: true,
      session: { select: { sessionDate: true, createdAt: true } },
    },
  });

  const motmVotes = await prisma.motmVote.findMany({
    where: { session: { groupId } },
    select: { sessionId: true, votedGroupPlayerId: true, points: true },
  });

  const sessionsMeta = new Map(
    sessionStats.map((stat) => [
      stat.sessionId,
      { sessionDate: stat.session.sessionDate, createdAt: stat.session.createdAt },
    ]),
  );

  const allStats = sessionStats.map((stat) => ({
    sessionId: stat.sessionId,
    playerId: stat.groupPlayerId,
    totalPoints: stat.totalPoints,
    winPoints: stat.winPoints,
    sessionsPlayed: 1,
  }));

  const latestSessionDate = sessionStats.reduce<Date | null>((latest, stat) => {
    if (!latest) return stat.session.sessionDate;
    return stat.session.sessionDate > latest ? stat.session.sessionDate : latest;
  }, null);

  const buildMotmWinners = (sessionIds: Set<string>) => {
    const pointsBySession = new Map<string, Map<string, number>>();
    for (const vote of motmVotes) {
      if (!sessionIds.has(vote.sessionId)) continue;
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
      for (const [playerId, value] of sessionPoints.entries()) {
        if (value === max) winners.add(playerId);
      }
      winnersBySession.set(sessionId, winners);
    }
    return winnersBySession;
  };

  const computeMotmPoints = (sessionIds: Set<string>) => {
    const winnersBySession = buildMotmWinners(sessionIds);
    const motmPoints = new Map<string, number>();
    for (const winners of winnersBySession.values()) {
      for (const playerId of winners) {
        motmPoints.set(playerId, (motmPoints.get(playerId) ?? 0) + 1);
      }
    }
    return motmPoints;
  };

  type LeagueStat = ReturnType<typeof aggregateLeagueStats>[number] & { motmPoints: number };
  const metricValue = (stat: LeagueStat) => {
    switch (selectedMetric) {
      case "motmPoints":
        return stat.motmPoints;
      case "totalPoints":
        return stat.totalPoints;
      case "weightedPoints":
        return stat.weightedPoints;
      case "totalWinPoints":
        return stat.totalWinPoints;
      case "weightedWinPoints":
        return stat.weightedWinPoints;
      default:
        return stat.totalPoints;
    }
  };
  const byMetricDesc = (
    a: LeagueStat,
    b: LeagueStat,
  ) => {
    const diff = metricValue(b) - metricValue(a);
    return diff !== 0 ? diff : a.playerId.localeCompare(b.playerId);
  };
  const formatMetric = (value: number) =>
    selectedMetric === "motmPoints" || selectedMetric.startsWith("total")
      ? value.toFixed(0)
      : value.toFixed(2);

  const allSessionIds = new Set(Array.from(sessionsMeta.keys()));
  const motmWinnersAll = buildMotmWinners(allSessionIds);
  const motmPointsAll = computeMotmPoints(allSessionIds);
  const currentStats = aggregateLeagueStats(allStats)
    .map((stat) => ({
      ...stat,
      motmPoints: motmPointsAll.get(stat.playerId) ?? 0,
    }))
    .sort(byMetricDesc);

  const previousSessionIds = latestSessionDate
    ? new Set(
        Array.from(sessionsMeta.entries())
          .filter(([, meta]) => meta.sessionDate < latestSessionDate)
          .map(([sessionId]) => sessionId),
      )
    : new Set<string>();
  const motmPointsPrevious = latestSessionDate ? computeMotmPoints(previousSessionIds) : new Map();
  const previousStats = latestSessionDate
    ? aggregateLeagueStats(
        sessionStats
          .filter((stat) => stat.session.sessionDate < latestSessionDate)
          .map((stat) => ({
            sessionId: stat.sessionId,
            playerId: stat.groupPlayerId,
            totalPoints: stat.totalPoints,
            winPoints: stat.winPoints,
            sessionsPlayed: 1,
          })),
      )
        .map((stat) => ({
          ...stat,
          motmPoints: motmPointsPrevious.get(stat.playerId) ?? 0,
        }))
        .sort(byMetricDesc)
    : [];

  const previousRank = new Map<string, number>();
  previousStats.forEach((stat, index) => {
    if (index === 0) {
      previousRank.set(stat.playerId, 1);
      return;
    }
    const prev = previousStats[index - 1];
    const rank = metricValue(stat) === metricValue(prev) ? index : index + 1;
    const prevRank = previousRank.get(prev.playerId) ?? rank;
    previousRank.set(stat.playerId, metricValue(stat) === metricValue(prev) ? prevRank : rank);
  });

  const rankedStats = currentStats.reduce<
    Array<LeagueStat & { rank: number; rankLabel: string }>
  >((acc, stat, index) => {
    if (index === 0) {
      acc.push({ ...stat, rank: 1, rankLabel: "1" });
      return acc;
    }
    const previous = acc[index - 1];
    const sameRank = metricValue(stat) === metricValue(previous);
    const rank = sameRank ? previous.rank : index + 1;
    acc.push({ ...stat, rank, rankLabel: sameRank ? "-" : String(rank) });
    return acc;
  }, []);

  const players = await prisma.groupPlayer.findMany({
    where: { groupId },
    select: { id: true, displayName: true },
  });
  const playerLookup = new Map(players.map((p) => [p.id, p.displayName]));

  const statsByPlayer = new Map<string, typeof sessionStats>();
  for (const stat of sessionStats) {
    const list = statsByPlayer.get(stat.groupPlayerId) ?? [];
    list.push(stat);
    statsByPlayer.set(stat.groupPlayerId, list);
  }

  const chartData: { playerId: string; playerName: string; date: string; value: number }[] = [];
  for (const [playerId, stats] of statsByPlayer.entries()) {
    const ordered = [...stats].sort((a, b) => {
      const dateDiff = a.session.sessionDate.getTime() - b.session.sessionDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.session.createdAt.getTime() - b.session.createdAt.getTime();
    });

    let cumulativeTotal = 0;
    let cumulativeWin = 0;
    let cumulativeMotm = 0;
    let sessionCount = 0;
    for (const stat of ordered) {
      sessionCount += 1;
      cumulativeTotal += stat.totalPoints;
      cumulativeWin += stat.winPoints;
      if (motmWinnersAll.get(stat.sessionId)?.has(playerId)) {
        cumulativeMotm += 1;
      }

      const value =
        selectedMetric === "totalPoints"
          ? cumulativeTotal
          : selectedMetric === "weightedPoints"
            ? cumulativeTotal / sessionCount
            : selectedMetric === "totalWinPoints"
              ? cumulativeWin
              : selectedMetric === "motmPoints"
                ? cumulativeMotm
                : cumulativeWin / sessionCount;

      chartData.push({
        playerId,
        playerName: playerLookup.get(playerId) ?? "Unknown player",
        date: stat.session.sessionDate.toISOString(),
        value,
      });
    }
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">League tables</p>
        <h1 className="text-3xl font-semibold">{group.name}</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Leaderboard</CardTitle>
          <LeagueMetricSelect value={selectedMetric} options={metricOptions} />
        </CardHeader>
        <CardContent className="space-y-2">
          {rankedStats.map((stat, index) => {
            const lastRank = previousRank.get(stat.playerId);
            const hasPrevious = previousStats.length > 0;
            const isTopHalf = index < Math.ceil(rankedStats.length / 2);
            const movement = hasPrevious
              ? stat.rank < (lastRank ?? stat.rank)
                ? "up"
                : stat.rank > (lastRank ?? stat.rank)
                  ? "down"
                  : "same"
              : isTopHalf
                ? "up"
                : "down";

            return (
              <Link
                key={stat.playerId}
                href={`/groups/${groupId}/players/${stat.playerId}?metric=${selectedMetric}`}
                className="block rounded-lg border border-border px-3 py-2 text-foreground transition hover:bg-muted/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {stat.rankLabel}
                    </div>
                    <div
                      className={
                        movement === "up"
                          ? "text-xs font-semibold text-emerald-600"
                          : movement === "down"
                            ? "text-xs font-semibold text-rose-600"
                            : "text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {movement === "up" ? (
                        <svg
                          viewBox="0 0 10 10"
                          className="h-3 w-3"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path className="fill-current" d="M5 1 L9 9 H1 Z" />
                        </svg>
                      ) : movement === "down" ? (
                        <svg
                          viewBox="0 0 10 10"
                          className="h-3 w-3"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path className="fill-current" d="M1 1 H9 L5 9 Z" />
                        </svg>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div className="font-semibold text-foreground">
                      {playerLookup.get(stat.playerId) ?? "Unknown player"}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{stat.sessionsPlayed} sessions</span>
                    <span>{formatMetric(metricValue(stat))} pts</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {rankedStats.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No results yet. Add fixtures and publish teams to build the table.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Graph view</CardTitle>
            <p className="text-xs text-muted-foreground">
              Hover a line to highlight a player and see session-by-session points.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length ? (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <LeagueMetricChart
                data={chartData}
                yLabel={metricOptions.find((option) => option.value === selectedMetric)?.label ?? "Points"}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No results yet. Add fixtures and publish teams to build the table.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
