"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureGroupPlayerForUser } from "@/lib/group-player";
import { safeDisplayName } from "@/lib/player-name";

export async function joinGroupByCodeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/groups")}`);
  }

  const raw = String(formData.get("code") ?? "").trim();
  let code = raw.toUpperCase();

  if (raw.includes("/invite/")) {
    const match = raw.match(/\/invite\/([^/?#]+)/i);
    if (match?.[1]) {
      code = match[1].trim().toUpperCase();
    }
  } else if (raw.startsWith("http")) {
    try {
      const url = new URL(raw);
      const match = url.pathname.match(/\/invite\/([^/]+)/i);
      if (match?.[1]) {
        code = match[1].trim().toUpperCase();
      }
    } catch {
      // Fall back to raw input.
    }
  }

  if (!code) {
    redirect("/groups?joinError=missing");
  }

  const invite = await prisma.groupInvite.findFirst({
    where: { code, isActive: true },
    include: { group: true },
  });

  if (!invite?.group || !invite.group.isActive) {
    redirect("/groups?joinError=invalid");
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
