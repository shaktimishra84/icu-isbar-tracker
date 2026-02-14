import { PatientDisposition, SuggestionCategory, SuggestionStatus, Unit } from "@prisma/client";

import { ExportPdfButton } from "@/components/export-pdf-button";
import { getStatusLabel, getStatusTagClass, getUnitLabel, unitOptions } from "@/lib/options";
import { prisma } from "@/lib/prisma";

const categoryLabel: Record<SuggestionCategory, string> = {
  INVESTIGATION: "Investigation",
  IMAGING: "Imaging",
  CONSULTATION: "Consultation",
  DIFFERENTIAL: "Missed differential",
};

export const dynamic = "force-dynamic";

type RoundingSheetProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoundingSheetPage({ searchParams }: RoundingSheetProps) {
  const params = await searchParams;
  const selectedUnit = typeof params.unit === "string" ? params.unit : "ALL";
  const unitFilter = selectedUnit === Unit.BHUBANESWAR || selectedUnit === Unit.BERHAMPUR ? selectedUnit : undefined;

  const patients = await prisma.patient.findMany({
    where: {
      disposition: PatientDisposition.ACTIVE,
      ...(unitFilter ? { unit: unitFilter } : {}),
    },
    orderBy: [{ unit: "asc" }, { id: "asc" }],
    include: {
      isbars: {
        orderBy: { careDay: "desc" },
        take: 1,
      },
      suggestions: {
        where: { status: SuggestionStatus.PENDING },
        orderBy: [{ careDay: "desc" }],
      },
    },
  });

  return (
    <div className="space-y-6">
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Unit Rounding Sheet</h1>
        <p className="mt-1 text-sm text-slate-600">
          Print-friendly handoff view showing each patient&apos;s latest R-plan and unresolved suggestions.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <form method="get" className="flex flex-wrap items-center gap-2">
            <select name="unit" defaultValue={unitFilter ?? "ALL"} className="w-full sm:w-64">
              <option value="ALL">All units</option>
              {unitOptions.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apply
            </button>
          </form>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">Open print dialog and save as PDF.</p>
            <ExportPdfButton />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {patients.map((patient) => {
          const latestIsbar = patient.isbars[0];
          const latestDay = patient.latestCareDay;
          const pendingForLatestDay = patient.suggestions.filter((item) => item.careDay === latestDay);

          return (
            <article key={patient.id} className="print-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Patient ID</p>
                  <p className="text-xl font-semibold">{patient.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {getUnitLabel(patient.unit)}
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

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 p-3">
                  <h2 className="text-sm font-semibold text-slate-700">Latest R (Recommendation)</h2>
                  {latestIsbar ? (
                    <>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Care day D{latestIsbar.careDay}
                      </p>
                      <p className="mt-2 text-sm text-slate-800">{latestIsbar.recommendation}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No ISBAR entry yet.</p>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 p-3">
                  <h2 className="text-sm font-semibold text-slate-700">Pending suggestions (latest care day)</h2>
                  <div className="mt-2 space-y-2">
                    {pendingForLatestDay.map((suggestion) => (
                      <div key={suggestion.id} className="rounded-lg bg-slate-50 p-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {categoryLabel[suggestion.category]}
                        </p>
                        <p className="text-sm text-slate-800">{suggestion.content}</p>
                      </div>
                    ))}
                    {pendingForLatestDay.length === 0 ? (
                      <p className="text-sm text-slate-500">No pending suggestions for latest care day.</p>
                    ) : null}
                  </div>
                </section>
              </div>
            </article>
          );
        })}
      </section>

      {patients.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          No patients available for this unit.
        </section>
      ) : null}
    </div>
  );
}
