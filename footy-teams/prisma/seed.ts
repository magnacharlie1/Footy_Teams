import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const admin =
    (await prisma.user.findUnique({ where: { email: adminEmail } })) ??
    (await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Charlie Admin",
      },
    }));

  const group = await prisma.group.upsert({
    where: { name: "Charlies Monday Football" },
    update: {},
    create: {
      name: "Charlies Monday Football",
      timezone: "Europe/London",
      defaultDayOfWeek: 1,
      defaultStartTimeHHMM: "18:30",
      defaultDurationMinutes: 60,
      createdByUserId: admin.id,
      members: {
        create: {
          userId: admin.id,
          role: "ADMIN",
        },
      },
      invites: {
        create: {
          code: "JOIN123",
        },
      },
    },
  });

  const playerNames = ["Alice", "Bob", "Cara", "Dan", "Eve", "Frank", "Grace", "Hugo"];

  const players = await Promise.all(
    playerNames.map((name) =>
      prisma.groupPlayer.upsert({
        where: {
          groupId_normalizedName: {
            groupId: group.id,
            normalizedName: name.toLowerCase(),
          },
        },
        update: {},
        create: {
          groupId: group.id,
          displayName: name,
          normalizedName: name.toLowerCase(),
        },
      }),
    ),
  );

  const sessionDate = new Date();
  sessionDate.setDate(sessionDate.getDate() + 1);
  sessionDate.setHours(18, 30, 0, 0);

  const matchSession = await prisma.matchSession.create({
    data: {
      groupId: group.id,
      sessionDate,
      numTeams: 2,
      status: "PUBLISHED",
      createdByUserId: admin.id,
      publishedAt: new Date(),
    },
  });

  await prisma.sessionParticipant.createMany({
    data: players.map((player) => ({
      sessionId: matchSession.id,
      groupPlayerId: player.id,
    })),
    skipDuplicates: true,
  });

  const teamA = await prisma.team.create({
    data: {
      sessionId: matchSession.id,
      index: 1,
      label: "Bibs",
      kitType: "BIBS",
    },
  });
  const teamB = await prisma.team.create({
    data: {
      sessionId: matchSession.id,
      index: 2,
      label: "Non-Bibs",
      kitType: "NON_BIBS",
    },
  });

  const assignments = [
    { player: players[0], teamId: teamA.id },
    { player: players[1], teamId: teamA.id },
    { player: players[2], teamId: teamA.id },
    { player: players[3], teamId: teamA.id },
    { player: players[4], teamId: teamB.id },
    { player: players[5], teamId: teamB.id },
    { player: players[6], teamId: teamB.id },
    { player: players[7], teamId: teamB.id },
  ];

  await prisma.teamAssignment.createMany({
    data: assignments.map((entry, idx) => ({
      sessionId: matchSession.id,
      teamId: entry.teamId,
      groupPlayerId: entry.player.id,
      positionSlot: idx + 1,
    })),
  });

  await prisma.fixture.create({
    data: {
      sessionId: matchSession.id,
      fixtureIndex: 1,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAScore: 5,
      teamBScore: 3,
    },
  });

  await prisma.playerAlias.createMany({
    data: [
      {
        groupId: group.id,
        groupPlayerId: players[0].id,
        aliasNormalized: "alice the great",
      },
      {
        groupId: group.id,
        groupPlayerId: players[4].id,
        aliasNormalized: "evie",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeded group, session, and players. Admin email:", adminEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
