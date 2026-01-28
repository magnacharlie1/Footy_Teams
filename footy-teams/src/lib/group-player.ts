"server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizePlayerName } from "@/lib/player-name";

async function getJerseyNumberLimit(groupId: string) {
  const memberCount = await prisma.groupMember.count({
    where: { groupId, isActive: true },
  });
  return memberCount > 99 ? 999 : 99;
}

async function findAvailableNickname(groupId: string, baseNickname: string) {
  const trimmed = baseNickname.trim() || "Member";
  const baseNormalized = normalizePlayerName(trimmed) || "member";
  const existing = await prisma.groupPlayer.findMany({
    where: { groupId, nicknameNormalized: { not: null } },
    select: { nicknameNormalized: true },
  });
  const used = new Set(existing.map((player) => player.nicknameNormalized!).filter(Boolean));

  if (!used.has(baseNormalized)) {
    return { nickname: trimmed, nicknameNormalized: baseNormalized };
  }

  for (let suffix = 2; suffix <= 999; suffix += 1) {
    const candidate = `${trimmed} ${suffix}`;
    const candidateNormalized = normalizePlayerName(candidate);
    if (!candidateNormalized) continue;
    if (!used.has(candidateNormalized)) {
      return { nickname: candidate, nicknameNormalized: candidateNormalized };
    }
  }

  const fallback = `${trimmed}-${Date.now().toString().slice(-4)}`;
  return {
    nickname: fallback,
    nicknameNormalized: normalizePlayerName(fallback) || baseNormalized,
  };
}

async function findNextJerseyNumber(groupId: string) {
  const maxNumber = await getJerseyNumberLimit(groupId);
  const taken = await prisma.groupPlayer.findMany({
    where: { groupId, jerseyNumber: { not: null } },
    select: { jerseyNumber: true },
  });
  const used = new Set(taken.map((player) => player.jerseyNumber!).filter(Boolean));

  for (let number = 1; number <= maxNumber; number += 1) {
    if (!used.has(number)) return number;
  }

  return null;
}

type EnsureGroupPlayerInput = {
  groupId: string;
  userId: string;
  displayName: string;
};

export async function ensureGroupPlayerForUser({
  groupId,
  userId,
  displayName,
}: EnsureGroupPlayerInput) {
  const existing = await prisma.groupPlayer.findFirst({
    where: { groupId, userId },
  });
  if (existing) return existing;

  const normalizedName = normalizePlayerName(displayName) || "member";
  const { nickname, nicknameNormalized } = await findAvailableNickname(groupId, displayName);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const jerseyNumber = await findNextJerseyNumber(groupId);
    try {
      return await prisma.groupPlayer.create({
        data: {
          groupId,
          userId,
          displayName,
          normalizedName,
          nickname,
          nicknameNormalized,
          jerseyNumber,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to assign a jersey number.");
}

export async function getNextJerseyNumber(groupId: string) {
  return findNextJerseyNumber(groupId);
}

export async function getJerseyNumberMax(groupId: string) {
  return getJerseyNumberLimit(groupId);
}
