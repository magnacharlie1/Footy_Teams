"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeSessionStats } from "@/lib/scoring";

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

    const playerIds = assignments.map((assignment) => assignment.groupPlayerId);

    if (playerIds.length) {
      await tx.sessionStat.deleteMany({
        where: {
          sessionId,
          groupPlayerId: { notIn: playerIds },
        },
      });
    } else {
      await tx.sessionStat.deleteMany({ where: { sessionId } });
    }

    const sessionStats = computeSessionStats({
      sessionId,
      fixtures,
      assignments: assignments.map((assignment) => ({
        playerId: assignment.groupPlayerId,
        teamId: assignment.teamId,
      })),
    });

    for (const stat of sessionStats) {
      await tx.sessionStat.upsert({
        where: {
          sessionId_groupPlayerId: {
            sessionId,
            groupPlayerId: stat.playerId,
          },
        },
        update: {
          totalPoints: stat.totalPoints,
          winPoints: stat.winPoints,
        },
        create: {
          sessionId,
          groupPlayerId: stat.playerId,
          totalPoints: stat.totalPoints,
          winPoints: stat.winPoints,
        },
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
