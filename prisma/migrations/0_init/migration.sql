-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GameGenre" AS ENUM ('BATTLE_ROYALE', 'TACTICAL_FPS', 'MOBA', 'FIGHTING', 'SPORTS');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('JOINED', 'LEFT', 'LOANED', 'BENCHED');

-- CreateEnum
CREATE TYPE "KraftonBoard" AS ENUM ('TEAM', 'PLAYER');

-- CreateTable
CREATE TABLE "GameFamily" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "genre" "GameGenre" NOT NULL,
    "developer" TEXT,
    "logoUrl" TEXT,
    "logoDarkUrl" TEXT,
    "bannerUrl" TEXT,
    "familyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "displayName" TEXT,
    "tag" TEXT,
    "logoUrl" TEXT,
    "imageDarkUrl" TEXT,
    "gameId" TEXT,
    "region" TEXT,
    "founded" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "sponsors" TEXT,
    "socialLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "ign" TEXT NOT NULL,
    "slug" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "nationality" TEXT,
    "role" TEXT,
    "birthDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "isPlayer" BOOLEAN NOT NULL DEFAULT true,
    "staffRole" TEXT,
    "gameId" TEXT,
    "socialLinks" JSONB,
    "currentTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fromTeamId" TEXT,
    "teamId" TEXT NOT NULL,
    "type" "TransferType" NOT NULL,
    "staffRole" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "type" TEXT DEFAULT 'PRIMARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "capacity" INTEGER,
    "mapUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentOrganizer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "TournamentOrganizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentSponsor" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "tier" TEXT,

    CONSTRAINT "TournamentSponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentVenue" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "stageName" TEXT,

    CONSTRAINT "TournamentVenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortName" TEXT,
    "series" TEXT,
    "season" TEXT,
    "seriesValue" INTEGER,
    "tier" TEXT NOT NULL,
    "rankingIncluded" BOOLEAN NOT NULL DEFAULT true,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "eventType" TEXT DEFAULT 'LAN',
    "gameMode" TEXT DEFAULT 'Squads TPP',
    "platform" TEXT DEFAULT 'Mobile',
    "device" TEXT,
    "region" TEXT,
    "countries" JSONB,
    "prizePool" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "usdRate" DOUBLE PRECISION,
    "prizeDistribution" JSONB,
    "qualifications" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "winnerTeamId" TEXT,
    "winner" TEXT,
    "runnerUpTeamId" TEXT,
    "runnerUp" TEXT,
    "imageUrl" TEXT,
    "imageDarkUrl" TEXT,
    "bannerUrl" TEXT,
    "liquipedia" TEXT,
    "socialLinks" JSONB,
    "formatDetails" JSONB,
    "standingsConfig" JSONB,
    "organizer" TEXT,
    "sponsors" TEXT,
    "mode" TEXT,
    "type" TEXT,
    "location" TEXT,
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentGame" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TournamentGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentStage" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "formatType" TEXT NOT NULL,
    "stageType" TEXT DEFAULT 'GROUPS_WISE',

    CONSTRAINT "TournamentStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentGroup" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TournamentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seed" INTEGER,
    "seedLabel" TEXT,
    "seedTournamentId" TEXT,
    "finalRank" INTEGER,
    "prizeWon" DOUBLE PRECISION,
    "logoUrl" TEXT,
    "logoDarkUrl" TEXT,
    "shortName" TEXT,
    "displayName" TEXT,
    "country" TEXT,
    "rosterJson" JSONB NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "stageId" TEXT,
    "groupId" TEXT,
    "gameId" TEXT NOT NULL,
    "matchNumber" INTEGER DEFAULT 1,
    "overallMatchNumber" INTEGER,
    "stageType" TEXT,
    "groupName" TEXT,
    "mapName" TEXT,
    "matchType" TEXT DEFAULT 'LAN',
    "format" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "matchTime" TEXT,
    "streamUrl" TEXT,
    "vods" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchGame" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "mapName" TEXT,
    "duration" INTEGER,

    CONSTRAINT "MatchGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchTeamResult" (
    "id" TEXT NOT NULL,
    "matchGameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "shortCode" TEXT,
    "mp" INTEGER NOT NULL DEFAULT 1,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "wwcd" BOOLEAN NOT NULL DEFAULT false,
    "placePoints" INTEGER NOT NULL DEFAULT 0,
    "elimsPoints" INTEGER NOT NULL DEFAULT 0,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "damage" DOUBLE PRECISION,
    "survivalTime" INTEGER,
    "healing" INTEGER,
    "damageReceived" DOUBLE PRECISION,
    "headshots" INTEGER,
    "assists" INTEGER,
    "knockouts" INTEGER,
    "longestElim" DOUBLE PRECISION,
    "vehicleElims" INTEGER,
    "grenadeElims" INTEGER,
    "smokesUsed" INTEGER,
    "grenadesUsed" INTEGER,
    "molotovsUsed" INTEGER,
    "flashUsed" INTEGER,
    "utilitiesTotal" INTEGER,
    "airdrops" INTEGER,
    "rescues" INTEGER,
    "distDrove" DOUBLE PRECISION,
    "distWalk" DOUBLE PRECISION,
    "totalDist" DOUBLE PRECISION,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "rawData" JSONB,

    CONSTRAINT "MatchTeamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPlayerStat" (
    "id" TEXT NOT NULL,
    "matchGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT,
    "shortCode" TEXT,
    "role" TEXT,
    "mp" INTEGER NOT NULL DEFAULT 1,
    "playerElims" INTEGER NOT NULL DEFAULT 0,
    "teamRank" INTEGER NOT NULL DEFAULT 0,
    "teamWwcd" BOOLEAN NOT NULL DEFAULT false,
    "teamPlacePoints" INTEGER NOT NULL DEFAULT 0,
    "teamElimsPoints" INTEGER NOT NULL DEFAULT 0,
    "teamBonusPoints" INTEGER NOT NULL DEFAULT 0,
    "teamTotalPoints" INTEGER NOT NULL DEFAULT 0,
    "damage" DOUBLE PRECISION,
    "survivalTime" INTEGER,
    "healing" INTEGER,
    "damageReceived" DOUBLE PRECISION,
    "headshots" INTEGER,
    "assists" INTEGER,
    "knockouts" INTEGER,
    "longestElim" DOUBLE PRECISION,
    "vehicleElims" INTEGER,
    "grenadeElims" INTEGER,
    "smokesUsed" INTEGER,
    "grenadesUsed" INTEGER,
    "molotovsUsed" INTEGER,
    "flashUsed" INTEGER,
    "utilitiesTotal" INTEGER,
    "airdrops" INTEGER,
    "rescues" INTEGER,
    "distDrove" DOUBLE PRECISION,
    "distWalk" DOUBLE PRECISION,
    "totalDist" DOUBLE PRECISION,
    "isMvp" BOOLEAN,
    "playerPowerplay" INTEGER,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER,
    "rawData" JSONB,

    CONSTRAINT "MatchPlayerStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subHeadline" TEXT,
    "excerpt" TEXT,
    "keyTakeaways" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "coverImageAlt" TEXT,
    "coverImageCaption" TEXT,
    "coverImageCredit" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorName" TEXT NOT NULL DEFAULT 'Esports Amaze Staff',
    "authorRole" TEXT DEFAULT 'Editor',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "readTimeMinutes" INTEGER NOT NULL DEFAULT 3,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "faqs" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "focusKeyword" TEXT,
    "secondaryKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tournamentId" TEXT,
    "teamId" TEXT,
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subHeadline" TEXT,
    "excerpt" TEXT,
    "keyTakeaways" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "coverImageAlt" TEXT,
    "coverImageCaption" TEXT,
    "coverImageCredit" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImage" TEXT,
    "focusKeyword" TEXT,
    "secondaryKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "faqs" JSONB,
    "playerId" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleReaction" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT 'Guest',
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparePick" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "picks" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComparePick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KraftonEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Tier 1',
    "tournamentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KraftonEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KraftonEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "board" "KraftonBoard" NOT NULL,
    "entityId" TEXT,
    "entityName" TEXT NOT NULL,
    "teamName" TEXT,
    "teamId" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "finishes" INTEGER NOT NULL DEFAULT 0,
    "mvp" INTEGER NOT NULL DEFAULT 0,
    "finalsMvp" INTEGER NOT NULL DEFAULT 0,
    "igl" INTEGER NOT NULL DEFAULT 0,
    "survivor" INTEGER NOT NULL DEFAULT 0,
    "emerging" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KraftonEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KraftonTransfer" (
    "id" TEXT NOT NULL,
    "fromTeamId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "toTeamId" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "cutoff" TIMESTAMP(3) NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'add',
    "amount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KraftonTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameFamily_slug_key" ON "GameFamily"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "Team_name_idx" ON "Team"("name");

-- CreateIndex
CREATE INDEX "Team_tag_idx" ON "Team"("tag");

-- CreateIndex
CREATE INDEX "Team_gameId_idx" ON "Team"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_slug_key" ON "Player"("slug");

-- CreateIndex
CREATE INDEX "Player_ign_idx" ON "Player"("ign");

-- CreateIndex
CREATE INDEX "Player_currentTeamId_idx" ON "Player"("currentTeamId");

-- CreateIndex
CREATE INDEX "Player_gameId_idx" ON "Player"("gameId");

-- CreateIndex
CREATE INDEX "Player_isPlayer_status_idx" ON "Player"("isPlayer", "status");

-- CreateIndex
CREATE INDEX "Transfer_playerId_idx" ON "Transfer"("playerId");

-- CreateIndex
CREATE INDEX "Transfer_fromTeamId_idx" ON "Transfer"("fromTeamId");

-- CreateIndex
CREATE INDEX "Transfer_teamId_idx" ON "Transfer"("teamId");

-- CreateIndex
CREATE INDEX "Transfer_date_idx" ON "Transfer"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_slug_key" ON "Organizer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_slug_key" ON "Sponsor"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentOrganizer_tournamentId_organizerId_key" ON "TournamentOrganizer"("tournamentId", "organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentSponsor_tournamentId_sponsorId_key" ON "TournamentSponsor"("tournamentId", "sponsorId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentVenue_tournamentId_venueId_key" ON "TournamentVenue"("tournamentId", "venueId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE INDEX "Tournament_status_startDate_idx" ON "Tournament"("status", "startDate");

-- CreateIndex
CREATE INDEX "Tournament_name_idx" ON "Tournament"("name");

-- CreateIndex
CREATE INDEX "Tournament_gameId_idx" ON "Tournament"("gameId");

-- CreateIndex
CREATE INDEX "Tournament_series_idx" ON "Tournament"("series");

-- CreateIndex
CREATE INDEX "TournamentGame_gameId_idx" ON "TournamentGame"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentGame_tournamentId_gameId_key" ON "TournamentGame"("tournamentId", "gameId");

-- CreateIndex
CREATE INDEX "TournamentTeam_teamId_idx" ON "TournamentTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_tournamentId_teamId_key" ON "TournamentTeam"("tournamentId", "teamId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_matchNumber_idx" ON "Match"("tournamentId", "matchNumber");

-- CreateIndex
CREATE INDEX "Match_stageId_idx" ON "Match"("stageId");

-- CreateIndex
CREATE INDEX "Match_groupId_idx" ON "Match"("groupId");

-- CreateIndex
CREATE INDEX "Match_status_scheduledAt_idx" ON "Match"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "MatchGame_matchId_idx" ON "MatchGame"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchGame_matchId_sequence_key" ON "MatchGame"("matchId", "sequence");

-- CreateIndex
CREATE INDEX "MatchTeamResult_teamId_idx" ON "MatchTeamResult"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchTeamResult_matchGameId_teamId_key" ON "MatchTeamResult"("matchGameId", "teamId");

-- CreateIndex
CREATE INDEX "MatchPlayerStat_playerId_idx" ON "MatchPlayerStat"("playerId");

-- CreateIndex
CREATE INDEX "MatchPlayerStat_teamId_idx" ON "MatchPlayerStat"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayerStat_matchGameId_playerId_key" ON "MatchPlayerStat"("matchGameId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_publishedAt_idx" ON "Article"("publishedAt");

-- CreateIndex
CREATE INDEX "Article_category_idx" ON "Article"("category");

-- CreateIndex
CREATE INDEX "Article_featured_idx" ON "Article"("featured");

-- CreateIndex
CREATE INDEX "Article_title_idx" ON "Article"("title");

-- CreateIndex
CREATE INDEX "Article_tournamentId_idx" ON "Article"("tournamentId");

-- CreateIndex
CREATE INDEX "Article_teamId_idx" ON "Article"("teamId");

-- CreateIndex
CREATE INDEX "Article_playerId_idx" ON "Article"("playerId");

-- CreateIndex
CREATE INDEX "ArticleRevision_articleId_createdAt_idx" ON "ArticleRevision"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleReaction_articleId_idx" ON "ArticleReaction"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleReaction_articleId_sessionId_kind_key" ON "ArticleReaction"("articleId", "sessionId", "kind");

-- CreateIndex
CREATE INDEX "Comment_articleId_status_idx" ON "Comment"("articleId", "status");

-- CreateIndex
CREATE INDEX "Comment_status_idx" ON "Comment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_filename_key" ON "MediaAsset"("filename");

-- CreateIndex
CREATE INDEX "ComparePick_entityType_picks_idx" ON "ComparePick"("entityType", "picks");

-- CreateIndex
CREATE UNIQUE INDEX "ComparePick_entityType_entityId_key" ON "ComparePick"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "KraftonEvent_endDate_idx" ON "KraftonEvent"("endDate");

-- CreateIndex
CREATE INDEX "KraftonEntry_board_entityId_idx" ON "KraftonEntry"("board", "entityId");

-- CreateIndex
CREATE INDEX "KraftonEntry_eventId_idx" ON "KraftonEntry"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "KraftonEntry_eventId_board_entityName_key" ON "KraftonEntry"("eventId", "board", "entityName");

-- CreateIndex
CREATE INDEX "KraftonTransfer_toTeamId_idx" ON "KraftonTransfer"("toTeamId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "GameFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_currentTeamId_fkey" FOREIGN KEY ("currentTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentOrganizer" ADD CONSTRAINT "TournamentOrganizer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentOrganizer" ADD CONSTRAINT "TournamentOrganizer_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSponsor" ADD CONSTRAINT "TournamentSponsor_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentSponsor" ADD CONSTRAINT "TournamentSponsor_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentVenue" ADD CONSTRAINT "TournamentVenue_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentVenue" ADD CONSTRAINT "TournamentVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_runnerUpTeamId_fkey" FOREIGN KEY ("runnerUpTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGame" ADD CONSTRAINT "TournamentGame_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGame" ADD CONSTRAINT "TournamentGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentStage" ADD CONSTRAINT "TournamentStage_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_seedTournamentId_fkey" FOREIGN KEY ("seedTournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchGame" ADD CONSTRAINT "MatchGame_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeamResult" ADD CONSTRAINT "MatchTeamResult_matchGameId_fkey" FOREIGN KEY ("matchGameId") REFERENCES "MatchGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeamResult" ADD CONSTRAINT "MatchTeamResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerStat" ADD CONSTRAINT "MatchPlayerStat_matchGameId_fkey" FOREIGN KEY ("matchGameId") REFERENCES "MatchGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerStat" ADD CONSTRAINT "MatchPlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPlayerStat" ADD CONSTRAINT "MatchPlayerStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRevision" ADD CONSTRAINT "ArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KraftonEvent" ADD CONSTRAINT "KraftonEvent_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KraftonEntry" ADD CONSTRAINT "KraftonEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "KraftonEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

