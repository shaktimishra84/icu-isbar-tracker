-- De-identified ICU ISBAR tracker schema (no names/MRN/DOB/exact dates)

CREATE TABLE "Patient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "unit" TEXT NOT NULL CHECK ("unit" IN ('BHUBANESWAR', 'BERHAMPUR')),
  "status" TEXT NOT NULL DEFAULT 'WATCH' CHECK ("status" IN ('STABLE', 'WATCH', 'CRITICAL')),
  "disposition" TEXT NOT NULL DEFAULT 'ACTIVE' CHECK ("disposition" IN ('ACTIVE', 'DISCHARGED', 'SHIFT_OUT', 'DAMA', 'DEATH')),
  "latestCareDay" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "dischargeSummaryText" TEXT,
  "dischargeSummaryVersion" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "IsbarEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "careDay" INTEGER NOT NULL,
  "identification" TEXT NOT NULL,
  "situation" TEXT NOT NULL,
  "background" TEXT NOT NULL,
  "assessment" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "labsSummary" TEXT NOT NULL,
  "imagingSummary" TEXT NOT NULL,
  "flagHemodynamicInstability" BOOLEAN NOT NULL DEFAULT false,
  "flagRespiratoryConcern" BOOLEAN NOT NULL DEFAULT false,
  "flagNeurologicChange" BOOLEAN NOT NULL DEFAULT false,
  "flagSepsisConcern" BOOLEAN NOT NULL DEFAULT false,
  "flagLowUrineOutput" BOOLEAN NOT NULL DEFAULT false,
  "flagUncontrolledPain" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "IsbarEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Suggestion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "isbarId" TEXT,
  "careDay" INTEGER NOT NULL,
  "category" TEXT NOT NULL CHECK ("category" IN ('INVESTIGATION', 'IMAGING', 'CONSULTATION', 'DIFFERENTIAL')),
  "content" TEXT NOT NULL,
  "rationale" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'ADDRESSED')),
  CONSTRAINT "Suggestion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Suggestion_isbarId_fkey" FOREIGN KEY ("isbarId") REFERENCES "IsbarEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "DailyProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "careDay" INTEGER NOT NULL,
  "progressSummary" TEXT NOT NULL,
  "keyEvents" TEXT NOT NULL,
  "currentSupports" TEXT NOT NULL,
  "pendingIssues" TEXT NOT NULL,
  "nextPlan" TEXT NOT NULL,
  CONSTRAINT "DailyProgress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IsbarEntry_patientId_careDay_key" ON "IsbarEntry"("patientId", "careDay");
CREATE INDEX "IsbarEntry_patientId_careDay_idx" ON "IsbarEntry"("patientId", "careDay");
CREATE INDEX "Suggestion_patientId_careDay_status_idx" ON "Suggestion"("patientId", "careDay", "status");
CREATE UNIQUE INDEX "DailyProgress_patientId_careDay_key" ON "DailyProgress"("patientId", "careDay");
CREATE INDEX "DailyProgress_patientId_careDay_idx" ON "DailyProgress"("patientId", "careDay");
