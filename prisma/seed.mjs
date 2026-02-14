import crypto from "node:crypto";

import {
  PatientDisposition,
  PatientStatus,
  PrismaClient,
  SuggestionCategory,
  SuggestionStatus,
  Unit,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Demo-only seed data for local validation.
 * All entries remain de-identified and use care-day indexing only.
 */
const demoCases = [
  {
    unit: Unit.BHUBANESWAR,
    status: PatientStatus.WATCH,
    days: [
      {
        identification: "Adult ICU cohort, severe community-acquired pneumonia pathway.",
        situation: "Persistent oxygen demand and intermittent tachypnea.",
        background: "Recent escalation from high-flow support after ward deterioration.",
        assessment: "Gas exchange improving slowly; infection source likely pulmonary.",
        recommendation: "Continue lung-protective strategy, reassess oxygen target each round.",
        labsSummary: "Inflammatory markers remain elevated but lactate trend improving.",
        imagingSummary: "Portable chest radiograph shows bilateral patchy infiltrates.",
        flagHemodynamicInstability: false,
        flagRespiratoryConcern: true,
        flagNeurologicChange: false,
        flagSepsisConcern: true,
        flagLowUrineOutput: false,
        flagUncontrolledPain: false,
        suggestions: [
          {
            category: SuggestionCategory.INVESTIGATION,
            content: "Track ABG trend with oxygen requirement each care day.",
            rationale: "Helps quantify response to respiratory strategy.",
          },
          {
            category: SuggestionCategory.IMAGING,
            content: "Repeat chest radiograph if oxygen requirement rises again.",
            rationale: "Can detect interval edema or consolidation progression.",
          },
        ],
      },
      {
        identification: "Adult ICU cohort, severe community-acquired pneumonia pathway.",
        situation: "Oxygen requirement now stable but secretion burden still high.",
        background: "Broad-spectrum therapy already active; no shock signs.",
        assessment: "Pulmonary recovery underway with residual inflammatory burden.",
        recommendation: "Maintain current support and continue airway clearance protocol.",
        labsSummary: "WBC trend down; inflammatory markers plateauing.",
        imagingSummary: "No major interval radiographic progression.",
        flagHemodynamicInstability: false,
        flagRespiratoryConcern: true,
        flagNeurologicChange: false,
        flagSepsisConcern: false,
        flagLowUrineOutput: false,
        flagUncontrolledPain: false,
        suggestions: [
          {
            category: SuggestionCategory.CONSULTATION,
            content: "Consider Respiratory Therapy review for secretion-management optimization.",
            rationale: "Can reduce extubation delay from secretion burden.",
            status: SuggestionStatus.ADDRESSED,
          },
        ],
      },
    ],
  },
  {
    unit: Unit.BHUBANESWAR,
    status: PatientStatus.CRITICAL,
    days: [
      {
        identification: "Post-operative ICU monitoring cohort after emergency abdominal source control.",
        situation: "Vasopressor dependence with low urine output.",
        background: "Immediate post-procedure period with high inflammatory stress.",
        assessment: "Mixed distributive and hypovolemic shock pattern still possible.",
        recommendation: "Titrate perfusion strategy and reassess fluid responsiveness.",
        labsSummary: "Lactate remains elevated; creatinine trending upward.",
        imagingSummary: "Bedside abdominal ultrasound without clear collection.",
        flagHemodynamicInstability: true,
        flagRespiratoryConcern: false,
        flagNeurologicChange: false,
        flagSepsisConcern: true,
        flagLowUrineOutput: true,
        flagUncontrolledPain: false,
        suggestions: [
          {
            category: SuggestionCategory.INVESTIGATION,
            content: "Trend lactate and renal panel closely during vasopressor adjustment.",
            rationale: "Supports real-time perfusion reassessment.",
          },
          {
            category: SuggestionCategory.CONSULTATION,
            content: "Seek senior critical care review for structured shock differential.",
            rationale: "Avoid anchoring on a single etiology.",
          },
          {
            category: SuggestionCategory.CONSULTATION,
            content: "Early nephrology input if oliguria persists despite optimization.",
            rationale: "Facilitates timely renal support planning.",
          },
        ],
      },
    ],
  },
  {
    unit: Unit.BERHAMPUR,
    status: PatientStatus.STABLE,
    days: [
      {
        identification: "Cardiac ICU pathway with decompensated heart failure now improving.",
        situation: "Lower dyspnea burden and improving peripheral perfusion.",
        background: "Responded to diuresis and afterload optimization.",
        assessment: "Clinical profile shifting toward stable recovery trajectory.",
        recommendation: "Continue stepped de-escalation and monitor fluid balance.",
        labsSummary: "Renal markers stable; natriuretic trend improving.",
        imagingSummary: "Lung ultrasound with reduced B-line burden.",
        flagHemodynamicInstability: false,
        flagRespiratoryConcern: false,
        flagNeurologicChange: false,
        flagSepsisConcern: false,
        flagLowUrineOutput: false,
        flagUncontrolledPain: false,
        suggestions: [
          {
            category: SuggestionCategory.INVESTIGATION,
            content: "No new trigger identified; continue conservative trend monitoring.",
            rationale: "Stable course with no immediate escalation signal.",
            status: SuggestionStatus.ADDRESSED,
          },
        ],
      },
      {
        identification: "Cardiac ICU pathway with decompensated heart failure now improving.",
        situation: "Mobilization tolerated; no new respiratory distress.",
        background: "Weaning support with sustained hemodynamic stability.",
        assessment: "Stable with low near-term risk if trends remain unchanged.",
        recommendation: "Prepare transition checklist for step-down readiness review.",
        labsSummary: "Electrolytes within target range; creatinine unchanged.",
        imagingSummary: "No new cardiopulmonary interval finding.",
        flagHemodynamicInstability: false,
        flagRespiratoryConcern: false,
        flagNeurologicChange: false,
        flagSepsisConcern: false,
        flagLowUrineOutput: false,
        flagUncontrolledPain: false,
        suggestions: [
          {
            category: SuggestionCategory.DIFFERENTIAL,
            content: "Reconfirm medication-related hypotension risks before transfer.",
            rationale: "Prevents avoidable post-transfer instability.",
          },
        ],
      },
    ],
  },
  {
    unit: Unit.BERHAMPUR,
    status: PatientStatus.WATCH,
    days: [
      {
        identification: "Neurocritical care pathway with fluctuating sensorium.",
        situation: "Intermittent confusion and variable attention span.",
        background: "Recent sedation taper and metabolic stress exposure.",
        assessment: "Likely multifactorial encephalopathy, focal process not excluded.",
        recommendation: "Continue delirium bundle and reassess neurologic trend each round.",
        labsSummary: "Electrolytes mildly deranged with gradual correction.",
        imagingSummary: "Previous neuroimaging without acute mass effect.",
        flagHemodynamicInstability: false,
        flagRespiratoryConcern: false,
        flagNeurologicChange: true,
        flagSepsisConcern: false,
        flagLowUrineOutput: false,
        flagUncontrolledPain: false,
        suggestions: [
          {
            category: SuggestionCategory.INVESTIGATION,
            content: "Repeat reversible-cause screen including glucose and electrolytes.",
            rationale: "Frequent source of persistent encephalopathy.",
          },
          {
            category: SuggestionCategory.CONSULTATION,
            content: "Consider neurology review if trajectory remains inconsistent.",
            rationale: "Supports structured neurological differential.",
          },
        ],
      },
    ],
  },
  {
    unit: Unit.BHUBANESWAR,
    status: PatientStatus.WATCH,
    days: [
      {
        identification: "Medical ICU pathway with severe pancreatitis and pain escalation.",
        situation: "Pain remains high despite protocolized analgesia.",
        background: "Ongoing inflammatory process with high nursing burden.",
        assessment: "Uncontrolled pain may indicate evolving complication.",
        recommendation: "Reassess analgesic strategy and re-evaluate high-risk complications.",
        labsSummary: "Inflammatory markers remain high with variable metabolic trend.",
        imagingSummary: "Bedside scan with limited view; no large free fluid seen.",
        flagHemodynamicInstability: false,
        flagRespiratoryConcern: false,
        flagNeurologicChange: false,
        flagSepsisConcern: false,
        flagLowUrineOutput: false,
        flagUncontrolledPain: true,
        suggestions: [
          {
            category: SuggestionCategory.DIFFERENTIAL,
            content: "Reconsider occult ischemia or evolving compartment process if pain remains disproportionate.",
            rationale: "Pain out of proportion can precede overt deterioration.",
          },
          {
            category: SuggestionCategory.INVESTIGATION,
            content: "Trend targeted labs aligned to pain pattern changes.",
            rationale: "Objective trend data improves early complication detection.",
          },
        ],
      },
    ],
  },
  {
    unit: Unit.BERHAMPUR,
    status: PatientStatus.CRITICAL,
    days: [
      {
        identification: "Respiratory ICU pathway with abrupt desaturation episode.",
        situation: "Sudden oxygen escalation with tachycardia.",
        background: "Prior course had gradual respiratory improvement.",
        assessment: "Acute gas-exchange setback; thromboembolic process remains possible.",
        recommendation: "Urgent respiratory reassessment and imaging discussion with senior team.",
        labsSummary: "Lactate mildly up; inflammatory markers unchanged.",
        imagingSummary: "Portable film with no major new collapse; limited certainty.",
        flagHemodynamicInstability: true,
        flagRespiratoryConcern: true,
        flagNeurologicChange: false,
        flagSepsisConcern: false,
        flagLowUrineOutput: false,
        flagUncontrolledPain: false,
        suggestions: [
          {
            category: SuggestionCategory.INVESTIGATION,
            content: "Obtain ABG trend and focused perfusion markers during acute event.",
            rationale: "Clarifies severity and trajectory quickly.",
          },
          {
            category: SuggestionCategory.IMAGING,
            content: "Escalate chest imaging plan if desaturation persists beyond initial stabilization.",
            rationale: "Helps identify occult progression or new process.",
          },
          {
            category: SuggestionCategory.DIFFERENTIAL,
            content: "Keep pulmonary embolism and aspiration in active differential while evaluating causes.",
            rationale: "Commonly missed when findings are non-specific.",
          },
        ],
      },
    ],
  },
];

function randomPatientId() {
  return `PT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function main() {
  await prisma.suggestion.deleteMany();
  await prisma.isbarEntry.deleteMany();
  await prisma.patient.deleteMany();

  const seededPatients = [];

  for (const demoCase of demoCases) {
    const patientId = randomPatientId();

    await prisma.patient.create({
      data: {
        id: patientId,
        unit: demoCase.unit,
        status: demoCase.status,
        disposition: PatientDisposition.ACTIVE,
        latestCareDay: demoCase.days.length,
        isActive: true,
      },
    });

    for (let index = 0; index < demoCase.days.length; index += 1) {
      const day = demoCase.days[index];
      const careDay = index + 1;

      const isbar = await prisma.isbarEntry.create({
        data: {
          patientId,
          careDay,
          identification: day.identification,
          situation: day.situation,
          background: day.background,
          assessment: day.assessment,
          recommendation: day.recommendation,
          labsSummary: day.labsSummary,
          imagingSummary: day.imagingSummary,
          flagHemodynamicInstability: day.flagHemodynamicInstability,
          flagRespiratoryConcern: day.flagRespiratoryConcern,
          flagNeurologicChange: day.flagNeurologicChange,
          flagSepsisConcern: day.flagSepsisConcern,
          flagLowUrineOutput: day.flagLowUrineOutput,
          flagUncontrolledPain: day.flagUncontrolledPain,
        },
      });

      await prisma.dailyProgress.create({
        data: {
          patientId,
          careDay,
          progressSummary: day.assessment,
          keyEvents: day.situation,
          currentSupports: day.recommendation,
          pendingIssues: day.labsSummary,
          nextPlan: day.recommendation,
        },
      });

      if (day.suggestions.length > 0) {
        await prisma.suggestion.createMany({
          data: day.suggestions.map((suggestion) => ({
            patientId,
            isbarId: isbar.id,
            careDay,
            category: suggestion.category,
            content: suggestion.content,
            rationale: suggestion.rationale,
            status: suggestion.status ?? SuggestionStatus.PENDING,
          })),
        });
      }
    }

    seededPatients.push({
      id: patientId,
      unit: demoCase.unit,
      status: demoCase.status,
      disposition: PatientDisposition.ACTIVE,
      careDays: demoCase.days.length,
    });
  }

  console.log(`Seed complete: ${seededPatients.length} demo patients created.`);

  for (const patient of seededPatients) {
    console.log(
      `- ${patient.id} | ${patient.unit} | ${patient.status} | ${patient.disposition} | latest D${patient.careDays}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
