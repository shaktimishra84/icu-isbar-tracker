"use server";

import { PatientDisposition, PatientStatus, SuggestionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { containsDisallowedContent } from "@/lib/deid";
import { generateDischargeSummaryWithLlm, LlmConfigurationError } from "@/lib/discharge-summary";
import { prisma } from "@/lib/prisma";
import { generateConservativeSuggestions } from "@/lib/suggestions";

function parseStatus(value: FormDataEntryValue | null): PatientStatus {
  if (value === PatientStatus.STABLE || value === PatientStatus.WATCH || value === PatientStatus.CRITICAL) {
    return value;
  }

  throw new Error("Invalid status value");
}

function parseDisposition(value: FormDataEntryValue | null): PatientDisposition {
  if (
    value === PatientDisposition.ACTIVE ||
    value === PatientDisposition.DISCHARGED ||
    value === PatientDisposition.SHIFT_OUT ||
    value === PatientDisposition.DAMA ||
    value === PatientDisposition.DEATH
  ) {
    return value;
  }

  throw new Error("Invalid disposition value");
}

function parseCareDay(formData: FormData, key: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("Invalid care day");
  }

  return parsed;
}

function requiredText(formData: FormData, key: string): string {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value;
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

export async function updatePatientStatusAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "").trim();

  if (!patientId) {
    redirect("/patients");
  }

  const status = parseStatus(formData.get("status"));

  await prisma.patient.update({
    where: { id: patientId },
    data: { status },
  });

  revalidatePath("/patients");
  revalidatePath("/rounding-sheet");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function updatePatientDispositionAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "").trim();

  if (!patientId) {
    redirect("/patients");
  }

  const disposition = parseDisposition(formData.get("disposition"));

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      disposition,
      isActive: disposition === PatientDisposition.ACTIVE,
    },
  });

  revalidatePath("/patients");
  revalidatePath("/rounding-sheet");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function markSuggestionAddressedAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "").trim();
  const suggestionId = String(formData.get("suggestionId") ?? "").trim();

  if (!patientId || !suggestionId) {
    redirect("/patients");
  }

  await prisma.suggestion.updateMany({
    where: {
      id: suggestionId,
      patientId,
      status: SuggestionStatus.PENDING,
    },
    data: {
      status: SuggestionStatus.ADDRESSED,
    },
  });

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  revalidatePath("/rounding-sheet");
  redirect(`/patients/${patientId}`);
}

