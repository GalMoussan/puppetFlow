-- Add usage analytics fields to Run
ALTER TABLE "Run" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "Run" ADD COLUMN "outputTokens" INTEGER;
ALTER TABLE "Run" ADD COLUMN "totalTokens" INTEGER;
ALTER TABLE "Run" ADD COLUMN "estimatedCost" DECIMAL(10, 6);
ALTER TABLE "Run" ADD COLUMN "durationMs" INTEGER;

-- Add currentVersion field to FlowTemplate
ALTER TABLE "FlowTemplate" ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "TemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "graph" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateVersion_templateId_idx" ON "TemplateVersion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateVersion_templateId_version_key" ON "TemplateVersion"("templateId", "version");

-- AddForeignKey
ALTER TABLE "TemplateVersion" ADD CONSTRAINT "TemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FlowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
