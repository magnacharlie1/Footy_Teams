import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { FinalScoreDialog } from "@/components/final-score-dialog";
import { SessionTeamsCard } from "@/components/session-teams-card";
import { safeDisplayName } from "@/lib/player-name";
import {
  addParticipantAction,
  addGuestParticipantAction,
  removeParticipantAction,
  updateFixtureScoreAction,
  updateSessionTeamEditorAction,
} from "./actions";
import { getJerseyNumberMax } from "@/lib/group-player";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

export default async function SessionPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId, isActive: true },
  });
  if (!membership) notFound();

  const matchSession = await prisma.matchSession.findUnique({
    where: { id: sessionId },
    include: {
      group: {
        select: { name: true },
      },
      teamEditorMember: {
        include: { user: true },
      },
      participants: {
        include: { player: true },
      },
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

  const groupMembers = await prisma.groupMember.findMany({
    where: { groupId, isActive: true },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
  const delegateCandidates = groupMembers.filter((member) => member.userId !== userId);

  const allPlayers = await prisma.groupPlayer.findMany({
    where: { groupId, isActive: true },
    orderBy: { displayName: "asc" },
  });
  const participantIds = new Set(
    matchSession.participants.map((participant) => participant.groupPlayerId),
  );
  const availablePlayers = allPlayers.filter((player) => !participantIds.has(player.id));

  const canEdit = membership.role === "ADMIN";
  const addAction = addParticipantAction.bind(null, groupId, sessionId);
  const addGuestAction = addGuestParticipantAction.bind(null, groupId, sessionId);
  const removeAction = removeParticipantAction.bind(null, groupId, sessionId);
  const fixtureColumnCount = canEdit ? 4 : 3;
  const maxJerseyNumber = await getJerseyNumberMax(groupId);

  return (
    <div className="container py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            {new Date(matchSession.sessionDate).toLocaleDateString("en-GB")}
          </p>
          <h1 className="text-2xl font-semibold">Session overview</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild className="w-full sm:w-auto">
            <a href={`/groups/${groupId}/sessions/${sessionId}/teams`}>Team builder</a>
          </Button>
          <Button variant="secondary" asChild className="w-full sm:w-auto">
            <a href={`/groups/${groupId}/sessions/${sessionId}/fixtures`}>Fixtures</a>
          </Button>
          <Button variant="secondary" asChild className="w-full sm:w-auto">
            <a href={`/groups/${groupId}/motm?sessionId=${sessionId}`}>MoTM voting</a>
          </Button>
        </div>
      </div>

      <SessionTeamsCard
        groupName={matchSession.group?.name ?? "Group"}
        sessionId={sessionId}
        sessionDate={matchSession.sessionDate.toISOString()}
        status={matchSession.status}
        teams={matchSession.teams}
        maxJerseyNumber={maxJerseyNumber}
      />

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session delegate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Pick a member who can edit teams for this session only.</p>
            <div>
              Current delegate:{" "}
              <span className="font-semibold text-foreground">
                {matchSession.teamEditorMember?.user?.name
                  ? safeDisplayName(matchSession.teamEditorMember.user.name)
                  : "None"}
              </span>
            </div>
            <form
              action={updateSessionTeamEditorAction.bind(null, groupId, sessionId)}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <select
                name="memberId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:max-w-xs"
                defaultValue={matchSession.teamEditorMemberId ?? ""}
              >
                <option value="">No delegate</option>
                {delegateCandidates.map((member) => (
                  <option key={member.id} value={member.id}>
                    {safeDisplayName(member.user?.name)}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary">
                Save delegate
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <details className="group rounded-lg border border-border">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">
            <span>Edit participants</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-base">
              ✎
            </span>
          </summary>
          <div className="px-4 pb-4 pt-1">
            <form action={addAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground">Add member</label>
                <select
                  name="groupPlayerId"
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a member
                  </option>
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {safeDisplayName(player.displayName)}
                  </option>
                ))}
              </select>
              </div>
              <Button type="submit" disabled={availablePlayers.length === 0}>
                Add to session
              </Button>
            </form>

            <form
              action={addGuestAction}
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground">Add guest</label>
                <Input
                  name="guestName"
                  placeholder="Guest name"
                  className="mt-1"
                />
              </div>
              <Button type="submit">Add guest</Button>
            </form>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Current participants</div>
              {matchSession.participants.map((participant) => (
                <form
                  key={participant.id}
                  action={removeAction}
                  className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm">
                    {safeDisplayName(participant.player.displayName)}
                  </div>
                  <input type="hidden" name="groupPlayerId" value={participant.groupPlayerId} />
                  <Button type="submit" size="sm" variant="secondary" className="w-full sm:w-auto">
                    Remove
                  </Button>
                </form>
              ))}
              {matchSession.participants.length === 0 ? (
                <div className="text-sm text-muted-foreground">No participants yet.</div>
              ) : null}
            </div>
          </div>
        </details>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fixtures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Fixture</TableHead>
                <TableHead>Score</TableHead>
                {canEdit ? <TableHead>Action</TableHead> : null}
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
                  {canEdit ? (
                    <TableCell>
                      <FinalScoreDialog
                        fixture={fixture}
                        action={updateFixtureScoreAction.bind(
                          null,
                          groupId,
                          sessionId,
                          fixture.id,
                        )}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {matchSession.fixtures.length === 0 && (
                <TableRow>
                  <TableCell colSpan={fixtureColumnCount} className="text-muted-foreground">
                    No fixtures yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
