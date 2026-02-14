import { PatientDisposition, SuggestionCategory, SuggestionStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  dispositionOptions,
  getDispositionLabel,
  getDispositionTagClass,
  getStatusLabel,
  getStatusTagClass,
  getUnitLabel,
  statusOptions,
} from "@/lib/options";
import { prisma } from "@/lib/prisma";

import {
  addIsbarAction,
  generateDischargeSummaryAction,
  markSuggestionAddressedAction,
  upsertDailyProgressAction,
  updatePatientDispositionAction,
  updatePatientStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

const categoryLabel: Record<SuggestionCategory, string> = {
  INVESTIGATION: "Investigation",
  IMAGING: "Imaging",
  CONSULTATION: "Consultation",
  DIFFERENTIAL: "Missed differential",
};

type PatientDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PatientDetailPage({ params, searchParams }: PatientDetailPageProps) {
  const routeParams = await params;
  const pageParams = await searchParams;
  const patientId = routeParams.id;

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      isbars: {
        orderBy: { careDay: "desc" },
      },
      suggestions: {
        orderBy: [{ careDay: "desc" }],
      },
      dailyProgresses: {
        orderBy: [{ careDay: "desc" }],
      },
    },
  });

  if (!patient) {
    notFound();
  }

  const nextCareDay = patient.latestCareDay + 1;
  const isCaseClosed = patient.disposition !== PatientDisposition.ACTIVE;
  const pendingSuggestions = patient.suggestions.filter((item) => item.status === SuggestionStatus.PENDING);
  const addressedSuggestions = patient.suggestions.filter((item) => item.status === SuggestionStatus.ADDRESSED);

  const saved = pageParams.saved === "1";
  const progressSaved = pageParams.progress_saved === "1";
  const summarySaved = pageParams.summary_saved === "1";
  const hasValidationError = pageParams.error === "isbar_validation";
  const hasDeidError = pageParams.error === "deid";
  const hasInactiveCaseError = pageParams.error === "inactive_case";
  const hasProgressValidationError = pageParams.error === "progress_validation";
  const hasProgressDayError = pageParams.error === "progress_day";
  const hasSummaryFailedError = pageParams.error === "summary_failed";
  const hasLlmNotConfiguredError = pageParams.error === "llm_not_configured";
  const hasSummaryNoDataError = pageParams.error === "summary_no_data";
  const hasSummaryRequiresOutcomeError = pageParams.error === "summary_requires_outcome";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Patient ID</p>
            <h1 className="text-2xl font-semibold tracking-tight">{patient.id}</h1>
            <p className="mt-1 text-sm text-slate-600">Unit: {getUnitLabel(patient.unit)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getDispositionTagClass(
                patient.disposition,
              )}`}
            >
              {getDispositionLabel(patient.disposition)}
            </span>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getStatusTagClass(
                patient.status,
              )}`}
            >
              {getStatusLabel(patient.status)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <dl className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
            <div className="flex items-center justify-between">
              <dt>Outcome</dt>
              <dd className="font-semibold">{getDispositionLabel(patient.disposition)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Latest care day</dt>
              <dd className="font-semibold">{patient.latestCareDay > 0 ? `D${patient.latestCareDay}` : "Not started"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Total ISBAR entries</dt>
              <dd className="font-semibold">{patient.isbars.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Pending suggestions</dt>
              <dd className="font-semibold">{pendingSuggestions.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Daily progress notes</dt>
              <dd className="font-semibold">{patient.dailyProgresses.length}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Summary version</dt>
              <dd className="font-semibold">v{patient.dischargeSummaryVersion}</dd>
            </div>
          </dl>

          <form action={updatePatientStatusAction} className="space-y-2 rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold">Update status</h2>
            <input type="hidden" name="patientId" value={patient.id} />
            <select name="status" defaultValue={patient.status} className="w-full">
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Save status
            </button>
          </form>

          <form action={updatePatientDispositionAction} className="space-y-2 rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold">Update outcome</h2>
            <input type="hidden" name="patientId" value={patient.id} />
            <select name="disposition" defaultValue={patient.disposition} className="w-full">
              {dispositionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Save outcome
            </button>
          </form>
        </div>

        <div className="mt-4">
          <Link href="/patients" className="text-sm font-medium text-accent hover:underline">
            ← Back to patient list
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Add today&apos;s ISBAR</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Care day D{nextCareDay}</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          This form creates the next sequential care-day entry (no exact calendar dates stored).
        </p>

        {saved ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            ISBAR saved and suggestions generated.
          </p>
        ) : null}

        {hasValidationError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Please fill all required ISBAR and summary fields.
          </p>
        ) : null}

        {hasDeidError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Entry blocked: remove identifiers or exact dates (DOB/MRN/date-like strings) and resubmit.
          </p>
        ) : null}

        {hasInactiveCaseError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Case is not active. Set outcome back to Active before adding a new ISBAR entry.
          </p>
        ) : null}

        {isCaseClosed ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            ISBAR entry is locked because outcome is <strong>{getDispositionLabel(patient.disposition)}</strong>.
          </p>
        ) : (
          <form action={addIsbarAction} className="mt-4 space-y-4">
            <input type="hidden" name="patientId" value={patient.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="identification">I - Identification (internal context only, no identifiers)</label>
                <textarea id="identification" name="identification" rows={2} required className="w-full" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="situation">S - Situation</label>
                <textarea id="situation" name="situation" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="background">B - Background</label>
                <textarea id="background" name="background" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="assessment">A - Assessment</label>
                <textarea id="assessment" name="assessment" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="recommendation">R - Recommendation / plan for next round</label>
                <textarea id="recommendation" name="recommendation" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1">
                <label htmlFor="labsSummary">Brief labs summary</label>
                <textarea id="labsSummary" name="labsSummary" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1">
                <label htmlFor="imagingSummary">Brief imaging summary</label>
                <textarea id="imagingSummary" name="imagingSummary" rows={3} required className="w-full" />
              </div>
            </div>

            <fieldset className="rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold">Risk flags (optional)</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="flagHemodynamicInstability" className="h-4 w-4" />
                  Hemodynamic instability
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="flagRespiratoryConcern" className="h-4 w-4" />
                  Respiratory concern
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="flagNeurologicChange" className="h-4 w-4" />
                  Neurologic change
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="flagSepsisConcern" className="h-4 w-4" />
                  Sepsis concern
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="flagLowUrineOutput" className="h-4 w-4" />
                  Low urine output
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="flagUncontrolledPain" className="h-4 w-4" />
                  Uncontrolled pain
                </label>
              </div>
            </fieldset>

            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Save ISBAR + generate suggestions
            </button>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Daily Progress Log</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {patient.dailyProgresses.length} entries
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Store one structured progress note per care day. These notes are used for one-click discharge summary generation.
        </p>

        {progressSaved ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Daily progress saved.
          </p>
        ) : null}

        {hasProgressValidationError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Please complete all daily progress fields.
          </p>
        ) : null}

        {hasProgressDayError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Care day must be between D1 and current latest care day.
          </p>
        ) : null}

        {isCaseClosed ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            Daily progress entry is locked because outcome is <strong>{getDispositionLabel(patient.disposition)}</strong>.
          </p>
        ) : (
          <form action={upsertDailyProgressAction} className="mt-4 space-y-4">
            <input type="hidden" name="patientId" value={patient.id} />

            <div className="space-y-1">
              <label htmlFor="careDay">Care day</label>
              <input
                id="careDay"
                name="careDay"
                type="number"
                min={1}
                max={Math.max(1, patient.latestCareDay)}
                defaultValue={Math.max(1, patient.latestCareDay)}
                className="w-full md:w-36"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label htmlFor="progressSummary">Progress summary</label>
                <textarea id="progressSummary" name="progressSummary" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1">
                <label htmlFor="keyEvents">Key events</label>
                <textarea id="keyEvents" name="keyEvents" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1">
                <label htmlFor="currentSupports">Current supports</label>
                <textarea id="currentSupports" name="currentSupports" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1">
                <label htmlFor="pendingIssues">Pending issues</label>
                <textarea id="pendingIssues" name="pendingIssues" rows={3} required className="w-full" />
              </div>
              <div className="space-y-1">
                <label htmlFor="nextPlan">Plan for next care day</label>
                <textarea id="nextPlan" name="nextPlan" rows={3} required className="w-full" />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Save daily progress
            </button>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {patient.dailyProgresses.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Care day D{entry.careDay}</p>
              <dl className="mt-2 space-y-2 text-sm text-slate-700">
                <div>
                  <dt className="font-semibold">Progress</dt>
                  <dd>{entry.progressSummary}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Key events</dt>
                  <dd>{entry.keyEvents}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Current supports</dt>
                  <dd>{entry.currentSupports}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Pending issues</dt>
                  <dd>{entry.pendingIssues}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Next plan</dt>
                  <dd>{entry.nextPlan}</dd>
                </div>
              </dl>
            </article>
          ))}
          {patient.dailyProgresses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-600">
              No daily progress entries yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">AI Discharge Summary</h2>
            <p className="mt-1 text-sm text-slate-600">
              Generate in one click from ISBAR timeline and daily progress (only when outcome is not Active).
            </p>
          </div>
          <form action={generateDischargeSummaryAction}>
            <input type="hidden" name="patientId" value={patient.id} />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Generate with AI
            </button>
          </form>
        </div>

        {summarySaved ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Discharge summary generated and saved.
          </p>
        ) : null}
        {hasSummaryRequiresOutcomeError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Set outcome to Discharged, Shift out, DAMA, or Death before generating summary.
          </p>
        ) : null}
        {hasSummaryNoDataError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Summary generation needs at least one ISBAR entry or one daily progress note.
          </p>
        ) : null}
        {hasLlmNotConfiguredError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            OPENAI_API_KEY is not configured. Add it in <code>.env</code>.
          </p>
        ) : null}
        {hasSummaryFailedError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            AI summary generation failed. Please retry.
          </p>
        ) : null}

        {patient.dischargeSummaryText ? (
          <article className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Saved summary • version v{patient.dischargeSummaryVersion}
              </p>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-slate-800">{patient.dischargeSummaryText}</pre>
          </article>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-600">
            No discharge summary generated yet.
          </p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Pending suggestions</h2>
          <div className="mt-3 space-y-3">
            {pendingSuggestions.map((suggestion) => (
              <article key={suggestion.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  D{suggestion.careDay} • {categoryLabel[suggestion.category]}
                </p>
                <p className="mt-1 text-sm text-slate-800">{suggestion.content}</p>
                {suggestion.rationale ? <p className="mt-1 text-xs text-slate-600">{suggestion.rationale}</p> : null}
                <form action={markSuggestionAddressedAction} className="mt-2">
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Mark addressed
                  </button>
                </form>
              </article>
            ))}
            {pendingSuggestions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-600">
                No pending suggestions.
              </p>
            ) : null}
          </div>

          {addressedSuggestions.length > 0 ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Addressed suggestions ({addressedSuggestions.length})
              </summary>
              <div className="mt-2 space-y-2">
                {addressedSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600">
                    D{suggestion.careDay} • {categoryLabel[suggestion.category]} • {suggestion.content}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">ISBAR history</h2>
          <div className="mt-3 space-y-3">
            {patient.isbars.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Care day D{entry.careDay}</p>
                <dl className="mt-2 space-y-2 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-700">I</dt>
                    <dd className="text-slate-700">{entry.identification}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700">S</dt>
                    <dd className="text-slate-700">{entry.situation}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700">B</dt>
                    <dd className="text-slate-700">{entry.background}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700">A</dt>
                    <dd className="text-slate-700">{entry.assessment}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700">R</dt>
                    <dd className="text-slate-700">{entry.recommendation}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700">Labs</dt>
                    <dd className="text-slate-700">{entry.labsSummary}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700">Imaging</dt>
                    <dd className="text-slate-700">{entry.imagingSummary}</dd>
                  </div>
                </dl>

                {(entry.flagHemodynamicInstability ||
                  entry.flagRespiratoryConcern ||
                  entry.flagNeurologicChange ||
                  entry.flagSepsisConcern ||
                  entry.flagLowUrineOutput ||
                  entry.flagUncontrolledPain) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.flagHemodynamicInstability ? (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                        Hemodynamic
                      </span>
                    ) : null}
                    {entry.flagRespiratoryConcern ? (
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
                        Respiratory
                      </span>
                    ) : null}
                    {entry.flagNeurologicChange ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
                        Neurologic
                      </span>
                    ) : null}
                    {entry.flagSepsisConcern ? (
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                        Sepsis
                      </span>
                    ) : null}
                    {entry.flagLowUrineOutput ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        Low urine output
                      </span>
                    ) : null}
                    {entry.flagUncontrolledPain ? (
                      <span className="rounded-full bg-fuchsia-100 px-2 py-1 text-xs font-semibold text-fuchsia-700">
                        Pain concern
                      </span>
                    ) : null}
                  </div>
                )}
              </article>
            ))}

            {patient.isbars.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-600">
                No ISBAR entries yet.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
