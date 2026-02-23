import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { MotmBallotForm } from "@/components/motm-ballot-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { safeDisplayName } from "@/lib/player-name";
import { closeMotmAction, openMotmAction, submitMotmBallotAction } from "./actions";

type Props = {
  params: Promise<{ groupId: string }>;
  searchParams?: Promise<{ sessionId?: string }>;
};

export default async function MotmPage({ params, searchParams }: Props) {
  const { groupId } = await params;
  const { sessionId } = (await searchParams) ?? {};
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();

  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });
  if (!group) notFound();

  const selectedSession = sessionId
    ? await prisma.matchSession.findFirst({
        where: { id: sessionId, groupId },
        include: {
          participants: { include: { player: true } },
        },
      })
    : await prisma.matchSession.findFirst({
        where: { groupId },
        orderBy: { sessionDate: "desc" },
        include: {
          participants: { include: { player: true } },
        },
      });

  const votes = await prisma.motmVote.findMany({
    where: selectedSession
      ? { sessionId: selectedSession.id }
      : { session: { groupId } },
    include: { votedPlayer: true },
  });
  const dodVotes = await prisma.dickOfDayVote.findMany({
    where: selectedSession
      ? { sessionId: selectedSession.id }
      : { session: { groupId } },
    include: { votedPlayer: true },
  });

  const tally = new Map<string, { name: string; points: number }>();
  for (const vote of votes) {
    const playerId = vote.votedGroupPlayerId;
    const current = tally.get(playerId) ?? {
      name: safeDisplayName(vote.votedPlayer.displayName),
      points: 0,
    };
    current.points += vote.points;
    tally.set(playerId, current);
  }

  const leaderboard = Array.from(tally.entries())
    .map(([playerId, data]) => ({ playerId, ...data }))
    .sort((a, b) => b.points - a.points);

  const rankedLeaderboard = leaderboard.map((entry, index) => {
    if (index === 0) return { ...entry, rankLabel: "1", rank: 1 };
    const prev = leaderboard[index - 1];
    const sameRank = entry.points === prev.points;
    const rank = sameRank ? index : index + 1;
    return { ...entry, rank, rankLabel: sameRank ? "-" : String(rank) };
  });

  const dodTally = new Map<string, { name: string; points: number }>();
  for (const vote of dodVotes) {
    const playerId = vote.votedGroupPlayerId;
    const current = dodTally.get(playerId) ?? {
      name: safeDisplayName(vote.votedPlayer.displayName),
      points: 0,
    };
    current.points += vote.points;
    dodTally.set(playerId, current);
  }

  const dodLeaderboard = Array.from(dodTally.entries())
    .map(([playerId, data]) => ({ playerId, ...data }))
    .sort((a, b) => b.points - a.points);

  const rankedDodLeaderboard = dodLeaderboard.map((entry, index) => {
    if (index === 0) return { ...entry, rankLabel: "1", rank: 1 };
    const prev = dodLeaderboard[index - 1];
    const sameRank = entry.points === prev.points;
    const rank = sameRank ? index : index + 1;
    return { ...entry, rank, rankLabel: sameRank ? "-" : String(rank) };
  });

  const participantOptions = selectedSession?.participants.map((participant) => ({
    id: participant.groupPlayerId,
    name: safeDisplayName(participant.player.displayName),
  }));
  const participantUserIds = new Set(
    selectedSession?.participants
      .map((participant) => participant.player.userId)
      .filter((userId): userId is string => Boolean(userId)) ?? [],
  );
  const canVote = participantUserIds.has(session.user.id);
  const voterParticipant = selectedSession?.participants.find(
    (participant) => participant.player.userId === session.user.id,
  );
  const selfId = voterParticipant?.groupPlayerId;

  return (
    <div className="container py-8 space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Man of the Match</p>
        <h1 className="text-3xl font-semibold">{group.name}</h1>
      </div>

      {selectedSession ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Voting</CardTitle>
              <p className="text-xs text-muted-foreground">
                Voting is {selectedSession.motmOpen ? "open" : "closed"} for this session.
              </p>
              <p className="text-xs text-muted-foreground">
                Session date: {new Date(selectedSession.sessionDate).toLocaleDateString("en-GB")}
              </p>
            </div>
            {membership.role === "ADMIN" ? (
              <div className="flex gap-2">
                {selectedSession.motmOpen ? (
                  <form action={closeMotmAction.bind(null, groupId, selectedSession.id)}>
                    <Button type="submit" variant="secondary">
                      Close voting
                    </Button>
                  </form>
                ) : (
                  <form action={openMotmAction.bind(null, groupId, selectedSession.id)}>
                    <Button type="submit">Open voting</Button>
                  </form>
                )}
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {selectedSession.motmOpen ? (
              <MotmBallotForm
                action={submitMotmBallotAction.bind(null, groupId, selectedSession.id)}
                options={participantOptions ?? []}
                selfId={selfId}
                disabled={!canVote}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Voting is closed. Ask an admin to open it for this session.
              </div>
            )}
            {!canVote ? (
              <div className="mt-3 text-sm text-muted-foreground">
                Only participants can vote in this session.
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Voting</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Select a session from the session overview to vote.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>MoTM votes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rankedLeaderboard.map((entry) => (
            <div
              key={entry.playerId}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  {entry.rankLabel}
                </div>
                <div className="font-semibold">{entry.name}</div>
              </div>
              <div className="text-xs text-muted-foreground">{entry.points} pts</div>
            </div>
          ))}
          {rankedLeaderboard.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No votes yet. Votes appear once voting opens.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dick of the day votes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rankedDodLeaderboard.map((entry) => (
            <div
              key={entry.playerId}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  {entry.rankLabel}
                </div>
                <div className="font-semibold">{entry.name}</div>
              </div>
              <div className="text-xs text-muted-foreground">{entry.points} pts</div>
            </div>
          ))}
          {rankedDodLeaderboard.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No votes yet. Votes appear once voting opens.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
