import { PatientDisposition, PatientStatus, Unit } from "@prisma/client";

export const unitOptions: Array<{ value: Unit; label: string }> = [
  { value: Unit.BHUBANESWAR, label: "Bhubaneswar" },
  { value: Unit.BERHAMPUR, label: "Berhampur" },
];

export const statusOptions: Array<{ value: PatientStatus; label: string }> = [
  { value: PatientStatus.STABLE, label: "Stable" },
  { value: PatientStatus.WATCH, label: "Watch" },
  { value: PatientStatus.CRITICAL, label: "Critical" },
];

export const dispositionOptions: Array<{ value: PatientDisposition; label: string }> = [
  { value: PatientDisposition.ACTIVE, label: "Active" },
  { value: PatientDisposition.DISCHARGED, label: "Discharged" },
  { value: PatientDisposition.SHIFT_OUT, label: "Shift out" },
  { value: PatientDisposition.DAMA, label: "DAMA" },
  { value: PatientDisposition.DEATH, label: "Death" },
];

const statusClassMap: Record<PatientStatus, string> = {
  STABLE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  WATCH: "bg-amber-100 text-amber-800 ring-amber-200",
  CRITICAL: "bg-rose-100 text-rose-800 ring-rose-200",
};

const dispositionClassMap: Record<PatientDisposition, string> = {
  ACTIVE: "bg-teal-100 text-teal-800 ring-teal-200",
  DISCHARGED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  SHIFT_OUT: "bg-sky-100 text-sky-800 ring-sky-200",
  DAMA: "bg-amber-100 text-amber-800 ring-amber-200",
  DEATH: "bg-slate-200 text-slate-800 ring-slate-300",
};

export function getUnitLabel(unit: Unit): string {
  return unitOptions.find((option) => option.value === unit)?.label ?? unit;
}

export function getStatusLabel(status: PatientStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getStatusTagClass(status: PatientStatus): string {
  return statusClassMap[status];
}

export function getDispositionLabel(disposition: PatientDisposition): string {
  return dispositionOptions.find((option) => option.value === disposition)?.label ?? disposition;
}

export function getDispositionTagClass(disposition: PatientDisposition): string {
  return dispositionClassMap[disposition];
}
