export type FixtureScore = {
  teamAId: string;
  teamBId: string;
  teamAScore: number;
  teamBScore: number;
};

export type Assignment = {
  playerId: string;
  teamId: string;
};

export type SessionAggregate = {
  sessionId: string;
  playerId: string;
  totalPoints: number;
  winPoints: number;
  sessionsPlayed: number;
};

function fixtureWinPoints(scoreA: number, scoreB: number) {
  if (scoreA > scoreB) return { a: 3, b: 0 };
  if (scoreB > scoreA) return { a: 0, b: 3 };
  return { a: 1, b: 1 };
}

export function computeSessionStats({
  sessionId,
  fixtures,
  assignments,
}: {
  sessionId: string;
  fixtures: FixtureScore[];
  assignments: Assignment[];
}): SessionAggregate[] {
  const stats = new Map<string, SessionAggregate>();
  const teamByPlayer = new Map(assignments.map((a) => [a.playerId, a.teamId]));

  for (const assignment of assignments) {
    stats.set(assignment.playerId, {
      sessionId,
      playerId: assignment.playerId,
      totalPoints: 0,
      winPoints: 0,
      sessionsPlayed: 1,
    });
  }

  for (const fixture of fixtures) {
    const win = fixtureWinPoints(fixture.teamAScore, fixture.teamBScore);

    for (const [playerId, teamId] of teamByPlayer.entries()) {
      const record = stats.get(playerId);
      if (!record) continue;

      if (teamId === fixture.teamAId) {
        record.totalPoints += win.a;
        record.winPoints += win.a;
      } else if (teamId === fixture.teamBId) {
        record.totalPoints += win.b;
        record.winPoints += win.b;
      }
    }
  }

  return Array.from(stats.values());
}

export function aggregateLeagueStats(
  sessionStats: SessionAggregate[],
): {
  playerId: string;
  totalPoints: number;
  weightedPoints: number;
  totalWinPoints: number;
  weightedWinPoints: number;
  sessionsPlayed: number;
}[] {
  const aggregated = new Map<string, SessionAggregate>();

  for (const stat of sessionStats) {
    const current = aggregated.get(stat.playerId) ?? {
      sessionId: stat.sessionId,
      playerId: stat.playerId,
      totalPoints: 0,
      winPoints: 0,
      sessionsPlayed: 0,
    };

    current.totalPoints += stat.totalPoints;
    current.winPoints += stat.winPoints;
    current.sessionsPlayed += stat.sessionsPlayed;
    aggregated.set(stat.playerId, current);
  }

  return Array.from(aggregated.values()).map((entry) => ({
    playerId: entry.playerId,
    totalPoints: entry.totalPoints,
    weightedPoints: entry.sessionsPlayed
      ? entry.totalPoints / entry.sessionsPlayed
      : 0,
    totalWinPoints: entry.winPoints,
    weightedWinPoints: entry.sessionsPlayed
      ? entry.winPoints / entry.sessionsPlayed
      : 0,
    sessionsPlayed: entry.sessionsPlayed,
  }));
}

const POWER_GD_WEIGHT = 0.5;
const POWER_MOTM_WEIGHT = 0.35;

export function computePowerRating({
  weightedPoints,
  goalDiff,
  motmPoints,
  sessionsPlayed,
}: {
  weightedPoints: number;
  goalDiff: number;
  motmPoints: number;
  sessionsPlayed: number;
}) {
  const weightedGoalDiff = sessionsPlayed ? goalDiff / sessionsPlayed : 0;
  const weightedMotm = sessionsPlayed ? motmPoints / sessionsPlayed : 0;
  return (
    weightedPoints +
    weightedGoalDiff * POWER_GD_WEIGHT +
    weightedMotm * POWER_MOTM_WEIGHT
  );
}
