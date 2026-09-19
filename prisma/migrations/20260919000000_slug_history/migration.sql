-- Previous slugs for players, teams and tournaments, so a renamed entity's old
-- link can 301 to its current one instead of 404ing.
--
-- Guarded for the same reason as the other migrations: `db push` leaves
-- _prisma_migrations behind the schema, so the table or index may already exist
-- without being recorded here.
CREATE TABLE IF NOT EXISTS "SlugHistory" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "oldSlug" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlugHistory_pkey" PRIMARY KEY ("id")
);

-- The unique index is also the only read path (lookup by entityType + oldSlug),
-- so it serves both the constraint and the query.
CREATE UNIQUE INDEX IF NOT EXISTS "SlugHistory_entityType_oldSlug_key" ON "SlugHistory"("entityType", "oldSlug");
