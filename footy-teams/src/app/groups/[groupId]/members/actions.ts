"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomBytes } from "crypto";
import { normalizePlayerName } from "@/lib/player-name";

export async function updateMemberRole(
  groupId: string,
  memberId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    redirect(`/groups/${groupId}/members?error=unauthorized`);
  }

  const raw = formData.get("role");
  const role = raw === "ADMIN" ? "ADMIN" : "MEMBER";

  const target = await prisma.groupMember.findFirst({
    where: { id: memberId, groupId, isActive: true },
    select: { id: true, role: true },
  });
  if (!target) {
    redirect(`/groups/${groupId}/members?error=invalid-member`);
  }

  if (target.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.groupMember.count({
      where: { groupId, isActive: true, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      redirect(`/groups/${groupId}/members?error=last-admin`);
    }
  }

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { role },
  });

  redirect(`/groups/${groupId}/members`);
}

export async function updateMemberNumber(
  groupId: string,
  memberId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) redirect(`/groups/${groupId}/members?error=unauthorized`);

  const member = await prisma.groupMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member?.user) redirect(`/groups/${groupId}/members?error=invalid-member`);
  if (membership.role !== "ADMIN" && member.userId !== session.user.id) {
    redirect(`/groups/${groupId}/members?error=unauthorized`);
  }

  const raw = formData.get("jerseyNumber");
  const value = raw ? String(raw).trim() : "";
  const jerseyNumber = value ? Number.parseInt(value, 10) : null;

  const memberCount = await prisma.groupMember.count({
    where: { groupId, isActive: true },
  });
  const maxNumber = memberCount > 99 ? 999 : 99;

  if (
    jerseyNumber !== null &&
    (Number.isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > maxNumber)
  ) {
    redirect(`/groups/${groupId}/members?error=invalid-number`);
  }

  const displayName = member.user.name ?? member.user.email ?? "Member";
  const normalizedName = normalizePlayerName(displayName) || "member";
  const nickname = displayName.trim() || "Member";
  const nicknameNormalized = normalizePlayerName(nickname) || normalizedName;

  try {
    const player = await prisma.groupPlayer.findFirst({
      where: { groupId, userId: member.user.id },
    });

    if (!player) {
      await prisma.groupPlayer.create({
        data: {
          groupId,
          userId: member.user.id,
          displayName,
          normalizedName,
          nickname,
          nicknameNormalized,
          jerseyNumber,
        },
      });
    } else {
      await prisma.groupPlayer.update({
        where: { id: player.id },
        data: { jerseyNumber },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.groupPlayer.findFirst({
        where: { groupId, jerseyNumber },
        select: {
          displayName: true,
          user: { select: { name: true, email: true } },
        },
      });
      const holderName =
        existing?.user?.name ??
        existing?.user?.email ??
        existing?.displayName ??
        "another member";
      const params = new URLSearchParams({
        error: "number-taken",
        number: String(jerseyNumber),
        holder: holderName,
      });
      redirect(`/groups/${groupId}/members?${params.toString()}`);
    }
    throw error;
  }

  redirect(`/groups/${groupId}/members`);
}

export async function updateMemberTeamEditor(
  groupId: string,
  memberId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    redirect(`/groups/${groupId}/members?error=unauthorized`);
  }

  const raw = formData.get("canEditTeams");
  const canEditTeams = raw === "true";

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { canEditTeams },
  });

  redirect(`/groups/${groupId}/members`);
}

export async function updateMemberNickname(
  groupId: string,
  memberId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) redirect(`/groups/${groupId}/members?error=unauthorized`);

  const member = await prisma.groupMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member?.user) redirect(`/groups/${groupId}/members?error=invalid-member`);
  if (membership.role !== "ADMIN" && member.userId !== session.user.id) {
    redirect(`/groups/${groupId}/members?error=unauthorized`);
  }

  const raw = formData.get("nickname");
  const value = raw ? String(raw).trim() : "";
  const displayName = member.user.name ?? member.user.email ?? "Member";
  const nickname = value || displayName;
  const nicknameNormalized =
    normalizePlayerName(nickname) || normalizePlayerName(displayName) || "member";

  const existing = await prisma.groupPlayer.findFirst({
    where: {
      groupId,
      nicknameNormalized,
      userId: { not: member.user.id },
    },
    select: { displayName: true, user: { select: { name: true, email: true } } },
  });
  if (existing) {
    const holderName =
      existing.user?.name ?? existing.user?.email ?? existing.displayName ?? "another member";
    const params = new URLSearchParams({
      error: "nickname-taken",
      holder: holderName,
    });
    redirect(`/groups/${groupId}/members?${params.toString()}`);
  }

  const normalizedName = normalizePlayerName(displayName) || "member";
  const player = await prisma.groupPlayer.findFirst({
    where: { groupId, userId: member.user.id },
  });

  try {
    if (!player) {
      await prisma.groupPlayer.create({
        data: {
          groupId,
          userId: member.user.id,
          displayName,
          normalizedName,
          nickname,
          nicknameNormalized,
        },
      });
    } else {
      await prisma.groupPlayer.update({
        where: { id: player.id },
        data: {
          nickname,
          nicknameNormalized,
        },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const params = new URLSearchParams({
        error: "nickname-taken",
        holder: "another member",
      });
      redirect(`/groups/${groupId}/members?${params.toString()}`);
    }
    throw error;
  }

  redirect(`/groups/${groupId}/members`);
}

function generateInviteCode() {
  return randomBytes(5).toString("base64url").toUpperCase();
}

async function createInviteRecord(groupId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateInviteCode();
    try {
      return await prisma.groupInvite.create({
        data: {
          groupId,
          code,
          isActive: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to generate invite");
}

export async function createGroupInvite(groupId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    redirect(`/groups/${groupId}/members?error=unauthorized`);
  }

  const existing = await prisma.groupInvite.findFirst({
    where: { groupId, isActive: true },
    select: { id: true },
  });
  if (existing) {
    redirect(`/groups/${groupId}/members`);
  }

  await createInviteRecord(groupId);

  redirect(`/groups/${groupId}/members`);
}

export async function deactivateGroupInvite(groupId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    redirect(`/groups/${groupId}/members?error=unauthorized`);
  }

  await prisma.groupInvite.updateMany({
    where: { groupId, isActive: true },
    data: { isActive: false },
  });

  redirect(`/groups/${groupId}/members`);
}

export async function rotateGroupInvite(groupId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    redirect(`/groups/${groupId}/members?error=unauthorized`);
  }

  await prisma.groupInvite.updateMany({
    where: { groupId, isActive: true },
    data: { isActive: false },
  });

  await createInviteRecord(groupId);

  redirect(`/groups/${groupId}/members`);
}
