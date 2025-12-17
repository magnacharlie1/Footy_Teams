import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupDashboard({ params }: Props) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();

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

  return (
    <div className="container py-8 space-y-6">
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
                    {new Date(session.sessionDate).toLocaleDateString("en-GB")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.numTeams} teams · {session.status}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" asChild>
                    <a href={`/groups/${group.id}/sessions/${session.id}`}>View</a>
                  </Button>
                  <Button size="sm" asChild>
                    <a href={`/groups/${group.id}/sessions/${session.id}/teams`}>Teams</a>
                  </Button>
                </div>
              </div>
            ))}
            {group.sessions.length === 0 && (
              <div className="text-sm text-muted-foreground">No sessions yet.</div>
            )}
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
    </div>
  );
}
