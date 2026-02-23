import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { LeagueMetricSelect } from "@/components/league-metric-select";
import { LeagueMetricChart } from "@/components/league-metric-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { aggregateLeagueStats, computePowerRating } from "@/lib/scoring";
import { safeDisplayName } from "@/lib/player-name";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ metric?: string }>;
};

const baseMetricOptions = [
  { value: "totalPoints", label: "Total points" },
  { value: "weightedPoints", label: "Weighted points" },
  { value: "totalWinPoints", label: "Total win points" },
  { value: "weightedWinPoints", label: "Weighted win points" },
  { value: "goalDiff", label: "Goal difference" },
  { value: "motmPoints", label: "MoTM points" },
  { value: "dodPoints", label: "Dick of the day points" },
];

export default async function LeaguePage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const { metric } = (await searchParams) ?? {};
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();

  const metricOptions = membership.role === "ADMIN"
    ? [...baseMetricOptions, { value: "powerRating", label: "Power rating" }]
    : baseMetricOptions;
  const selectedMetric = metricOptions.some((option) => option.value === metric)
    ? (metric as (typeof metricOptions)[number]["value"])
    : "totalPoints";

  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });
  if (!group) notFound();

  const eligiblePlayers = await prisma.groupPlayer.findMany({
    where: { groupId, isActive: true, userId: { not: null } },
    select: { id: true, displayName: true },
  });
  const eligiblePlayerIds = eligiblePlayers.map((player) => player.id);
  const playerLookup = new Map(
    eligiblePlayers.map((p) => [p.id, safeDisplayName(p.displayName)]),
  );

  const sessionStats = await prisma.sessionStat.findMany({
    where: { session: { groupId }, groupPlayerId: { in: eligiblePlayerIds } },
    select: {
      sessionId: true,
      groupPlayerId: true,
      winPoints: true,
      session: { select: { sessionDate: true, createdAt: true } },
    },
  });

  const motmVotes = await prisma.motmVote.findMany({
    where: { session: { groupId } },
    select: { sessionId: true, votedGroupPlayerId: true, points: true },
  });
  const dodVotes = await prisma.dickOfDayVote.findMany({
    where: { session: { groupId } },
    select: { sessionId: true, votedGroupPlayerId: true, points: true },
  });

  const sessionsMeta = new Map(
    sessionStats.map((stat) => [
      stat.sessionId,
      { sessionDate: stat.session.sessionDate, createdAt: stat.session.createdAt },
    ]),
  );

  const motmPointsBySession = new Map<string, Map<string, number>>();
  for (const vote of motmVotes) {
    if (!eligiblePlayerIds.includes(vote.votedGroupPlayerId)) continue;
    const sessionPoints = motmPointsBySession.get(vote.sessionId) ?? new Map<string, number>();
    sessionPoints.set(
      vote.votedGroupPlayerId,
      (sessionPoints.get(vote.votedGroupPlayerId) ?? 0) + vote.points,
    );
    motmPointsBySession.set(vote.sessionId, sessionPoints);
  }

  const allStats = sessionStats.map((stat) => ({
    sessionId: stat.sessionId,
    playerId: stat.groupPlayerId,
    totalPoints: stat.winPoints,
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

  const buildDodWinners = (sessionIds: Set<string>) => {
    const pointsBySession = new Map<string, Map<string, number>>();
    for (const vote of dodVotes) {
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
        if (!eligiblePlayerIds.includes(playerId)) continue;
        motmPoints.set(playerId, (motmPoints.get(playerId) ?? 0) + 1);
      }
    }
    return motmPoints;
  };

  const computeDodPoints = (sessionIds: Set<string>) => {
    const winnersBySession = buildDodWinners(sessionIds);
    const dodPoints = new Map<string, number>();
    for (const winners of winnersBySession.values()) {
      for (const playerId of winners) {
        if (!eligiblePlayerIds.includes(playerId)) continue;
        dodPoints.set(playerId, (dodPoints.get(playerId) ?? 0) + 1);
      }
    }
    return dodPoints;
  };

  const sessionsWithTeams = await prisma.matchSession.findMany({
    where: { groupId },
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

  const goalDiffByPlayer = new Map<string, number>();
  const goalDiffBySession = new Map<string, Map<string, number>>();
  const resultsByPlayer = new Map<string, { wins: number; draws: number; losses: number }>();
  for (const session of sessionsWithTeams) {
    const playersByTeam = new Map<string, string[]>();
    for (const team of session.teams) {
      for (const assignment of team.assignments) {
        if (!eligiblePlayerIds.includes(assignment.groupPlayerId)) continue;
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
      const resultA = scoreA > scoreB ? "win" : scoreA < scoreB ? "loss" : "draw";
      const resultB = scoreB > scoreA ? "win" : scoreB < scoreA ? "loss" : "draw";

      const teamAPlayers = playersByTeam.get(fixture.teamAId) ?? [];
      for (const playerId of teamAPlayers) {
        goalDiffByPlayer.set(playerId, (goalDiffByPlayer.get(playerId) ?? 0) + diffA);
        const sessionMap = goalDiffBySession.get(session.id) ?? new Map<string, number>();
        sessionMap.set(playerId, (sessionMap.get(playerId) ?? 0) + diffA);
        goalDiffBySession.set(session.id, sessionMap);
        const current = resultsByPlayer.get(playerId) ?? { wins: 0, draws: 0, losses: 0 };
        if (resultA === "win") current.wins += 1;
        else if (resultA === "draw") current.draws += 1;
        else current.losses += 1;
        resultsByPlayer.set(playerId, current);
      }

      const teamBPlayers = playersByTeam.get(fixture.teamBId) ?? [];
      for (const playerId of teamBPlayers) {
        goalDiffByPlayer.set(playerId, (goalDiffByPlayer.get(playerId) ?? 0) + diffB);
        const sessionMap = goalDiffBySession.get(session.id) ?? new Map<string, number>();
        sessionMap.set(playerId, (sessionMap.get(playerId) ?? 0) + diffB);
        goalDiffBySession.set(session.id, sessionMap);
        const current = resultsByPlayer.get(playerId) ?? { wins: 0, draws: 0, losses: 0 };
        if (resultB === "win") current.wins += 1;
        else if (resultB === "draw") current.draws += 1;
        else current.losses += 1;
        resultsByPlayer.set(playerId, current);
      }
    }
  }

  type LeagueStat = ReturnType<typeof aggregateLeagueStats>[number] & {
    motmPoints: number;
    dodPoints: number;
    goalDiff: number;
    powerRating: number;
  };
  const metricValue = (stat: LeagueStat) => {
    switch (selectedMetric) {
      case "motmPoints":
        return stat.motmPoints;
      case "dodPoints":
        return stat.dodPoints;
      case "goalDiff":
        return stat.goalDiff;
      case "powerRating":
        return stat.powerRating;
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
  const compareStats = (a: LeagueStat, b: LeagueStat) => {
    const diff = metricValue(b) - metricValue(a);
    if (diff !== 0) return diff;
    if (selectedMetric === "totalPoints") {
      const gdDiff = (b.goalDiff ?? 0) - (a.goalDiff ?? 0);
      if (gdDiff !== 0) return gdDiff;
    }
    return a.playerId.localeCompare(b.playerId);
  };
  const byMetricDesc = (a: LeagueStat, b: LeagueStat) => compareStats(a, b);
  const formatMetric = (value: number) =>
    selectedMetric === "motmPoints" ||
    selectedMetric === "dodPoints" ||
    selectedMetric === "goalDiff" ||
    selectedMetric.startsWith("total")
      ? value.toFixed(0)
      : value.toFixed(2);

  const allSessionIds = new Set(Array.from(sessionsMeta.keys()));
  const motmWinnersAll = buildMotmWinners(allSessionIds);
  const dodWinnersAll = buildDodWinners(allSessionIds);
  const motmPointsAll = computeMotmPoints(allSessionIds);
  const dodPointsAll = computeDodPoints(allSessionIds);
  const motmTotalPoints = new Map<string, number>();
  for (const vote of motmVotes) {
    if (!eligiblePlayerIds.includes(vote.votedGroupPlayerId)) continue;
    motmTotalPoints.set(
      vote.votedGroupPlayerId,
      (motmTotalPoints.get(vote.votedGroupPlayerId) ?? 0) + vote.points,
    );
  }
  const bonusFor = (sessionId: string, playerId: string) => {
    let bonus = 0;
    if (motmWinnersAll.get(sessionId)?.has(playerId)) bonus += 3;
    return bonus;
  };

  const adjustedStats = allStats.map((stat) => ({
    ...stat,
    totalPoints: stat.totalPoints + bonusFor(stat.sessionId, stat.playerId),
  }));

  const currentStats = aggregateLeagueStats(adjustedStats)
    .map((stat) => ({
      ...stat,
      motmPoints: motmPointsAll.get(stat.playerId) ?? 0,
      dodPoints: dodPointsAll.get(stat.playerId) ?? 0,
      goalDiff: goalDiffByPlayer.get(stat.playerId) ?? 0,
      powerRating: computePowerRating({
        weightedPoints: stat.weightedPoints,
        goalDiff: goalDiffByPlayer.get(stat.playerId) ?? 0,
        motmPoints: motmTotalPoints.get(stat.playerId) ?? 0,
        sessionsPlayed: stat.sessionsPlayed,
      }),
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
  const dodPointsPrevious = latestSessionDate ? computeDodPoints(previousSessionIds) : new Map();
  const motmWinnersPrevious = latestSessionDate ? buildMotmWinners(previousSessionIds) : new Map();
  const dodWinnersPrevious = latestSessionDate ? buildDodWinners(previousSessionIds) : new Map();
  const previousMotmTotals = new Map<string, number>();
  if (latestSessionDate) {
    for (const [sessionId, sessionMap] of motmPointsBySession.entries()) {
      const meta = sessionsMeta.get(sessionId);
      if (!meta || meta.sessionDate >= latestSessionDate) continue;
      for (const [playerId, points] of sessionMap.entries()) {
        previousMotmTotals.set(
          playerId,
          (previousMotmTotals.get(playerId) ?? 0) + points,
        );
      }
    }
  }
  const previousGoalDiffByPlayer = new Map<string, number>();
  if (latestSessionDate) {
    for (const [sessionId, sessionMap] of goalDiffBySession.entries()) {
      const meta = sessionsMeta.get(sessionId);
      if (!meta || meta.sessionDate >= latestSessionDate) continue;
      for (const [playerId, diff] of sessionMap.entries()) {
        previousGoalDiffByPlayer.set(
          playerId,
          (previousGoalDiffByPlayer.get(playerId) ?? 0) + diff,
        );
      }
    }
  }
  const bonusForPrevious = (sessionId: string, playerId: string) => {
    let bonus = 0;
    if (motmWinnersPrevious.get(sessionId)?.has(playerId)) bonus += 3;
    return bonus;
  };
  const previousStats = latestSessionDate
    ? aggregateLeagueStats(
        sessionStats
          .filter((stat) => stat.session.sessionDate < latestSessionDate)
          .map((stat) => ({
            sessionId: stat.sessionId,
            playerId: stat.groupPlayerId,
            totalPoints: stat.winPoints + bonusForPrevious(stat.sessionId, stat.groupPlayerId),
            winPoints: stat.winPoints,
            sessionsPlayed: 1,
          })),
      )
        .map((stat) => ({
          ...stat,
          motmPoints: motmPointsPrevious.get(stat.playerId) ?? 0,
          dodPoints: dodPointsPrevious.get(stat.playerId) ?? 0,
          goalDiff: previousGoalDiffByPlayer.get(stat.playerId) ?? 0,
          powerRating: computePowerRating({
            weightedPoints: stat.weightedPoints,
            goalDiff: previousGoalDiffByPlayer.get(stat.playerId) ?? 0,
            motmPoints: previousMotmTotals.get(stat.playerId) ?? 0,
            sessionsPlayed: stat.sessionsPlayed,
          }),
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
    const rank = compareStats(stat, prev) === 0 ? index : index + 1;
    const prevRank = previousRank.get(prev.playerId) ?? rank;
    previousRank.set(stat.playerId, compareStats(stat, prev) === 0 ? prevRank : rank);
  });

  const rankedStats = currentStats.reduce<
    Array<LeagueStat & { rank: number; rankLabel: string }>
  >((acc, stat, index) => {
    if (index === 0) {
      acc.push({ ...stat, rank: 1, rankLabel: "1" });
      return acc;
    }
    const previous = acc[index - 1];
    const sameRank = compareStats(stat, previous) === 0;
    const rank = sameRank ? previous.rank : index + 1;
    acc.push({ ...stat, rank, rankLabel: sameRank ? "-" : String(rank) });
    return acc;
  }, []);

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
    let cumulativeDod = 0;
    let cumulativeGoalDiff = 0;
    let cumulativeMotmPoints = 0;
    let sessionCount = 0;
    for (const stat of ordered) {
      sessionCount += 1;
      cumulativeTotal += stat.winPoints;
      cumulativeWin += stat.winPoints;
      cumulativeGoalDiff += goalDiffBySession.get(stat.sessionId)?.get(playerId) ?? 0;
      cumulativeMotmPoints += motmPointsBySession.get(stat.sessionId)?.get(playerId) ?? 0;
      if (motmWinnersAll.get(stat.sessionId)?.has(playerId)) {
        cumulativeMotm += 1;
        cumulativeTotal += 3;
      }
      if (dodWinnersAll.get(stat.sessionId)?.has(playerId)) {
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
              : selectedMetric === "powerRating"
                ? computePowerRating({
                    weightedPoints: cumulativeTotal / sessionCount,
                    goalDiff: cumulativeGoalDiff,
                    motmPoints: cumulativeMotmPoints,
                    sessionsPlayed: sessionCount,
                  })
              : selectedMetric === "motmPoints"
                ? cumulativeMotm
                : selectedMetric === "dodPoints"
                  ? cumulativeDod
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
          {selectedMetric === "totalPoints" ? (
            <div className="grid grid-cols-[40px_1fr_44px_44px_44px_64px_64px_64px] items-center gap-2 border-b border-border pb-2 px-3 text-xs font-semibold text-muted-foreground">
              <div>Pos</div>
              <div>Player</div>
              <div className="text-right">W</div>
              <div className="text-right">D</div>
              <div className="text-right">L</div>
              <div className="text-right">MoTM</div>
              <div className="text-right">GD</div>
              <div className="text-right">Pts</div>
            </div>
          ) : null}
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
                {selectedMetric === "totalPoints" ? (
                  <div className="grid grid-cols-[40px_1fr_44px_44px_44px_64px_64px_64px] items-center gap-2">
                    <div className="flex items-center gap-2">
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
                    </div>
                    <div className="font-semibold text-foreground">
                      {playerLookup.get(stat.playerId) ?? "Unknown player"}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {resultsByPlayer.get(stat.playerId)?.wins ?? 0}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {resultsByPlayer.get(stat.playerId)?.draws ?? 0}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {resultsByPlayer.get(stat.playerId)?.losses ?? 0}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {motmPointsAll.get(stat.playerId) ?? 0}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {stat.goalDiff > 0 ? `+${stat.goalDiff}` : stat.goalDiff}
                    </div>
                    <div className="text-right text-xs font-semibold text-foreground">
                      {formatMetric(metricValue(stat))}
                    </div>
                  </div>
                ) : (
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
                )}
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
