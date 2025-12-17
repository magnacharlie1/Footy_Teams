import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { parseWhatsAppNames } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

const sessionSchema = z.object({
  sessionDate: z.string(),
  numTeams: z.enum(["2", "4"]),
  paste: z.string().optional(),
});

function defaultTeams(numTeams: number) {
  const base = [
    { label: "Bibs", kitType: "BIBS" },
    { label: "Non-Bibs", kitType: "NON_BIBS" },
    { label: "Team C", kitType: "OTHER" },
    { label: "Team D", kitType: "OTHER" },
  ];
  return base.slice(0, numTeams);
}

function defaultFixtures(teamIds: string[]) {
  if (teamIds.length === 2) {
    return [{ teamAId: teamIds[0], teamBId: teamIds[1], fixtureIndex: 1 }];
  }
  if (teamIds.length === 4) {
    const [A, B, C, D] = teamIds;
    const pairs = [
      [A, B],
      [C, D],
      [A, C],
      [B, D],
      [A, D],
      [B, C],
    ];
    return pairs.map(([teamAId, teamBId], idx) => ({
      teamAId,
      teamBId,
      fixtureIndex: idx + 1,
    }));
  }
  return [];
}

export async function createSessionAction(groupId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  const parsed = sessionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  const sessionDate = new Date(parsed.data.sessionDate);
  const numTeams = Number(parsed.data.numTeams) as 2 | 4;
  const names = parseWhatsAppNames(parsed.data.paste ?? "");

  const created = await prisma.$transaction(async (tx) => {
    const matchSession = await tx.matchSession.create({
      data: {
        groupId,
        sessionDate,
        numTeams,
        status: "DRAFT",
        createdByUserId: session.user!.id,
      },
    });

    const teams = await Promise.all(
      defaultTeams(numTeams).map((team, idx) =>
        tx.team.create({
          data: {
            sessionId: matchSession.id,
            index: idx + 1,
            label: team.label,
            kitType: team.kitType as "BIBS" | "NON_BIBS" | "OTHER",
          },
        }),
      ),
    );

    const players = await Promise.all(
      names.map(async (entry) => {
        const existing =
          (await tx.groupPlayer.findFirst({
            where: {
              groupId,
              OR: [
                { normalizedName: entry.normalized },
                { aliases: { some: { aliasNormalized: entry.normalized } } },
              ],
            },
          })) ??
          (await tx.groupPlayer.create({
            data: {
              groupId,
              displayName: entry.cleaned,
              normalizedName: entry.normalized,
              isActive: true,
            },
          }));

        await tx.playerAlias.upsert({
          where: {
            groupId_aliasNormalized: {
              groupId,
              aliasNormalized: entry.normalized,
            },
          },
          create: {
            groupId,
            groupPlayerId: existing.id,
            aliasNormalized: entry.normalized,
          },
          update: {},
        });

        return existing;
      }),
    );

    for (const player of players) {
      await tx.sessionParticipant.upsert({
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

    const fixtures = defaultFixtures(teams.map((t) => t.id));
    if (fixtures.length) {
      await tx.fixture.createMany({
        data: fixtures.map((fixture) => ({
          sessionId: matchSession.id,
          ...fixture,
        })),
      });
    }

    return matchSession;
  });

  redirect(`/groups/${groupId}/sessions/${created.id}`);
}
