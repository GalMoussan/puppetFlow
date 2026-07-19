-- Add new block types to BlockType enum
ALTER TYPE "BlockType" ADD VALUE 'GLITCH_EFFECT';
ALTER TYPE "BlockType" ADD VALUE 'SOUND_CUE';
ALTER TYPE "BlockType" ADD VALUE 'TEXT_OVERLAY';
ALTER TYPE "BlockType" ADD VALUE 'EXPLAINER_VISUAL';
ALTER TYPE "BlockType" ADD VALUE 'CHOREO_BEAT';
ALTER TYPE "BlockType" ADD VALUE 'STORY_BEAT';
ALTER TYPE "BlockType" ADD VALUE 'EMOTION_MARKER';

-- CreateEnum
CREATE TYPE "PresetCategory" AS ENUM ('FESTIVAL', 'BRAINROT', 'EDUCATIONAL', 'DANCE', 'NARRATIVE', 'EXPERIMENTAL');

-- CreateTable
CREATE TABLE "TemplatePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "PresetCategory" NOT NULL,
    "canonOverrides" JSONB NOT NULL DEFAULT '{}',
    "defaultRunConfig" JSONB NOT NULL DEFAULT '{}',
    "defaultBlocks" JSONB NOT NULL DEFAULT '[]',
    "thumbnailUrl" TEXT,
    "guidelines" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplatePreset_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FlowTemplate" ADD COLUMN "presetId" TEXT;

-- CreateIndex
CREATE INDEX "TemplatePreset_category_idx" ON "TemplatePreset"("category");

-- CreateIndex
CREATE INDEX "TemplatePreset_isSystem_idx" ON "TemplatePreset"("isSystem");

-- CreateIndex
CREATE INDEX "FlowTemplate_presetId_idx" ON "FlowTemplate"("presetId");

-- AddForeignKey
ALTER TABLE "FlowTemplate" ADD CONSTRAINT "FlowTemplate_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "TemplatePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
