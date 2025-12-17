import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

export default async function SessionPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();

  const matchSession = await prisma.matchSession.findUnique({
    where: { id: sessionId },
    include: {
      teams: {
        include: {
          assignments: {
            include: { player: true },
            orderBy: { positionSlot: "asc" },
          },
        },
        orderBy: { index: "asc" },
      },
      fixtures: {
        orderBy: { fixtureIndex: "asc" },
        include: {
          teamA: true,
          teamB: true,
        },
      },
    },
  });

  if (!matchSession) notFound();

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            {new Date(matchSession.sessionDate).toLocaleDateString("en-GB")}
          </p>
          <h1 className="text-2xl font-semibold">Session overview</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href={`/groups/${groupId}/sessions/${sessionId}/teams`}>Team builder</a>
          </Button>
          <Button variant="secondary" asChild>
            <a href={`/groups/${groupId}/sessions/${sessionId}/fixtures`}>Fixtures</a>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Teams</CardTitle>
          <Badge variant="secondary">{matchSession.status}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {matchSession.teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {team.label} ({team.kitType})
                </div>
                <Badge variant="outline"># {team.index}</Badge>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {team.assignments.map((assignment) => (
                  <li key={assignment.id}>{assignment.player.displayName}</li>
                ))}
                {team.assignments.length === 0 && (
                  <li className="text-muted-foreground">No players yet</li>
                )}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fixtures</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Fixture</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchSession.fixtures.map((fixture) => (
                <TableRow key={fixture.id}>
                  <TableCell>{fixture.fixtureIndex}</TableCell>
                  <TableCell>
                    {fixture.teamA.label} vs {fixture.teamB.label}
                  </TableCell>
                  <TableCell>
                    {fixture.teamAScore} - {fixture.teamBScore}
                  </TableCell>
                </TableRow>
              ))}
              {matchSession.fixtures.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No fixtures yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
