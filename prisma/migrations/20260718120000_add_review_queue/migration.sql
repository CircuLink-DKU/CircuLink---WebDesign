-- Add review moderation queue and decision audit trail.

CREATE TABLE "ReviewQueue" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "flags" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "assignedReviewerId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reasonCode" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewQueue_targetType_targetId_idx" ON "ReviewQueue"("targetType", "targetId");
CREATE INDEX "ReviewQueue_submissionType_idx" ON "ReviewQueue"("submissionType");
CREATE INDEX "ReviewQueue_submittedById_idx" ON "ReviewQueue"("submittedById");
CREATE INDEX "ReviewQueue_status_idx" ON "ReviewQueue"("status");
CREATE INDEX "ReviewQueue_riskLevel_idx" ON "ReviewQueue"("riskLevel");
CREATE INDEX "ReviewQueue_assignedReviewerId_idx" ON "ReviewQueue"("assignedReviewerId");
CREATE INDEX "ReviewQueue_reviewedById_idx" ON "ReviewQueue"("reviewedById");
CREATE INDEX "ReviewQueue_createdAt_idx" ON "ReviewQueue"("createdAt");

CREATE INDEX "ReviewDecision_reviewId_idx" ON "ReviewDecision"("reviewId");
CREATE INDEX "ReviewDecision_reviewerId_idx" ON "ReviewDecision"("reviewerId");
CREATE INDEX "ReviewDecision_decision_idx" ON "ReviewDecision"("decision");
CREATE INDEX "ReviewDecision_createdAt_idx" ON "ReviewDecision"("createdAt");

ALTER TABLE "ReviewQueue"
ADD CONSTRAINT "ReviewQueue_submittedById_fkey"
FOREIGN KEY ("submittedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReviewQueue"
ADD CONSTRAINT "ReviewQueue_assignedReviewerId_fkey"
FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewQueue"
ADD CONSTRAINT "ReviewQueue_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewDecision"
ADD CONSTRAINT "ReviewDecision_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "ReviewQueue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewDecision"
ADD CONSTRAINT "ReviewDecision_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
