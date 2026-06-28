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
    "address" VARCHAR(255),
    "website" VARCHAR(255),
    "taxId" VARCHAR(50),
    "fiscalYearEnd" TIMESTAMP(3),
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
    "description" TEXT,
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
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "fileName" VARCHAR(255),
    "documentType" VARCHAR(50) NOT NULL,
    "fileType" VARCHAR(50),
    "fileSize" INTEGER,
    "filePath" VARCHAR(500),
    "description" TEXT,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
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
    "category" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "assignedTo" VARCHAR(100),
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
    "source" VARCHAR(200),
    "documentPath" VARCHAR(500),
    "type" VARCHAR(50),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" SERIAL NOT NULL,
    "findingId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "targetDate" TIMESTAMP(3),
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
CREATE TABLE "PhaseConfiguration" (
    "id" SERIAL NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "phaseName" VARCHAR(100) NOT NULL,
    "phaseKey" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhaseConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepConfiguration" (
    "id" SERIAL NOT NULL,
    "stepKey" TEXT NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,
    "stepName" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "formSchema" JSONB NOT NULL,
    "dataConfig" JSONB NOT NULL,
    "businessRules" JSONB,
    "dependencies" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditStepStatus" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,
    "stepKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "blockedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditStepStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepData" (
    "id" SERIAL NOT NULL,
    "auditId" INTEGER NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "stepId" INTEGER NOT NULL,
    "stepKey" TEXT NOT NULL,
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
CREATE INDEX "ChecklistItem_auditId_idx" ON "ChecklistItem"("auditId");

-- CreateIndex
CREATE INDEX "ChecklistItem_category_idx" ON "ChecklistItem"("category");

-- CreateIndex
CREATE INDEX "ChecklistItem_priority_idx" ON "ChecklistItem"("priority");

-- CreateIndex
CREATE INDEX "ChecklistItem_isCompleted_idx" ON "ChecklistItem"("isCompleted");

-- CreateIndex
CREATE INDEX "Document_auditId_idx" ON "Document"("auditId");

-- CreateIndex
CREATE INDEX "Document_auditId_documentType_idx" ON "Document"("auditId", "documentType");

-- CreateIndex
CREATE INDEX "Document_uploadedAt_idx" ON "Document"("uploadedAt");

-- CreateIndex
CREATE INDEX "Document_isConfidential_idx" ON "Document"("isConfidential");

-- CreateIndex
CREATE INDEX "Document_fileType_idx" ON "Document"("fileType");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentReview_documentId_key" ON "DocumentReview"("documentId");

-- CreateIndex
CREATE INDEX "DocumentReview_documentId_idx" ON "DocumentReview"("documentId");

-- CreateIndex
CREATE INDEX "DocumentReview_status_idx" ON "DocumentReview"("status");

-- CreateIndex
CREATE INDEX "Finding_auditId_idx" ON "Finding"("auditId");

-- CreateIndex
CREATE INDEX "Finding_auditId_severity_idx" ON "Finding"("auditId", "severity");

-- CreateIndex
CREATE INDEX "Finding_auditId_status_idx" ON "Finding"("auditId", "status");

-- CreateIndex
CREATE INDEX "Finding_createdAt_idx" ON "Finding"("createdAt");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "Finding_category_idx" ON "Finding"("category");

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
CREATE UNIQUE INDEX "PhaseConfiguration_phaseId_key" ON "PhaseConfiguration"("phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseConfiguration_phaseKey_key" ON "PhaseConfiguration"("phaseKey");

-- CreateIndex
CREATE INDEX "PhaseConfiguration_displayOrder_idx" ON "PhaseConfiguration"("displayOrder");

-- CreateIndex
CREATE INDEX "PhaseConfiguration_isActive_idx" ON "PhaseConfiguration"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StepConfiguration_stepKey_key" ON "StepConfiguration"("stepKey");

-- CreateIndex
CREATE INDEX "StepConfiguration_phaseId_idx" ON "StepConfiguration"("phaseId");

-- CreateIndex
CREATE INDEX "StepConfiguration_stepKey_idx" ON "StepConfiguration"("stepKey");

-- CreateIndex
CREATE INDEX "StepConfiguration_isActive_idx" ON "StepConfiguration"("isActive");

-- CreateIndex
CREATE INDEX "StepConfiguration_version_idx" ON "StepConfiguration"("version");

-- CreateIndex
CREATE UNIQUE INDEX "StepConfiguration_phaseId_stepId_key" ON "StepConfiguration"("phaseId", "stepId");

-- CreateIndex
CREATE INDEX "AuditStepStatus_auditId_idx" ON "AuditStepStatus"("auditId");

-- CreateIndex
CREATE INDEX "AuditStepStatus_auditId_status_idx" ON "AuditStepStatus"("auditId", "status");

-- CreateIndex
CREATE INDEX "AuditStepStatus_stepKey_idx" ON "AuditStepStatus"("stepKey");

-- CreateIndex
CREATE INDEX "AuditStepStatus_auditId_phaseId_idx" ON "AuditStepStatus"("auditId", "phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditStepStatus_auditId_phaseId_stepId_key" ON "AuditStepStatus"("auditId", "phaseId", "stepId");

-- CreateIndex
CREATE INDEX "StepData_auditId_idx" ON "StepData"("auditId");

-- CreateIndex
CREATE INDEX "StepData_auditId_phaseId_idx" ON "StepData"("auditId", "phaseId");

-- CreateIndex
CREATE INDEX "StepData_stepKey_idx" ON "StepData"("stepKey");

-- CreateIndex
CREATE INDEX "StepData_updatedAt_idx" ON "StepData"("updatedAt");

-- CreateIndex
CREATE INDEX "StepData_auditId_stepKey_idx" ON "StepData"("auditId", "stepKey");

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
ALTER TABLE "AuditStepStatus" ADD CONSTRAINT "AuditStepStatus_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepData" ADD CONSTRAINT "StepData_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
