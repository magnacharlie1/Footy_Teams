import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PopupCard } from "@/components/popup-card";
import { prisma } from "@/lib/prisma";
import { DeleteSessionIconButton } from "@/components/delete-session-icon-button";
import { deleteSessionAction } from "./sessions/[sessionId]/actions";
import { Textarea } from "@/components/ui/textarea";
import { updateGroupAnnouncement } from "./actions";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ joined?: string }>;
};

export default async function GroupDashboard({ params, searchParams }: Props) {
  const { groupId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const { joined } = resolvedSearchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();
  const canEdit = membership.role === "ADMIN";

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      sessions: {
        orderBy: { sessionDate: "desc" },
        take: 5,
      },
    },
  });

  if (!group) notFound();

  const player = await prisma.groupPlayer.findFirst({
    where: { groupId, userId: session.user.id },
    select: { jerseyNumber: true },
  });
  const joinedMessage =
    joined === "1" || joined === "true"
      ? `Your shirt number is ${player?.jerseyNumber ?? "TBD"}.`
      : null;
  const announcement = group.announcement?.trim() || "";

  return (
    <div className="container py-8 space-y-6">
      {joinedMessage ? (
        <PopupCard title="Welcome to the group" message={joinedMessage} />
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{group.timezone}</p>
          <h1 className="text-3xl font-semibold">{group.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href={`/groups/${group.id}/sessions/new`}>New session</a>
          </Button>
          <Button variant="secondary" asChild>
            <a href={`/groups/${group.id}/members`}>Members</a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <div className="font-semibold">
                    {new Date(session.sessionDate).toLocaleDateString("en-GB", {
                      timeZone: group.timezone,
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(session.sessionDate).toLocaleTimeString("en-GB", {
                      timeZone: group.timezone,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {session.numTeams} teams · {session.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" asChild>
                    <a href={`/groups/${group.id}/sessions/${session.id}`}>View</a>
                  </Button>
                  <Button size="sm" asChild>
                    <a href={`/groups/${group.id}/sessions/${session.id}/teams`}>Teams</a>
                  </Button>
                  {canEdit ? (
                    <DeleteSessionIconButton
                      action={deleteSessionAction.bind(null, group.id, session.id)}
                    />
                  ) : null}
                </div>
              </div>
            ))}
            {group.sessions.length === 0 && (
              <div className="text-sm text-muted-foreground">No sessions yet.</div>
            )}
            {group.sessions.length > 0 ? (
              <div className="text-xs text-muted-foreground">
                Times shown in {group.timezone}.
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leaderboards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <a className="text-primary" href={`/groups/${group.id}/league`}>
              League tables
            </a>
            <a className="text-primary block" href={`/groups/${group.id}/motm`}>
              Man of the Match
            </a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {announcement ? (
            <div className="whitespace-pre-line rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {announcement}
            </div>
          ) : (
            <div>No updates yet.</div>
          )}
          {canEdit ? (
            <form action={updateGroupAnnouncement.bind(null, group.id)} className="space-y-2">
              <Textarea
                name="announcement"
                placeholder="Add an update for the group (kit changes, pitch info, last-minute notes)."
                defaultValue={announcement}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  Save update
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
