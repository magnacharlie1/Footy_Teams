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

  const existingGroup = await prisma.group.findFirst({
    where: { name: "Charlies Monday Football" },
  });

  const group =
    existingGroup ??
    (await prisma.group.create({
      data: {
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
    }));

  const testUsers = [
    "James Carter",
    "Olivia Stone",
    "Mason Wright",
    "Amelia Brooks",
    "Ethan Price",
    "Sofia Grant",
    "Lucas Bennett",
    "Chloe Reed",
    "Noah Walker",
    "Isla Turner",
    "Leo Morgan",
    "Mia Hughes",
  ];

  const seededUsers = await Promise.all(
    testUsers.map((name) => {
      const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;
      return prisma.user.upsert({
        where: { email },
        update: { name },
        create: { email, name },
      });
    }),
  );

  for (const user of seededUsers) {
    await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        groupId: group.id,
        userId: user.id,
        role: "MEMBER",
      },
    });
  }

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
          nickname: name,
          nicknameNormalized: name.toLowerCase(),
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

  for (const player of players) {
    await prisma.sessionParticipant.upsert({
      where: {
        sessionId_groupPlayerId: {
          sessionId: matchSession.id,
          groupPlayerId: player.id,
        },
      },
      update: {},
      create: {
        sessionId: matchSession.id,
        groupPlayerId: player.id,
      },
    });
  }

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

  const aliases = [
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
  ];

  for (const alias of aliases) {
    await prisma.playerAlias.upsert({
      where: {
        groupId_aliasNormalized: {
          groupId: alias.groupId,
          aliasNormalized: alias.aliasNormalized,
        },
      },
      update: {},
      create: alias,
    });
  }

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
