import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

import { auth } from "@/auth";
import { TeamBuilder } from "./team-builder";
import { prisma } from "@/lib/prisma";
import { aggregateLeagueStats, computeSessionStats } from "@/lib/scoring";
import { saveTeamsAction } from "./actions";
import { safeDisplayName } from "@/lib/player-name";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

async function loadGroupHistoryStats(groupId: string) {
  const cacheKey = `group-history-${groupId}`;
  const cached = unstable_cache(
    async () => {
      const history = await prisma.matchSession.findMany({
        where: { groupId },
        include: {
          fixtures: {
            select: {
              teamAId: true,
              teamBId: true,
              teamAScore: true,
              teamBScore: true,
            },
          },
          teams: {
            include: {
              assignments: { select: { groupPlayerId: true, teamId: true } },
            },
          },
        },
      });

      const sessionStats = history.flatMap((s) =>
        computeSessionStats({
          sessionId: s.id,
          fixtures: s.fixtures.map((f) => ({
            teamAId: f.teamAId,
            teamBId: f.teamBId,
            teamAScore: f.teamAScore,
            teamBScore: f.teamBScore,
          })),
          assignments: s.teams.flatMap((t) =>
            t.assignments.map((a) => ({
              playerId: a.groupPlayerId,
              teamId: a.teamId,
            })),
          ),
        }),
      );

      const leagueStats = aggregateLeagueStats(sessionStats);
      return {
        weightedLookupEntries: leagueStats.map((stat) => [
          stat.playerId,
          stat.weightedPoints,
        ]) as Array<[string, number]>,
      };
    },
    [cacheKey],
    { tags: [cacheKey] },
  );

  return cached();
}

export default async function TeamBuilderPage({ params }: Props) {
  const { groupId, sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [membership, matchSession, historyStats] = await Promise.all([
    prisma.groupMember.findFirst({
      where: { groupId, userId: session.user.id, isActive: true },
      select: { id: true, role: true, canEditTeams: true },
    }),
    prisma.matchSession.findUnique({
      where: { id: sessionId },
      include: {
        teamEditorMember: true,
        participants: {
          include: {
            player: { select: { displayName: true } },
          },
        },
        teams: {
          orderBy: { index: "asc" },
          include: {
            assignments: { select: { groupPlayerId: true, teamId: true } },
          },
        },
      },
    }),
    loadGroupHistoryStats(groupId),
  ]);
  if (!membership) notFound();
  if (!matchSession) notFound();

  const weightedLookup = new Map<string, number>(historyStats.weightedLookupEntries);

  const players = matchSession.participants.map((p) => {
    const currentTeamId = matchSession.teams.find((t) =>
      t.assignments.some((a) => a.groupPlayerId === p.groupPlayerId),
    )?.id;
    return {
      id: p.groupPlayerId,
      name: safeDisplayName(p.player.displayName),
      weightedPoints: weightedLookup.get(p.groupPlayerId) ?? 0,
      teamId: currentTeamId ?? null,
    };
  });
  const canEditTeams =
    membership.role === "ADMIN" ||
    membership.canEditTeams ||
    membership.id === matchSession.teamEditorMemberId;

  const saveAction = saveTeamsAction.bind(null, sessionId, groupId);

  return (
    <TeamBuilder
      canEdit={canEditTeams}
      numTeams={matchSession.numTeams as 2 | 4}
      teams={matchSession.teams.map((t) => ({
        id: t.id,
        label: t.label,
        index: t.index,
        kitType: t.kitType,
      }))}
      players={players}
      saveAction={saveAction}
    />
  );
}
