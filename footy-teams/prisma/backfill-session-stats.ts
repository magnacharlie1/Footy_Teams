import { prisma } from "../src/lib/prisma";
import { computeSessionStats } from "../src/lib/scoring";

async function backfillSessionStats() {
  const sessions = await prisma.matchSession.findMany({
    include: {
      fixtures: true,
      teams: { include: { assignments: true } },
    },
  });

  for (const session of sessions) {
    const fixtures = session.fixtures.map((fixture) => ({
      teamAId: fixture.teamAId,
      teamBId: fixture.teamBId,
      teamAScore: fixture.teamAScore,
      teamBScore: fixture.teamBScore,
    }));
    const assignments = session.teams.flatMap((team) =>
      team.assignments.map((assignment) => ({
        playerId: assignment.groupPlayerId,
        teamId: assignment.teamId,
      })),
    );

    const playerIds = assignments.map((assignment) => assignment.playerId);

    await prisma.$transaction(async (tx) => {
      if (playerIds.length) {
        await tx.sessionStat.deleteMany({
          where: {
            sessionId: session.id,
            groupPlayerId: { notIn: playerIds },
          },
        });
      } else {
        await tx.sessionStat.deleteMany({ where: { sessionId: session.id } });
        return;
      }

      const stats = computeSessionStats({
        sessionId: session.id,
        fixtures,
        assignments,
      });

      for (const stat of stats) {
        await tx.sessionStat.upsert({
          where: {
            sessionId_groupPlayerId: {
              sessionId: session.id,
              groupPlayerId: stat.playerId,
            },
          },
          update: {
            totalPoints: stat.totalPoints,
            winPoints: stat.winPoints,
          },
          create: {
            sessionId: session.id,
            groupPlayerId: stat.playerId,
            totalPoints: stat.totalPoints,
            winPoints: stat.winPoints,
          },
        });
      }
    });
  }
}

backfillSessionStats()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
