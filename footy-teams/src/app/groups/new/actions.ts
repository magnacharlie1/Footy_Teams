"use server";

import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createGroupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters."),
  timezone: z.string().min(1, "Timezone is required."),
  defaultDayOfWeek: z.coerce
    .number({ invalid_type_error: "Select a valid day." })
    .min(0, "Select a valid day.")
    .max(6, "Select a valid day."),
  defaultStartTimeHHMM: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use HH:MM format, e.g. 18:30."),
  defaultDurationMinutes: z.coerce
    .number({ invalid_type_error: "Duration must be a number." })
    .min(30, "Duration must be at least 30 minutes.")
    .max(240, "Duration must be 240 minutes or less."),
});

export type CreateGroupState = {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
};

export async function createGroupAction(
  _prevState: CreateGroupState,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) {
    return { message: "Unauthorized" };
  }

  const rawValues = Object.fromEntries(formData.entries());
  const parsed = createGroupSchema.safeParse(rawValues);
  if (!parsed.success) {
    return {
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: Object.fromEntries(
        Object.entries(rawValues).map(([key, value]) => [key, String(value)]),
      ),
    };
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
