"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function updateGroupAnnouncement(groupId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership || membership.role !== "ADMIN") {
    redirect(`/groups/${groupId}?error=unauthorized`);
  }

  const raw = formData.get("announcement");
  const announcement = raw ? String(raw).trim() : null;

  await prisma.group.update({
    where: { id: groupId },
    data: { announcement: announcement || null },
  });

  redirect(`/groups/${groupId}`);
}
