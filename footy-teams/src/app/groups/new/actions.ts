import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createGroupSchema = z.object({
  name: z.string().min(3),
  timezone: z.string().min(1),
  defaultDayOfWeek: z.coerce.number().min(0).max(6).optional(),
  defaultStartTimeHHMM: z.string().min(0).max(5).optional(),
  defaultDurationMinutes: z.coerce.number().min(30).max(240).optional(),
});

export async function createGroupAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const parsed = createGroupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Invalid input", issues: parsed.error.flatten() };
  }

  const { name, timezone, defaultDayOfWeek, defaultStartTimeHHMM, defaultDurationMinutes } =
    parsed.data;

  const group = await prisma.group.create({
    data: {
      name,
      timezone,
      defaultDayOfWeek,
      defaultStartTimeHHMM,
      defaultDurationMinutes,
      createdByUserId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "ADMIN",
        },
      },
    },
  });

  redirect(`/groups/${group.id}`);
}
