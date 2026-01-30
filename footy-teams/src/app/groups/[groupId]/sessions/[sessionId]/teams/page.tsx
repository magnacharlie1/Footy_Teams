import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { TeamBuilder } from "./team-builder";
import { prisma } from "@/lib/prisma";
import { aggregateLeagueStats, computeSessionStats } from "@/lib/scoring";
import { saveTeamsAction } from "./actions";
import { safeDisplayName } from "@/lib/player-name";

type Props = {
  params: Promise<{ groupId: string; sessionId: string }>;
};

export default async function TeamBuilderPage({ params }: Props) {
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
      teamEditorMember: true,
      participants: { include: { player: true } },
      teams: {
        orderBy: { index: "asc" },
        include: {
          assignments: true,
        },
      },
    },
  });

  if (!matchSession) notFound();

  const history = await prisma.matchSession.findMany({
    where: { groupId },
    include: {
      fixtures: true,
      teams: { include: { assignments: true } },
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
  const weightedLookup = new Map<string, number>(
    leagueStats.map((stat) => [stat.playerId, stat.weightedPoints]),
  );

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
