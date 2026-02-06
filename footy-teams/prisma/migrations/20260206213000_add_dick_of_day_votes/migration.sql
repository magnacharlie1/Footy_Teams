CREATE TABLE "DickOfDayVote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "votedGroupPlayerId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DickOfDayVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DickOfDayVote_sessionId_voterUserId_key" ON "DickOfDayVote"("sessionId", "voterUserId");
CREATE INDEX "DickOfDayVote_votedGroupPlayerId_idx" ON "DickOfDayVote"("votedGroupPlayerId");

ALTER TABLE "DickOfDayVote" ADD CONSTRAINT "DickOfDayVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MatchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DickOfDayVote" ADD CONSTRAINT "DickOfDayVote_voterUserId_fkey" FOREIGN KEY ("voterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DickOfDayVote" ADD CONSTRAINT "DickOfDayVote_votedGroupPlayerId_fkey" FOREIGN KEY ("votedGroupPlayerId") REFERENCES "GroupPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
