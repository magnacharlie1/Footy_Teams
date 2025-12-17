import { describe, expect, it } from "vitest";

import { aggregateLeagueStats, computeSessionStats } from "./scoring";

const assignments = [
  { playerId: "a", teamId: "team1" },
  { playerId: "b", teamId: "team1" },
  { playerId: "c", teamId: "team2" },
  { playerId: "d", teamId: "team2" },
];

const fixtures = [
  { teamAId: "team1", teamBId: "team2", teamAScore: 3, teamBScore: 1 },
  { teamAId: "team2", teamBId: "team1", teamAScore: 2, teamBScore: 2 },
];

describe("computeSessionStats", () => {
  it("assigns goals-for points and win points", () => {
    const stats = computeSessionStats({
      sessionId: "s1",
      fixtures,
      assignments,
    });

    const playerA = stats.find((s) => s.playerId === "a");
    expect(playerA?.totalPoints).toBe(5); // 3 + 2
    expect(playerA?.winPoints).toBe(4); // win + draw

    const playerC = stats.find((s) => s.playerId === "c");
    expect(playerC?.totalPoints).toBe(3); // 1 + 2
    expect(playerC?.winPoints).toBe(1); // loss + draw
  });
});

describe("aggregateLeagueStats", () => {
  it("computes weighted points across sessions", () => {
    const sessionStats = [
      ...computeSessionStats({ sessionId: "s1", fixtures, assignments }),
      ...computeSessionStats({
        sessionId: "s2",
        fixtures: [
          { teamAId: "team1", teamBId: "team2", teamAScore: 0, teamBScore: 1 },
        ],
        assignments,
      }),
    ];

    const leaderboard = aggregateLeagueStats(sessionStats);
    const playerA = leaderboard.find((l) => l.playerId === "a");
    expect(playerA?.weightedPoints).toBeCloseTo(2.5); // (5 + 0) / 2
    expect(playerA?.weightedWinPoints).toBeCloseTo(2); // (4 + 0) / 2
  });
});
