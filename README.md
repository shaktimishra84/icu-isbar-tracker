# ICU ISBAR Tracker (Local-only)

Next.js + Prisma + SQLite app for a de-identified ICU ISBAR workflow.

## What this includes

- Local password login (`LOCAL_PASSWORD` in `.env`) with no external auth.
- Patient list page with:
  - Unit filter (`Bhubaneswar` / `Berhampur`)
  - View filter (`Active only` / `Closed only` / `All outcomes`)
  - Status and outcome tags
  - `Add patient` (internal random ID only)
- Patient detail page with:
  - `Add today's ISBAR` form (`I/S/B/A/R`, flags, labs summary, imaging summary)
  - Daily progress log (one entry per care day)
  - Outcome options: `Discharged`, `Shift out`, `DAMA`, `Death` (or back to `Active`)
  - One-click AI discharge summary generation from ISBAR + daily progress timeline
  - Conservative rule-based suggestion engine on save
  - Stored per-day suggestions with pending/addressed states
- Print-friendly `Unit Rounding Sheet` page with each patient's latest `R` + pending suggestions.

## Privacy hard rules implemented

- No name / MRN / DOB fields.
- No exact calendar date fields in patient clinical records.
- Only random internal patient IDs (`PT-XXXXXXXX`).
- ISBAR chronology uses sequential care-day index (`D1`, `D2`, ...).
- Server-side text checks block likely identifiers and exact date patterns before save.

## Setup

1. Install Node.js 22 LTS (recommended for Prisma compatibility).
   If using Homebrew with `node@22`, ensure this is first in PATH:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```
2. Install dependencies:

```bash
npm install
```

3. Create env file:

```bash
cp .env.example .env
```

4. Set your local password in `.env`:

```env
LOCAL_PASSWORD="your-strong-local-password"
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your-openai-key-for-summary-generation"
OPENAI_MODEL="gpt-4.1-mini"
```

5. Create Prisma client + sync DB schema:

```bash
npm run db:generate
npm run db:push
```

Optional (interactive migration workflow):

```bash
npm run db:migrate -- --name init
```

6. Start app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo data

Load de-identified sample ICU patients and ISBAR rounds:

```bash
npm run db:seed
```

This resets existing local records and inserts demo patients with random internal IDs.

## Export PDF

Open `/rounding-sheet`, filter by unit if needed, then click `Export PDF`.
The page uses print-optimized A4 styling for clean round-sheet output.

## AI discharge summary

1. Add ISBAR entries and daily progress notes in patient detail.
2. Set final outcome (`Discharged` / `Shift out` / `DAMA` / `Death`).
3. Click `Generate with AI` in the `AI Discharge Summary` section.
4. Generated summary is stored on patient record and versioned.

## Key paths

- App routes: `src/app`
- Prisma schema: `prisma/schema.prisma`
- Suggestion engine: `src/lib/suggestions.ts`
- LLM summary helper: `src/lib/discharge-summary.ts`
- Auth helpers: `src/lib/auth.ts`
