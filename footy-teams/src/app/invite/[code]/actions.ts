"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureGroupPlayerForUser } from "@/lib/group-player";
import { safeDisplayName } from "@/lib/player-name";

export async function acceptInviteAction(code: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${code}`)}`);
  }

  const normalizedCode = code.trim().toUpperCase();
  const invite = await prisma.groupInvite.findFirst({
    where: { code: normalizedCode, isActive: true },
    include: { group: true },
  });

  if (!invite?.group || !invite.group.isActive) {
    throw new Error("Invite not found");
  }

  await prisma.groupMember.upsert({
    where: {
      groupId_userId: {
        groupId: invite.groupId,
        userId: session.user.id,
      },
    },
    update: { isActive: true },
    create: {
      groupId: invite.groupId,
      userId: session.user.id,
      role: "MEMBER",
      isActive: true,
    },
  });

  const displayName = safeDisplayName(session.user.name);
  await ensureGroupPlayerForUser({
    groupId: invite.groupId,
    userId: session.user.id,
    displayName,
  });

  redirect(`/groups/${invite.groupId}?joined=1`);
}
