-- Guards because this database's migration history has drifted from its schema
-- (see prisma/migrations/0_init), so the column or index may already exist without
-- being recorded.
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;

-- Deliberately not UNIQUE: the duplicates report needs to be able to record two rows
-- that share content, which is the state it exists to surface.
CREATE INDEX IF NOT EXISTS "MediaAsset_contentHash_idx" ON "MediaAsset"("contentHash");
