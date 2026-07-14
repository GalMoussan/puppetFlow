-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('THEME_PACK_REF', 'HOOK', 'CAMERA_MOVE', 'PUPPET_DYNAMIC', 'PUPPET_VISUAL', 'PHYSICAL_GAG', 'CHAOS_THREAD', 'PAYOFF', 'SONG_SECTION', 'LANGUAGE', 'CHARACTER_LOCK', 'STYLE_LOCK', 'LOOP_CLOSURE', 'STAGE_AREA', 'FESTIVAL_MOMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'COMPILING', 'GENERATING', 'LINTING', 'REPAIRING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "ThemePack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canon" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockDefinition" (
    "id" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "name" TEXT NOT NULL,
    "promptFragment" TEXT NOT NULL,
    "stageScope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rotationGroup" TEXT,
    "themePackId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "themePackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "scaffold" TEXT,
    "error" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "combo" JSONB NOT NULL,
    "lyrics" TEXT NOT NULL,
    "imagePrompt" TEXT NOT NULL,
    "startPrompt" TEXT NOT NULL,
    "middlePrompt" TEXT NOT NULL,
    "endPrompt" TEXT NOT NULL,
    "boundaryFrame1" TEXT NOT NULL,
    "boundaryFrame2" TEXT NOT NULL,
    "finalFrame" TEXT NOT NULL,
    "lintReport" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "comboHash" TEXT NOT NULL,
    "axes" JSONB NOT NULL,
    "sceneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThemePack_name_key" ON "ThemePack"("name");

-- CreateIndex
CREATE INDEX "ThemePack_active_idx" ON "ThemePack"("active");

-- CreateIndex
CREATE INDEX "BlockDefinition_themePackId_idx" ON "BlockDefinition"("themePackId");

-- CreateIndex
CREATE INDEX "BlockDefinition_type_idx" ON "BlockDefinition"("type");

-- CreateIndex
CREATE INDEX "BlockDefinition_rotationGroup_idx" ON "BlockDefinition"("rotationGroup");

-- CreateIndex
CREATE INDEX "BlockDefinition_archived_idx" ON "BlockDefinition"("archived");

-- CreateIndex
CREATE INDEX "FlowTemplate_themePackId_idx" ON "FlowTemplate"("themePackId");

-- CreateIndex
CREATE INDEX "Run_templateId_idx" ON "Run"("templateId");

-- CreateIndex
CREATE INDEX "Run_status_idx" ON "Run"("status");

-- CreateIndex
CREATE INDEX "Run_createdAt_idx" ON "Run"("createdAt");

-- CreateIndex
CREATE INDEX "Scene_runId_idx" ON "Scene"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_runId_index_key" ON "Scene"("runId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLog_sceneId_key" ON "UsageLog"("sceneId");

-- CreateIndex
CREATE INDEX "UsageLog_comboHash_runDate_idx" ON "UsageLog"("comboHash", "runDate");

-- CreateIndex
CREATE INDEX "UsageLog_runDate_idx" ON "UsageLog"("runDate");

-- AddForeignKey
ALTER TABLE "BlockDefinition" ADD CONSTRAINT "BlockDefinition_themePackId_fkey" FOREIGN KEY ("themePackId") REFERENCES "ThemePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowTemplate" ADD CONSTRAINT "FlowTemplate_themePackId_fkey" FOREIGN KEY ("themePackId") REFERENCES "ThemePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FlowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
