import "server-only";

import { revalidatePath } from "next/cache";
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
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamAssignment.deleteMany({ where: { sessionId } });
    if (input.assignments.length) {
      await tx.teamAssignment.createMany({
        data: input.assignments.map((assignment) => ({
          sessionId,
          teamId: assignment.teamId,
          groupPlayerId: assignment.playerId,
          positionSlot: assignment.positionSlot ?? null,
        })),
      });
    }

    if (input.publish) {
      await tx.matchSession.update({
        where: { id: sessionId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    }
  });

  revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
  revalidatePath(`/groups/${groupId}/sessions/${sessionId}/teams`);
}