export async function addIsbarAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "").trim();

  if (!patientId) {
    redirect("/patients");
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, latestCareDay: true, disposition: true },
  });

  if (!patient) {
    redirect("/patients");
  }

  if (patient.disposition !== PatientDisposition.ACTIVE) {
    redirect(`/patients/${patientId}?error=inactive_case`);
  }

  try {
    const identification = requiredText(formData, "identification");
    const situation = requiredText(formData, "situation");
    const background = requiredText(formData, "background");
    const assessment = requiredText(formData, "assessment");
    const recommendation = requiredText(formData, "recommendation");
    const labsSummary = requiredText(formData, "labsSummary");
    const imagingSummary = requiredText(formData, "imagingSummary");

    const deidCheck = containsDisallowedContent([
      identification,
      situation,
      background,
      assessment,
      recommendation,
      labsSummary,
      imagingSummary,
    ]);

    if (deidCheck.blocked) {
      throw new Error("__DEID_BLOCK__");
    }

    const flagHemodynamicInstability = checked(formData, "flagHemodynamicInstability");
    const flagRespiratoryConcern = checked(formData, "flagRespiratoryConcern");
    const flagNeurologicChange = checked(formData, "flagNeurologicChange");
    const flagSepsisConcern = checked(formData, "flagSepsisConcern");
    const flagLowUrineOutput = checked(formData, "flagLowUrineOutput");
    const flagUncontrolledPain = checked(formData, "flagUncontrolledPain");

    const careDay = patient.latestCareDay + 1;

    const suggestionDrafts = generateConservativeSuggestions({
      identification,
      situation,
      background,
      assessment,
      recommendation,
      labsSummary,
      imagingSummary,
      flagHemodynamicInstability,
      flagRespiratoryConcern,
      flagNeurologicChange,
      flagSepsisConcern,
      flagLowUrineOutput,
      flagUncontrolledPain,
    });

    await prisma.$transaction(async (tx) => {
      const createdIsbar = await tx.isbarEntry.create({
        data: {
          patientId,
          careDay,
          identification,
          situation,
          background,
          assessment,
          recommendation,
          labsSummary,
          imagingSummary,
          flagHemodynamicInstability,
          flagRespiratoryConcern,
          flagNeurologicChange,
          flagSepsisConcern,
          flagLowUrineOutput,
          flagUncontrolledPain,
        },
        select: { id: true },
      });

      if (suggestionDrafts.length > 0) {
        await tx.suggestion.createMany({
          data: suggestionDrafts.map((suggestion) => ({
            patientId,
            careDay,
            isbarId: createdIsbar.id,
            category: suggestion.category,
            content: suggestion.content,
            rationale: suggestion.rationale,
          })),
        });
      }

      await tx.patient.update({
        where: { id: patientId },
        data: { latestCareDay: careDay },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "__DEID_BLOCK__") {
      redirect(`/patients/${patientId}?error=deid`);
    }

    redirect(`/patients/${patientId}?error=isbar_validation`);
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  revalidatePath("/rounding-sheet");
  redirect(`/patients/${patientId}?saved=1`);
}

export async function upsertDailyProgressAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "").trim();

  if (!patientId) {
    redirect("/patients");
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, latestCareDay: true, disposition: true },
  });

  if (!patient) {
    redirect("/patients");
  }

  if (patient.disposition !== PatientDisposition.ACTIVE) {
    redirect(`/patients/${patientId}?error=inactive_case`);
  }

  try {
    const careDay = parseCareDay(formData, "careDay");

    if (careDay > Math.max(1, patient.latestCareDay)) {
      throw new Error("__BAD_CARE_DAY__");
    }

    const progressSummary = requiredText(formData, "progressSummary");
    const keyEvents = requiredText(formData, "keyEvents");
    const currentSupports = requiredText(formData, "currentSupports");
    const pendingIssues = requiredText(formData, "pendingIssues");
    const nextPlan = requiredText(formData, "nextPlan");

    const deidCheck = containsDisallowedContent([
      progressSummary,
      keyEvents,
      currentSupports,
      pendingIssues,
      nextPlan,
    ]);

    if (deidCheck.blocked) {
      throw new Error("__DEID_BLOCK__");
    }

    await prisma.dailyProgress.upsert({
      where: {
        patientId_careDay: {
          patientId,
          careDay,
        },
      },
      create: {
        patientId,
        careDay,
        progressSummary,
        keyEvents,
        currentSupports,
        pendingIssues,
        nextPlan,
      },
      update: {
        progressSummary,
        keyEvents,
        currentSupports,
        pendingIssues,
        nextPlan,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "__DEID_BLOCK__") {
      redirect(`/patients/${patientId}?error=deid`);
    }

    if (error instanceof Error && error.message === "__BAD_CARE_DAY__") {
      redirect(`/patients/${patientId}?error=progress_day`);
    }

    redirect(`/patients/${patientId}?error=progress_validation`);
  }

  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}?progress_saved=1`);
}

export async function generateDischargeSummaryAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "").trim();

  if (!patientId) {
    redirect("/patients");
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      isbars: {
        orderBy: { careDay: "asc" },
      },
      dailyProgresses: {
        orderBy: { careDay: "asc" },
      },
    },
  });

  if (!patient) {
    redirect("/patients");
  }

  if (patient.disposition === PatientDisposition.ACTIVE) {
    redirect(`/patients/${patientId}?error=summary_requires_outcome`);
  }

  if (patient.isbars.length === 0 && patient.dailyProgresses.length === 0) {
    redirect(`/patients/${patientId}?error=summary_no_data`);
  }

  try {
    const generated = await generateDischargeSummaryWithLlm({
      patientId: patient.id,
      unit: patient.unit,
      finalOutcome: patient.disposition,
      finalStatus: patient.status,
      latestCareDay: patient.latestCareDay,
      isbarTimeline: patient.isbars.map((item) => ({
        careDay: item.careDay,
        identification: item.identification,
        situation: item.situation,
        background: item.background,
        assessment: item.assessment,
        recommendation: item.recommendation,
        labsSummary: item.labsSummary,
        imagingSummary: item.imagingSummary,
      })),
      dailyProgressTimeline: patient.dailyProgresses.map((item) => ({
        careDay: item.careDay,
        progressSummary: item.progressSummary,
        keyEvents: item.keyEvents,
        currentSupports: item.currentSupports,
        pendingIssues: item.pendingIssues,
        nextPlan: item.nextPlan,
      })),
    });

    await prisma.patient.update({
      where: { id: patientId },
      data: {
        dischargeSummaryText: generated,
        dischargeSummaryVersion: { increment: 1 },
      },
    });
  } catch (error) {
    if (error instanceof LlmConfigurationError) {
      redirect(`/patients/${patientId}?error=llm_not_configured`);
    }

    redirect(`/patients/${patientId}?error=summary_failed`);
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  redirect(`/patients/${patientId}?summary_saved=1`);
}
