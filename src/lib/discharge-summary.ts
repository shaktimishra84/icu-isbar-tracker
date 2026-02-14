import "server-only";

type IsbarSnapshot = {
  careDay: number;
  identification: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  labsSummary: string;
  imagingSummary: string;
};

type DailyProgressSnapshot = {
  careDay: number;
  progressSummary: string;
  keyEvents: string;
  currentSupports: string;
  pendingIssues: string;
  nextPlan: string;
};

export type DischargeSummaryInput = {
  patientId: string;
  unit: string;
  finalOutcome: string;
  finalStatus: string;
  latestCareDay: number;
  isbarTimeline: IsbarSnapshot[];
  dailyProgressTimeline: DailyProgressSnapshot[];
};

export class LlmConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmConfigurationError";
  }
}

function sanitizeSummary(text: string): string {
  let clean = text.trim();

  const patterns = [
    /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{2,4}|\s+\d{2,4})?\b/gi,
    /\b(?:mrn|medical\s*record\s*number|dob|date\s*of\s*birth|aadhaar|uhid|name)\b/gi,
    /\b\d{8,}\b/g,
  ];

  for (const pattern of patterns) {
    clean = clean.replace(pattern, "[redacted]");
  }

  return clean;
}

function extractOutputText(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const maybeOutput = payload as { output_text?: unknown };

    if (typeof maybeOutput.output_text === "string") {
      return maybeOutput.output_text;
    }
  }

  return "";
}

export async function generateDischargeSummaryWithLlm(input: DischargeSummaryInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new LlmConfigurationError("OPENAI_API_KEY is not configured.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

  const systemPrompt =
    "You are an ICU discharge-summary assistant. Produce concise, clinically useful summaries from de-identified inputs only. Do not invent data. Do not include names, MRN, DOB, or exact calendar dates. Refer only to care-day index (D1, D2, etc.).";

  const userPrompt = [
    "Generate a discharge/transfer summary with these exact section headings:",
    "1) Clinical Course",
    "2) Key Interventions",
    "3) Response and Current Status",
    "4) Ongoing Concerns",
    "5) Follow-up Plan",
    "",
    "Rules:",
    "- Keep it de-identified.",
    "- Use bullet points under each section.",
    "- Mention care-day progression where relevant.",
    "- If information is missing, say 'Not documented'.",
    "",
    "Structured patient timeline:",
    JSON.stringify(input, null, 2),
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }],
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const rawText = extractOutputText(payload);

  if (!rawText.trim()) {
    throw new Error("LLM response was empty.");
  }

  return sanitizeSummary(rawText);
}
