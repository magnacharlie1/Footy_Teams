import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function parseSegments(path: string) {
  return path.split("/").filter(Boolean);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathname = url.searchParams.get("path") ?? "";

  if (!pathname.startsWith("/")) {
    return NextResponse.json({ labels: {} });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ labels: {} }, { status: 401 });
  }

  const segments = parseSegments(pathname);
  let groupId: string | undefined;
  let sessionId: string | undefined;
  let playerId: string | undefined;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const parent = segments[i - 1];
    if (parent === "groups") groupId = segment;
    if (parent === "sessions") sessionId = segment;
    if (parent === "players") playerId = segment;
  }

  if (!groupId && !sessionId && !playerId) {
    return NextResponse.json({ labels: {} });
  }

  if (groupId) {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: session.user.id, isActive: true },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ labels: {} }, { status: 403 });
    }
  }

  const labels: Record<string, string> = {};

  if (groupId) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    if (group?.name) {
      labels[`/groups/${groupId}`] = group.name;
    }
  }

  if (sessionId) {
    const sessionRecord = await prisma.matchSession.findUnique({
      where: { id: sessionId },
      select: { sessionDate: true, groupId: true },
    });
    if (sessionRecord && (!groupId || sessionRecord.groupId === groupId)) {
      labels[`/groups/${sessionRecord.groupId}/sessions/${sessionId}`] =
        `Session ${sessionRecord.sessionDate.toLocaleDateString("en-GB")}`;
    }
  }

  if (playerId) {
    const player = await prisma.groupPlayer.findUnique({
      where: { id: playerId },
      select: { displayName: true, groupId: true },
    });
    if (player && (!groupId || player.groupId === groupId)) {
      labels[`/groups/${player.groupId}/players/${playerId}`] = player.displayName;
    }
  }

  return NextResponse.json({ labels });
}
