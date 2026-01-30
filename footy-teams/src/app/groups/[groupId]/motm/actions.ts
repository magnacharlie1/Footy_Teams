"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { safeDisplayName } from "@/lib/player-name";

async function requireMember(groupId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) throw new Error("Member access required");

  return { userId: session.user.id, role: membership.role };
}

async function requireAdmin(groupId: string) {
  const { userId, role } = await requireMember(groupId);
  if (role !== "ADMIN") {
    throw new Error("Admin access required");
  }
  return userId;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function openMotmAction(groupId: string, sessionId: string) {
  await requireAdmin(groupId);

  await prisma.matchSession.update({
    where: { id: sessionId },
    data: { motmOpen: true, motmClosedAt: null },
  });

  revalidatePath(`/groups/${groupId}/motm`);
}

export async function closeMotmAction(groupId: string, sessionId: string) {
  await requireAdmin(groupId);

  await prisma.matchSession.update({
    where: { id: sessionId },
    data: { motmOpen: false, motmClosedAt: new Date() },
  });

  revalidatePath(`/groups/${groupId}/motm`);
}

export async function submitMotmBallotAction(
  groupId: string,
  sessionId: string,
  formData: FormData,
) {
  const { userId } = await requireMember(groupId);

  const matchSession = await prisma.matchSession.findUnique({
    where: { id: sessionId },
    include: {
      participants: { include: { player: true } },
    },
  });

  if (!matchSession || matchSession.groupId !== groupId) {
    throw new Error("Session not found");
  }
  if (!matchSession.motmOpen) {
    throw new Error("Voting is closed");
  }

  const participantIds = new Set(
    matchSession.participants.map((participant) => participant.groupPlayerId),
  );
  const directParticipant = matchSession.participants.find(
    (participant) => participant.player.userId === userId,
  );
  let voterPlayerId = directParticipant?.groupPlayerId;

  if (!voterPlayerId) {
    const sessionUser = await prisma.user.findUnique({ where: { id: userId } });
    const fallbackName = safeDisplayName(sessionUser?.name);
    const normalized = normalizeName(fallbackName || "member");
    const matches = matchSession.participants.filter(
      (participant) => participant.player.normalizedName === normalized,
    );
    if (matches.length === 1) {
      voterPlayerId = matches[0].groupPlayerId;
    }
  }

  if (!voterPlayerId || !participantIds.has(voterPlayerId)) {
    throw new Error("Only participants can vote");
  }

  const first = String(formData.get("firstChoice") ?? "");
  const second = String(formData.get("secondChoice") ?? "");
  const third = String(formData.get("thirdChoice") ?? "");

  const choices = [first, second, third];
  if (choices.some((value) => !value)) {
    throw new Error("All three choices are required");
  }
  const unique = new Set(choices);
  if (unique.size !== choices.length) {
    throw new Error("Choices must be different players");
  }
  for (const choice of choices) {
    if (!participantIds.has(choice)) {
      throw new Error("Invalid player selection");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.motmVote.deleteMany({
      where: { sessionId, voterUserId: userId },
    });

    await tx.motmVote.createMany({
      data: [
        { sessionId, voterUserId: userId, votedGroupPlayerId: first, rank: 1, points: 3 },
        { sessionId, voterUserId: userId, votedGroupPlayerId: second, rank: 2, points: 2 },
        { sessionId, voterUserId: userId, votedGroupPlayerId: third, rank: 3, points: 1 },
      ],
    });
  });

  revalidatePath(`/groups/${groupId}/motm`);
}
