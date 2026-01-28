import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNextJerseyNumber } from "@/lib/group-player";
import { prisma } from "@/lib/prisma";
import { acceptInviteAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${code}`)}`);
  }

  const invite = await prisma.groupInvite.findFirst({
    where: { code: normalizedCode, isActive: true },
    include: { group: true },
  });

  if (!invite?.group || !invite.group.isActive) {
    return (
      <div className="container py-10">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This invite link is invalid or no longer active.
          </CardContent>
        </Card>
      </div>
    );
  }

  const existingMembership = await prisma.groupMember.findFirst({
    where: {
      groupId: invite.groupId,
      userId: session.user.id,
      isActive: true,
    },
  });

  const adminMember = await prisma.groupMember.findFirst({
    where: { groupId: invite.groupId, role: "ADMIN", isActive: true },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  const adminName =
    adminMember?.user?.name ?? adminMember?.user?.email ?? "the admin";
  const suggestedNumber = existingMembership ? null : await getNextJerseyNumber(invite.groupId);
  const existingPlayer = existingMembership
    ? await prisma.groupPlayer.findFirst({
        where: { groupId: invite.groupId, userId: session.user.id },
        select: { jerseyNumber: true },
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{existingMembership ? "You're already in" : "Join this group?"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            {existingMembership ? "You're already a member of " : "You're about to join "}
            <span className="font-semibold text-foreground">{invite.group.name}</span>.
          </p>
          <p>
            Group admin:{" "}
            <span className="font-semibold text-foreground">{adminName}</span>
          </p>
          {!existingMembership ? (
            <p>
              Suggested shirt number:{" "}
              <span className="font-semibold text-foreground">
                {suggestedNumber ?? "TBD"}
              </span>
            </p>
          ) : null}
          {existingMembership ? (
            <Button asChild>
              <a href="/groups">Go to your groups</a>
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <form action={acceptInviteAction.bind(null, normalizedCode)}>
                <Button type="submit">Join group</Button>
              </form>
              <Button asChild variant="outline">
                <a href="/groups">Cancel</a>
              </Button>
            </div>
          )}
          {existingMembership ? (
            <p>
              Your shirt number:{" "}
              <span className="font-semibold text-foreground">
                {existingPlayer?.jerseyNumber ?? "TBD"}
              </span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
