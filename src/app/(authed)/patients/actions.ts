"use server";

import crypto from "node:crypto";

import { PatientDisposition, PatientStatus, Unit } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

function parseUnit(value: FormDataEntryValue | null): Unit {
  if (value === Unit.BHUBANESWAR || value === Unit.BERHAMPUR) {
    return value;
  }

  throw new Error("Invalid unit value.");
}

function parseStatus(value: FormDataEntryValue | null): PatientStatus {
  if (value === PatientStatus.STABLE || value === PatientStatus.WATCH || value === PatientStatus.CRITICAL) {
    return value;
  }

  throw new Error("Invalid status value.");
}

function randomPatientId(): string {
  return `PT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function createUniquePatientId(): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const candidate = randomPatientId();
    const exists = await prisma.patient.findUnique({ where: { id: candidate }, select: { id: true } });

    if (!exists) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique patient ID.");
}

export async function createPatientAction(formData: FormData): Promise<void> {
  const unit = parseUnit(formData.get("unit"));
  const status = parseStatus(formData.get("status"));
  const id = await createUniquePatientId();

  await prisma.patient.create({
    data: {
      id,
      unit,
      status,
      disposition: PatientDisposition.ACTIVE,
      isActive: true,
    },
  });

  revalidatePath("/patients");
  redirect(`/patients/${id}`);
}
