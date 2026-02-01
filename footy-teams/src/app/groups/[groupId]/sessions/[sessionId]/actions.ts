"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { performance } from "node:perf_hooks";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeSessionStats } from "@/lib/scoring";
import { normalizePlayerName } from "@/lib/player-name";

async function requireAdmin(groupId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return session.user.id;
}

export async function addParticipantAction(
  groupId: string,
  sessionId: string,
  formData: FormData,
) {
  await requireAdmin(groupId);
  const groupPlayerId = String(formData.get("groupPlayerId") ?? "");
  if (!groupPlayerId) return;

  await prisma.sessionParticipant.upsert({
    where: {
      sessionId_groupPlayerId: {
        sessionId,
        groupPlayerId,
      },
    },
    update: {},
    create: {
      sessionId,
      groupPlayerId,
    },
  });

  revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
  revalidatePath(`/groups/${groupId}/sessions/${sessionId}/teams`);
}

export async function addGuestParticipantAction(
  groupId: string,
  sessionId: string,
  formData: FormData,
) {
  await requireAdmin(groupId);
  const rawName = String(formData.get("guestName") ?? "");
  const displayName = rawName.trim();
  if (!displayName) return;

  const normalizedName = normalizePlayerName(displayName);
  if (!normalizedName) return;

  const existing = await prisma.groupPlayer.findFirst({
    where: { groupId, normalizedName },
  });

  const player =
    existing ??
    (await prisma.groupPlayer.create({
      data: {
        groupId,
        displayName,
        normalizedName,
        isActive: true,
      },
    }));

  await prisma.sessionParticipant.upsert({
    where: {
      sessionId_groupPlayerId: {
        sessionId,
        groupPlayerId: player.id,
      },
    },
    update: {},
    create: {
      sessionId,
      groupPlayerId: player.id,
    },
  });

  revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
  revalidatePath(`/groups/${groupId}/sessions/${sessionId}/teams`);
}

export async function removeParticipantAction(
  groupId: string,
  sessionId: string,
  formData: FormData,
) {
  await requireAdmin(groupId);
  const groupPlayerId = String(formData.get("groupPlayerId") ?? "");
  if (!groupPlayerId) return;

  await prisma.sessionParticipant.delete({
    where: {
      sessionId_groupPlayerId: {
        sessionId,
        groupPlayerId,
      },
    },
  });

  revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
  revalidatePath(`/groups/${groupId}/sessions/${sessionId}/teams`);
}

export async function deleteSessionAction(groupId: string, sessionId: string) {
  await requireAdmin(groupId);

  await prisma.matchSession.delete({
    where: { id: sessionId },
  });

  redirect(`/groups/${groupId}`);
}

export async function updateFixtureScoreAction(
  groupId: string,
  sessionId: string,
  fixtureId: string,
  formData: FormData,
) {
  const startedAt = performance.now();
  await requireAdmin(groupId);

  const teamAScore = Number.parseInt(String(formData.get("teamAScore") ?? ""), 10);
  const teamBScore = Number.parseInt(String(formData.get("teamBScore") ?? ""), 10);

  if (Number.isNaN(teamAScore) || teamAScore < 0 || teamAScore > 99) {
    throw new Error("Team A score must be between 0 and 99");
  }
  if (Number.isNaN(teamBScore) || teamBScore < 0 || teamBScore > 99) {
    throw new Error("Team B score must be between 0 and 99");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.fixture.updateMany({
      where: { id: fixtureId, sessionId },
      data: { teamAScore, teamBScore },
    });

    if (updated.count === 0) {
      throw new Error("Fixture not found");
    }

    const [fixtures, assignments] = await Promise.all([
      tx.fixture.findMany({
        where: { sessionId },
        select: { teamAId: true, teamBId: true, teamAScore: true, teamBScore: true },
      }),
      tx.teamAssignment.findMany({
        where: { sessionId },
        select: { groupPlayerId: true, teamId: true },
      }),
    ]);

    const sessionStats = computeSessionStats({
      sessionId,
      fixtures,
      assignments: assignments.map((assignment) => ({
        playerId: assignment.groupPlayerId,
        teamId: assignment.teamId,
      })),
    });

    await tx.sessionStat.deleteMany({ where: { sessionId } });
    if (sessionStats.length) {
      await tx.sessionStat.createMany({
        data: sessionStats.map((stat) => ({
          sessionId,
          groupPlayerId: stat.playerId,
          totalPoints: stat.totalPoints,
          winPoints: stat.winPoints,
        })),
      });
    }

    return updated;
  });

  if (result.count === 0) {
    throw new Error("Fixture not found");
  }

  revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
  revalidatePath(`/groups/${groupId}/sessions/${sessionId}/teams`);
  revalidatePath(`/groups/${groupId}/league`);

  const durationMs = Math.round(performance.now() - startedAt);
  console.info(
    `[perf] updateFixtureScoreAction session=${sessionId} fixture=${fixtureId} ${durationMs}ms`,
  );
}

export async function updateSessionTeamEditorAction(
  groupId: string,
  sessionId: string,
  formData: FormData,
) {
  const adminUserId = await requireAdmin(groupId);
  const memberId = String(formData.get("memberId") ?? "");

  if (!memberId) {
    await prisma.matchSession.update({
      where: { id: sessionId },
      data: { teamEditorMemberId: null },
    });
    revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
    revalidatePath(`/groups/${groupId}/sessions/${sessionId}/teams`);
    redirect(`/groups/${groupId}/sessions/${sessionId}`);
  }

  const member = await prisma.groupMember.findFirst({
    where: { id: memberId, groupId, isActive: true },
    select: { id: true, userId: true },
  });

  if (!member) {
    throw new Error("Invalid delegate");
  }
  if (member.userId === adminUserId) {
    redirect(`/groups/${groupId}/sessions/${sessionId}`);
  }

  await prisma.matchSession.update({
    where: { id: sessionId },
    data: { teamEditorMemberId: member.id },
  });

  revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
  revalidatePath(`/groups/${groupId}/sessions/${sessionId}/teams`);
  redirect(`/groups/${groupId}/sessions/${sessionId}`);
}
