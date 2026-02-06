"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { performance } from "node:perf_hooks";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SaveAssignmentsInput = {
  assignments: { playerId: string; teamId: string; positionSlot?: number | null }[];
  publish?: boolean;
};

export async function saveTeamsAction(
  sessionId: string,
  groupId: string,
  input: SaveAssignmentsInput,
) {
  const startedAt = performance.now();
  let stepStartedAt = startedAt;
  const stepDurations: Record<string, number> = {};
  const markStep = (label: string) => {
    const now = performance.now();
    stepDurations[label] = Math.round(now - stepStartedAt);
    stepStartedAt = now;
  };
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  markStep("auth");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) {
    throw new Error("Team editor access required");
  }
  markStep("membership");

  const matchSession = await prisma.matchSession.findUnique({
    where: { id: sessionId },
    select: { teamEditorMemberId: true, groupId: true },
  });

  if (!matchSession || matchSession.groupId !== groupId) {
    throw new Error("Session not found");
  }

  const canEditTeams =
    membership.role === "ADMIN" ||
    membership.canEditTeams ||
    membership.id === matchSession.teamEditorMemberId;

  if (!canEditTeams) {
    throw new Error("Team editor access required");
  }
  markStep("session_lookup");

  await prisma.$transaction(async (tx) => {
    const existingAssignments = await tx.teamAssignment.findMany({
      where: { sessionId },
      select: { groupPlayerId: true, teamId: true, positionSlot: true },
    });

    const incomingByPlayer = new Map(
      input.assignments.map((assignment) => [
        assignment.playerId,
        {
          teamId: assignment.teamId,
          positionSlot: assignment.positionSlot ?? null,
        },
      ]),
    );
    const existingByPlayer = new Map(
      existingAssignments.map((assignment) => [
        assignment.groupPlayerId,
        {
          teamId: assignment.teamId,
          positionSlot: assignment.positionSlot ?? null,
        },
      ]),
    );

    const playersToDelete = existingAssignments
      .filter((assignment) => !incomingByPlayer.has(assignment.groupPlayerId))
      .map((assignment) => assignment.groupPlayerId);

    if (playersToDelete.length) {
      await tx.teamAssignment.deleteMany({
        where: { sessionId, groupPlayerId: { in: playersToDelete } },
      });
    }

    const assignmentsToCreate = input.assignments.filter(
      (assignment) => !existingByPlayer.has(assignment.playerId),
    );
    if (assignmentsToCreate.length) {
      await tx.teamAssignment.createMany({
        data: assignmentsToCreate.map((assignment) => ({
          sessionId,
          teamId: assignment.teamId,
          groupPlayerId: assignment.playerId,
          positionSlot: assignment.positionSlot ?? null,
        })),
      });
    }

    const assignmentsToUpdate = input.assignments.filter((assignment) => {
      const existing = existingByPlayer.get(assignment.playerId);
      if (!existing) return false;
      const positionSlot = assignment.positionSlot ?? null;
      return existing.teamId !== assignment.teamId || existing.positionSlot !== positionSlot;
    });

    for (const assignment of assignmentsToUpdate) {
      await tx.teamAssignment.update({
        where: {
          sessionId_groupPlayerId: {
            sessionId,
            groupPlayerId: assignment.playerId,
          },
        },
        data: {
          teamId: assignment.teamId,
          positionSlot: assignment.positionSlot ?? null,
        },
      });
    }

    if (input.publish) {
      const assignedPlayerIds = Array.from(
        new Set(input.assignments.map((assignment) => assignment.playerId)),
      );
      if (assignedPlayerIds.length) {
        const groupPlayers = await tx.groupPlayer.findMany({
          where: { groupId },
          select: { id: true, jerseyNumber: true },
        });
        const usedNumbers = new Set(
          groupPlayers.map((player) => player.jerseyNumber).filter(Boolean) as number[],
        );
        const availableNumbers = Array.from({ length: 99 }, (_, idx) => idx + 1).filter(
          (num) => !usedNumbers.has(num),
        );
        for (let i = availableNumbers.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableNumbers[i], availableNumbers[j]] = [
            availableNumbers[j],
            availableNumbers[i],
          ];
        }

        for (const playerId of assignedPlayerIds) {
          const player = groupPlayers.find((entry) => entry.id === playerId);
          if (!player || player.jerseyNumber) continue;
          const nextNumber = availableNumbers.shift();
          if (!nextNumber) break;
          await tx.groupPlayer.update({
            where: { id: playerId },
            data: { jerseyNumber: nextNumber },
          });
        }
      }

      await tx.matchSession.update({
        where: { id: sessionId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    }
  });
  markStep("transaction");

  revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
  revalidatePath(`/groups/${groupId}/sessions/${sessionId}/teams`);
  markStep("revalidate");

  const durationMs = Math.round(performance.now() - startedAt);
  console.info(
    `[perf] saveTeamsAction session=${sessionId} assignments=${input.assignments.length} publish=${Boolean(
      input.publish,
    )} total=${durationMs}ms steps=${JSON.stringify(stepDurations)}`,
  );
}
