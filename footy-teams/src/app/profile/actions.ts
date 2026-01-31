"use server";

import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizePlayerName, safeDisplayName } from "@/lib/player-name";

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(60, "Name must be 60 characters or less.")
  .refine((value) => !value.includes("@"), "Please enter a name, not an email.");

export type UpdateNameState = {
  message?: string;
  fieldErrors?: { name?: string[] };
  values?: Record<string, string>;
};

export async function updateProfileNameAction(
  _prevState: UpdateNameState,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) {
    return { message: "Unauthorized" };
  }

  const raw = String(formData.get("name") ?? "");
  const parsed = nameSchema.safeParse(raw);
  if (!parsed.success) {
    const formErrors = parsed.error.flatten().formErrors;
    return {
      message: "Please fix the highlighted field.",
      fieldErrors: { name: formErrors.length ? formErrors : undefined },
      values: { name: raw },
    };
  }

  const nextName = parsed.data;
  const displayName = safeDisplayName(nextName);
  let normalizedName = normalizePlayerName(displayName) || "member";
  const isMemberName = normalizedName === "member";
  if (isMemberName) {
    normalizedName = `member-${session.user!.id}`;
  }

  const memberGroups = await prisma.groupMember.findMany({
    where: { userId: session.user!.id, isActive: true },
    select: { groupId: true },
  });
  const groupIds = memberGroups.map((entry) => entry.groupId);

  if (groupIds.length && !isMemberName) {
    const clash = await prisma.groupPlayer.findFirst({
      where: {
        groupId: { in: groupIds },
        normalizedName,
        userId: { not: session.user!.id },
      },
      select: { id: true },
    });

    if (clash) {
      return {
        message: "That name is already taken in one of your groups.",
        fieldErrors: { name: ["Please choose a different name."] },
        values: { name: raw },
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user!.id },
      data: { name: displayName },
    });

    await tx.groupPlayer.updateMany({
      where: { userId: session.user!.id },
      data: { displayName, normalizedName },
    });
  });

  redirect("/groups");
}
