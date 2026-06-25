-- CreateTable
CREATE TABLE "Audit" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPhase" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "phaseName" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "industry" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "selectedEntityId" INTEGER,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "registrationNumber" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "role" VARCHAR(100),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "riskLevel" VARCHAR(20) NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "previousRisk" VARCHAR(20),
    "justification" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileType" VARCHAR(50) NOT NULL,
    "fileSize" INTEGER,
    "filePath" VARCHAR(500),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReview" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "reviewedBy" VARCHAR(100),
    "reviewedAt" TIMESTAMP(3),
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" SERIAL NOT NULL,
    "findingId" INTEGER NOT NULL,
    "documentId" INTEGER,
    "description" VARCHAR(500) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" SERIAL NOT NULL,
    "findingId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingAuditTrail" (
    "id" SERIAL NOT NULL,
    "findingId" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "changedBy" VARCHAR(100) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,

    CONSTRAINT "FindingAuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepConfiguration" (
    "id" SERIAL NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,
    "stepName" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "formSchema" JSONB NOT NULL,
    "dataConfig" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepData" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX "Audit_createdAt_idx" ON "Audit"("createdAt");

-- CreateIndex
CREATE INDEX "AuditPhase_auditId_idx" ON "AuditPhase"("auditId");

-- CreateIndex
CREATE INDEX "AuditPhase_status_idx" ON "AuditPhase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AuditPhase_auditId_phaseId_key" ON "AuditPhase"("auditId", "phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_auditId_key" ON "Client"("auditId");

-- CreateIndex
CREATE INDEX "Client_auditId_idx" ON "Client"("auditId");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Entity_clientId_idx" ON "Entity"("clientId");

-- CreateIndex
CREATE INDEX "Entity_type_idx" ON "Entity"("type");

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_auditId_key" ON "RiskAssessment"("auditId");

-- CreateIndex
CREATE INDEX "RiskAssessment_auditId_idx" ON "RiskAssessment"("auditId");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskLevel_idx" ON "RiskAssessment"("riskLevel");

-- CreateIndex
CREATE INDEX "RiskAssessment_assessedAt_idx" ON "RiskAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "ChecklistItem_auditId_phaseId_stepId_idx" ON "ChecklistItem"("auditId", "phaseId", "stepId");

-- CreateIndex
CREATE INDEX "ChecklistItem_status_idx" ON "ChecklistItem"("status");

-- CreateIndex
CREATE INDEX "Document_auditId_idx" ON "Document"("auditId");

-- CreateIndex
CREATE INDEX "Document_fileType_idx" ON "Document"("fileType");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReview_documentId_key" ON "DocumentReview"("documentId");

-- CreateIndex
CREATE INDEX "DocumentReview_documentId_idx" ON "DocumentReview"("documentId");

-- CreateIndex
CREATE INDEX "DocumentReview_status_idx" ON "DocumentReview"("status");

-- CreateIndex
CREATE INDEX "Finding_auditId_idx" ON "Finding"("auditId");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "Evidence_findingId_idx" ON "Evidence"("findingId");

-- CreateIndex
CREATE INDEX "Evidence_documentId_idx" ON "Evidence"("documentId");

-- CreateIndex
CREATE INDEX "Evidence_type_idx" ON "Evidence"("type");

-- CreateIndex
CREATE INDEX "Recommendation_findingId_idx" ON "Recommendation"("findingId");

-- CreateIndex
CREATE INDEX "Recommendation_priority_idx" ON "Recommendation"("priority");

-- CreateIndex
CREATE INDEX "Recommendation_status_idx" ON "Recommendation"("status");

-- CreateIndex
CREATE INDEX "FindingAuditTrail_findingId_idx" ON "FindingAuditTrail"("findingId");

-- CreateIndex
CREATE INDEX "FindingAuditTrail_changedAt_idx" ON "FindingAuditTrail"("changedAt");

-- CreateIndex
CREATE INDEX "StepConfiguration_isActive_idx" ON "StepConfiguration"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StepConfiguration_phaseId_stepId_key" ON "StepConfiguration"("phaseId", "stepId");

-- CreateIndex
CREATE INDEX "StepData_auditId_idx" ON "StepData"("auditId");

-- CreateIndex
CREATE UNIQUE INDEX "StepData_auditId_phaseId_stepId_key" ON "StepData"("auditId", "phaseId", "stepId");

-- AddForeignKey
ALTER TABLE "AuditPhase" ADD CONSTRAINT "AuditPhase_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReview" ADD CONSTRAINT "DocumentReview_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingAuditTrail" ADD CONSTRAINT "FindingAuditTrail_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepData" ADD CONSTRAINT "StepData_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
