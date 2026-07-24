-- Allow anonymous/parent votes: userId becomes optional, and a separate
-- unique index on (artworkId, voterSession) is the dedup key for anonymous
-- voters (a nullable userId can't carry that job - Postgres treats each NULL
-- as distinct in a unique index).
ALTER TABLE "Vote" ALTER COLUMN "userId" DROP NOT NULL;

CREATE UNIQUE INDEX "Vote_artworkId_voterSession_key" ON "Vote"("artworkId", "voterSession");
