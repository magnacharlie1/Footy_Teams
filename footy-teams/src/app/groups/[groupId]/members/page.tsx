import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InviteLinkCard } from "@/components/invite-link-card";
import { InviteQrCard } from "@/components/invite-qr-card";
import { PopupCard } from "@/components/popup-card";
import { getJerseyNumberMax } from "@/lib/group-player";
import { prisma } from "@/lib/prisma";
import {
  createGroupInvite,
  deactivateGroupInvite,
  rotateGroupInvite,
  updateMemberRole,
  updateMemberNumber,
  updateMemberTeamEditor,
} from "./actions";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ error?: string; holder?: string; number?: string }>;
};

export default async function MembersPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const { error } = resolvedSearchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId, isActive: true },
  });
  if (!membership) notFound();
  const isAdmin = membership.role === "ADMIN";

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!group) notFound();

  const invite = await prisma.groupInvite.findFirst({
    where: { groupId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const players = await prisma.groupPlayer.findMany({
    where: { groupId, userId: { not: null } },
    select: { userId: true, jerseyNumber: true },
  });
  const numberByUser = new Map(players.map((player) => [player.userId!, player.jerseyNumber]));
  const maxNumber = await getJerseyNumberMax(groupId);

  const rawHolder =
    error === "number-taken" || error === "nickname-taken"
      ? resolvedSearchParams.holder
      : undefined;
  const rawNumber = error === "number-taken" ? resolvedSearchParams.number : undefined;
  const holderName = rawHolder?.trim() || "another member";
  const jerseyLabel = rawNumber?.trim() ? `Number ${rawNumber}` : "That number";

  const errorMessage =
    error === "number-taken"
      ? `${jerseyLabel} is already assigned to ${holderName}.`
      : error === "invalid-number"
        ? `Shirt number must be between 1 and ${maxNumber}.`
        : error === "invalid-member"
          ? "Could not find that member."
          : error === "last-admin"
            ? "At least one admin must remain in the group."
          : error === "unauthorized"
            ? "You do not have access to edit numbers."
            : null;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Group members</p>
        <h1 className="text-3xl font-semibold">{group.name}</h1>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
      {errorMessage ? <PopupCard title="Update failed" message={errorMessage} /> : null}

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Share this reusable link to let new members join this group.</p>
            {invite ? (
              <div className="space-y-3">
                <InviteLinkCard code={invite.code} />
                <div className="flex flex-wrap gap-2">
                  <form action={rotateGroupInvite.bind(null, groupId)}>
                    <Button type="submit" size="sm" variant="secondary">
                      Rotate invite
                    </Button>
                  </form>
                  <form action={deactivateGroupInvite.bind(null, groupId)}>
                    <Button type="submit" size="sm" variant="outline">
                      Disable invite
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <form action={createGroupInvite.bind(null, groupId)}>
                <Button type="submit">Create invite link</Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isAdmin && invite ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite QR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Scan to open the invite link.</p>
            <InviteQrCard code={invite.code} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {group.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-semibold">
                  {member.user?.name ?? member.user?.email ?? "Unnamed user"}
                </div>
                {member.user?.email ? (
                  <div className="text-xs text-muted-foreground">{member.user.email}</div>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {member.role === "ADMIN" ? <Badge>Admin</Badge> : null}
                  {member.canEditTeams && member.role !== "ADMIN" ? (
                    <Badge variant="secondary">Team editor</Badge>
                  ) : null}
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                {isAdmin || member.userId === userId ? (
                  <form
                    action={updateMemberNumber.bind(null, groupId, member.id)}
                    className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
                  >
                    <Input
                      name="jerseyNumber"
                      type="number"
                      min={1}
                      max={maxNumber}
                      placeholder="No."
                      defaultValue={numberByUser.get(member.userId) ?? ""}
                      className="h-9 w-20"
                    />
                    <Button type="submit" size="sm" variant="secondary" className="w-full sm:w-auto">
                      Save
                    </Button>
                  </form>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No. {numberByUser.get(member.userId) ?? "-"}
                  </div>
                )}
                {isAdmin ? (
                  <>
                  <form
                    action={updateMemberTeamEditor.bind(null, groupId, member.id)}
                    className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
                  >
                    <input
                      type="hidden"
                      name="canEditTeams"
                      value={member.canEditTeams ? "false" : "true"}
                    />
                    <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
                      {member.canEditTeams ? "Remove team editor" : "Make team editor"}
                    </Button>
                  </form>
                  {member.userId !== userId ? (
                    <form
                      action={updateMemberRole.bind(null, groupId, member.id)}
                      className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
                    >
                      <input
                        type="hidden"
                        name="role"
                        value={member.role === "ADMIN" ? "MEMBER" : "ADMIN"}
                      />
                      <Button type="submit" size="sm" variant="outline" className="w-full sm:w-auto">
                        {member.role === "ADMIN" ? "Remove admin" : "Make admin"}
                      </Button>
                    </form>
                  ) : null}
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {group.members.length === 0 && (
            <div className="text-sm text-muted-foreground">No members yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
