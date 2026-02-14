const disallowedPatterns: Array<{ regex: RegExp; reason: string }> = [
  {
    regex: /\b(?:mrn|medical\s*record\s*number|uhid|aadhaar|date\s*of\s*birth|dob)\b/i,
    reason: "identifier keyword",
  },
  {
    regex: /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/,
    reason: "exact date format",
  },
  {
    regex: /\b\d{4}-\d{2}-\d{2}\b/,
    reason: "exact ISO date",
  },
  {
    regex: /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{2,4}|\s+\d{2,4})?\b/i,
    reason: "month-based exact date",
  },
  {
    regex: /\b\d{6,}\b/,
    reason: "long numeric sequence (possible identifier)",
  },
];

export function containsDisallowedContent(values: string[]): { blocked: boolean; reasons: string[] } {
  const reasons = new Set<string>();

  for (const value of values) {
    const text = value.trim();

    if (!text) {
      continue;
    }

    for (const pattern of disallowedPatterns) {
      if (pattern.regex.test(text)) {
        reasons.add(pattern.reason);
      }
    }
  }

  return {
    blocked: reasons.size > 0,
    reasons: Array.from(reasons),
  };
}
