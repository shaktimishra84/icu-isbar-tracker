import Link from "next/link";

import { PatientDisposition, SuggestionStatus, Unit } from "@prisma/client";

import {
  getDispositionLabel,
  getDispositionTagClass,
  getStatusLabel,
  getStatusTagClass,
  getUnitLabel,
  statusOptions,
  unitOptions,
} from "@/lib/options";
import { prisma } from "@/lib/prisma";

import { createPatientAction } from "./actions";

export const dynamic = "force-dynamic";

type PatientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const params = await searchParams;
  const selectedUnit = typeof params.unit === "string" ? params.unit : "ALL";
  const selectedView = typeof params.view === "string" ? params.view : "ACTIVE";
  const unitFilter = selectedUnit === Unit.BHUBANESWAR || selectedUnit === Unit.BERHAMPUR ? selectedUnit : undefined;
  const viewFilter = selectedView === "ACTIVE" || selectedView === "CLOSED" || selectedView === "ALL" ? selectedView : "ACTIVE";

  const whereClause: NonNullable<Parameters<typeof prisma.patient.findMany>[0]>["where"] = {
    ...(unitFilter ? { unit: unitFilter } : {}),
  };

  if (viewFilter === "ACTIVE") {
    whereClause.disposition = PatientDisposition.ACTIVE;
  } else if (viewFilter === "CLOSED") {
    whereClause.NOT = {
      disposition: PatientDisposition.ACTIVE,
    };
  }

  const patients = await prisma.patient.findMany({
    where: whereClause,
    orderBy: [{ unit: "asc" }, { id: "asc" }],
    include: {
      isbars: {
        orderBy: { careDay: "desc" },
        take: 1,
      },
      suggestions: {
        where: { status: SuggestionStatus.PENDING },
        select: {
          id: true,
          careDay: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Patient List</h1>
        <p className="mt-1 text-sm text-slate-600">
          De-identified tracker using internal random IDs only (no patient identifiers stored).
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <form method="get" className="space-y-2 rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold">Filter list</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="unit" defaultValue={unitFilter ?? "ALL"} className="w-full">
                <option value="ALL">All units</option>
                {unitOptions.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <select name="view" defaultValue={viewFilter} className="w-full">
                <option value="ACTIVE">Active only</option>
                <option value="CLOSED">Closed only</option>
                <option value="ALL">All outcomes</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Apply
              </button>
            </div>
          </form>

          <form action={createPatientAction} className="space-y-2 rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold">Add patient</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="unit" defaultValue={Unit.BHUBANESWAR} className="w-full" required>
                {unitOptions.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={"WATCH"} className="w-full" required>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Create random patient ID
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => {
          const latestIsbar = patient.isbars[0];
          const pendingTotal = patient.suggestions.length;
          const pendingCurrentDay = patient.suggestions.filter(
            (item) => item.careDay === patient.latestCareDay,
          ).length;

          return (
            <article key={patient.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Patient ID</p>
                  <p className="text-lg font-semibold">{patient.id}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getDispositionTagClass(
                      patient.disposition,
                    )}`}
                  >
                    {getDispositionLabel(patient.disposition)}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusTagClass(
                      patient.status,
                    )}`}
                  >
                    {getStatusLabel(patient.status)}
                  </span>
                </div>
              </div>

              <dl className="mt-4 space-y-1 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <dt>Unit</dt>
                  <dd className="font-medium">{getUnitLabel(patient.unit)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Latest care day</dt>
                  <dd className="font-medium">{patient.latestCareDay > 0 ? `D${patient.latestCareDay}` : "No ISBAR yet"}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Pending suggestions</dt>
                  <dd className="font-medium">{pendingTotal}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Pending (latest day)</dt>
                  <dd className="font-medium">{patient.latestCareDay > 0 ? pendingCurrentDay : 0}</dd>
                </div>
              </dl>

              {latestIsbar ? (
                <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  <span className="font-semibold">Latest R:</span> {latestIsbar.recommendation.slice(0, 140)}
                  {latestIsbar.recommendation.length > 140 ? "…" : ""}
                </p>
              ) : null}

              <Link
                href={`/patients/${patient.id}`}
                className="mt-4 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Open detail
              </Link>
            </article>
          );
        })}
      </section>

      {patients.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          No patients found for the current filters.
        </section>
      ) : null}
    </div>
  );
}
