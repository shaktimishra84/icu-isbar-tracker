import { SuggestionCategory } from "@prisma/client";

export type SuggestionDraft = {
  category: SuggestionCategory;
  content: string;
  rationale: string;
};

export type SuggestionEngineInput = {
  identification: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  labsSummary: string;
  imagingSummary: string;
  flagHemodynamicInstability: boolean;
  flagRespiratoryConcern: boolean;
  flagNeurologicChange: boolean;
  flagSepsisConcern: boolean;
  flagLowUrineOutput: boolean;
  flagUncontrolledPain: boolean;
};

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function generateConservativeSuggestions(input: SuggestionEngineInput): SuggestionDraft[] {
  const drafts: SuggestionDraft[] = [];
  const fullText = [
    input.identification,
    input.situation,
    input.background,
    input.assessment,
    input.recommendation,
    input.labsSummary,
    input.imagingSummary,
  ]
    .join(" ")
    .toLowerCase();

  const pushUnique = (category: SuggestionCategory, content: string, rationale: string) => {
    const exists = drafts.some((item) => item.category === category && item.content === content);
    if (!exists) {
      drafts.push({ category, content, rationale });
    }
  };

  if (
    input.flagSepsisConcern ||
    includesAny(fullText, ["sepsis", "fever", "rigor", "source unclear", "hypotension", "tachycardia"])
  ) {
    pushUnique(
      SuggestionCategory.INVESTIGATION,
      "Consider targeted sepsis work-up: CBC trend, lactate trend, and blood cultures before antimicrobial changes.",
      "Sepsis concern flagged or clinical pattern suggests possible evolving infection.",
    );

    pushUnique(
      SuggestionCategory.CONSULTATION,
      "If trajectory remains unclear after initial optimization, consider early Infectious Disease input.",
      "Conservative escalation can reduce delay when source control or antimicrobial strategy is uncertain.",
    );

    pushUnique(
      SuggestionCategory.DIFFERENTIAL,
      "Recheck non-infectious mimics of sepsis (drug reaction, PE, pancreatitis, adrenal crisis) if response is poor.",
      "Persistent instability despite treatment may represent an alternate primary diagnosis.",
    );
  }

  if (
    input.flagRespiratoryConcern ||
    includesAny(fullText, ["hypoxia", "desaturation", "dyspnea", "tachypnea", "respiratory distress"])
  ) {
    pushUnique(
      SuggestionCategory.INVESTIGATION,
      "Consider ABG/VBG and repeat respiratory trend markers to assess current gas-exchange burden.",
      "Respiratory concern flagged or gas-exchange symptoms documented.",
    );

    pushUnique(
      SuggestionCategory.IMAGING,
      "Consider portable chest radiograph if respiratory status changed since previous round.",
      "Chest imaging can reveal interval edema, consolidation, or effusion.",
    );

    pushUnique(
      SuggestionCategory.DIFFERENTIAL,
      "If hypoxia is sudden or disproportionate, keep pulmonary embolism and silent aspiration in the differential.",
      "These are commonly missed in ICU deterioration when signs are non-specific.",
    );
  }

  if (
    input.flagHemodynamicInstability ||
    includesAny(fullText, ["shock", "hypotension", "pressor", "poor perfusion", "cold peripheries"])
  ) {
    pushUnique(
      SuggestionCategory.INVESTIGATION,
      "Consider focused hemodynamic reassessment with ECG, lactate trend, and bedside perfusion markers.",
      "Instability signs suggest need to distinguish distributive, cardiogenic, and hypovolemic contributors.",
    );

    pushUnique(
      SuggestionCategory.CONSULTATION,
      "If instability persists, consider senior critical care review for structured shock reassessment.",
      "Escalation helps avoid anchoring on a single etiology.",
    );
  }

  if (
    input.flagNeurologicChange ||
    includesAny(fullText, ["altered sensorium", "confusion", "focal deficit", "seizure", "gcs drop"])
  ) {
    pushUnique(
      SuggestionCategory.INVESTIGATION,
      "Consider reversible-cause screen: glucose, electrolytes, acid-base status, and medication review.",
      "Neurologic change is often multifactorial and reversible contributors are common.",
    );

    pushUnique(
      SuggestionCategory.IMAGING,
      "If focal signs or persistent unexplained decline are present, consider neuroimaging discussion.",
      "Conservative imaging escalation is appropriate when deficits are new or unexplained.",
    );

    pushUnique(
      SuggestionCategory.CONSULTATION,
      "Consider Neurology discussion if neurologic trajectory remains uncertain after basic correction.",
      "Expert review supports differential narrowing in persistent encephalopathy.",
    );
  }

  if (
    input.flagLowUrineOutput ||
    includesAny(fullText, ["oliguria", "anuria", "rising creatinine", "aki", "fluid overload"])
  ) {
    pushUnique(
      SuggestionCategory.INVESTIGATION,
      "Consider renal reassessment: repeat renal panel, urine microscopy, and fluid balance reconciliation.",
      "Low output may reflect pre-renal, intrinsic, or post-renal pathology.",
    );

    pushUnique(
      SuggestionCategory.IMAGING,
      "If obstruction remains possible, consider point-of-care bladder/renal imaging.",
      "Simple imaging can quickly detect reversible post-renal causes.",
    );

    pushUnique(
      SuggestionCategory.CONSULTATION,
      "If renal function continues to worsen, consider early Nephrology input.",
      "Early consultation can guide fluid, diuretic, and RRT planning.",
    );
  }

  if (
    input.flagUncontrolledPain ||
    includesAny(fullText, ["pain out of proportion", "persistent severe pain", "new chest pain", "abdominal pain"])
  ) {
    pushUnique(
      SuggestionCategory.DIFFERENTIAL,
      "For uncontrolled pain, revisit high-risk causes (ischemia, occult bleed, compartment processes) before attributing to baseline illness.",
      "Pain out of proportion can be an early warning sign of time-sensitive pathology.",
    );

    pushUnique(
      SuggestionCategory.INVESTIGATION,
      "Consider trend-based targeted labs guided by pain location and severity changes.",
      "Objective trends can support early detection of evolving complications.",
    );
  }

  if (includesAny(input.labsSummary.toLowerCase(), ["drop", "fall", "worse", "rising"])) {
    pushUnique(
      SuggestionCategory.DIFFERENTIAL,
      "If laboratory trends are worsening, ensure medication effects and iatrogenic contributors are reviewed.",
      "A conservative medication/device review can surface reversible causes.",
    );
  }

  if (drafts.length === 0) {
    pushUnique(
      SuggestionCategory.INVESTIGATION,
      "No high-risk trigger detected from current ISBAR. Continue close trend monitoring and reassess next care day.",
      "Default conservative recommendation when no escalation signal is identified.",
    );
  }

  return drafts;
}
