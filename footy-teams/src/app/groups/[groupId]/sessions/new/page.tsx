import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { safeDisplayName } from "@/lib/player-name";
import { createSessionAction } from "./actions";
import { SessionForm } from "./session-form";

type Props = {
  params: Promise<{ groupId: string }>;
};

export default async function NewSessionPage({ params }: Props) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { timezone: true, defaultStartTimeHHMM: true },
  });
  if (!group) notFound();

  const members = await prisma.groupMember.findMany({
    where: { groupId, isActive: true },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const action = createSessionAction.bind(null, groupId);

  return (
    <div className="container py-10">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>New session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SessionForm
            action={action}
            members={members.map((member) => ({
              id: member.userId,
              name: safeDisplayName(member.user?.name),
            }))}
            defaultStartTimeHHMM={group.defaultStartTimeHHMM}
            timezoneLabel={group.timezone}
          />
        </CardContent>
      </Card>
    </div>
  );
}
