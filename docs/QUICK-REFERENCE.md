# Career-Ops: File Relationships & Quick Reference

**Purpose:** Visual map of how files connect and what each folder does

---

## File Dependency Graph

```
┌─ YOUR SYSTEM ─────────────────────────────────────────────────────┐
│                                                                   │
│  Gemini CLI Command (e.g., /career-ops-evaluate)                │
│    │                                                             │
│    ├─ .gemini/commands/career-ops-evaluate.toml                │
│    │  (Defines prompt + context to load)                        │
│    │    │                                                        │
│    │    ├─ modes/_shared.md                                    │
│    │    │  └─ System context: scoring, archetypes, rules       │
│    │    │     (auto-updatable)                                 │
│    │    │                                                        │
│    │    ├─ modes/oferta.md                                    │
│    │    │  └─ Evaluation logic: 7-block template              │
│    │    │     (auto-updatable)                                │
│    │    │                                                        │
│    │    ├─ cv.md ◄─────────────────────────────────┐          │
│    │    │  └─ Your resume (source of truth)        │          │
│    │    │     (NEVER auto-updated)                 │          │
│    │    │                                           │          │
│    │    ├─ config/profile.yml ◄──────────────────┐ │          │
│    │    │  └─ Your identity (name, target, comp) │ │          │
│    │    │     (NEVER auto-updated)                │ │          │
│    │    │                                           │ │          │
│    │    ├─ modes/_profile.md ◄────────────────┐ │ │          │
│    │    │  └─ Your custom archetypes,       │ │ │          │
│    │    │     narrative, negotiation         │ │ │          │
│    │    │     (NEVER auto-updated)           │ │ │          │
│    │    │                                     │ │ │          │
│    │    └─ article-digest.md (optional) ◄──┐ │ │ │          │
│    │       └─ Detailed proof points        │ │ │ │          │
│    │          (NEVER auto-updated)         │ │ │ │          │
│    │                                        │ │ │ │          │
│    └─ Agent generates:                      │ │ │ │          │
│       │                                      │ │ │ │          │
│       ├─ reports/###-slug-date.md ◄──────────┴─┴─┘          │
│       │  (7-block evaluation report)                          │
│       │   └─ Reads: cv.md, _profile.md, article-digest       │
│       │   └─ Produces: Score, blocks A-G                     │
│       │   └─ Saved to: reports/ (NEVER auto-deleted)         │
│       │                                                        │
│       ├─ data/applications.md ◄─────────────────────────────┐│
│       │  (Tracker table)                                     ││
│       │   └─ Rows added by: merge-tracker.mjs                ││
│       │   └─ Format: | # | Date | Company | Role | Score ... ││
│       │   └─ Source: batch/tracker-additions/ TSVs           ││
│       │                                                        ││
│       └─ output/cv-{name}-{company}-{date}.pdf ◄────────────┘│
│          (Personalized ATS-optimized PDF)                     │
│           └─ Generated from: cv.md + JD keywords              │
│           └─ Saved to: output/                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ SCANNING & BATCH ─────────────────────────────────────────────┐
│                                                                │
│  /career-ops-scan                                            │
│    │                                                          │
│    ├─ portals.yml                                           │
│    │  └─ Company list, search queries, title filters        │
│    │     (NEVER auto-updated)                               │
│    │                                                          │
│    ├─ modes/_shared.md + modes/scan.md                     │
│    │  └─ Scanning logic (Playwright L1 + API L2 + WS L3)   │
│    │     (auto-updatable)                                   │
│    │                                                          │
│    └─ Agent generates:                                       │
│       │                                                       │
│       ├─ data/pipeline.md ◄────────────────────────────────┐│
│       │  (Inbox of pending URLs)                           ││
│       │   └─ User-managed checklist                         ││
│       │   └─ Format: - [ ] URL | Company | Role            ││
│       │                                                       ││
│       └─ data/scan-history.tsv ◄──────────────────────────┘│
│          (Deduplication history)                             │
│           └─ Auto-generated                                  │
│           └─ Prevents duplicate offers                       │
│                                                               │
│  /career-ops-pipeline (process inbox)                        │
│    │                                                          │
│    ├─ data/pipeline.md ◄─────────────────────────────┐     │
│    │  └─ Read pending URLs                          │     │
│    │                                                  │     │
│    ├─ modes/pipeline.md + auto-pipeline.md         │     │
│    │  └─ Evaluation logic                          │     │
│    │                                                  │     │
│    └─ Agent generates:                              │     │
│       │                                              │     │
│       ├─ reports/###-slug-date.md (per URL) ◄──┐ │     │
│       ├─ output/cv-*.pdf (per URL) ◄───────────┤ │     │
│       ├─ batch/tracker-additions/{id}.tsv ◄─┐ │ │     │
│       │  └─ Tracker lines (one per job)     │ │ │     │
│       │                                      │ │ │     │
│       └─ node merge-tracker.mjs ◄───────────┴─┘ │     │
│          └─ Merge all tracker additions        │     │
│          └─ Update data/applications.md ◄──────┘     │
│                                                       │
└────────────────────────────────────────────────────────────┘

┌─ UTILITIES & SCRIPTS ──────────────────────────────────────┐
│                                                            │
│  Data maintenance:                                        │
│  ├─ node merge-tracker.mjs                              │
│  │  └─ Merge batch/tracker-additions/ → applications.md │
│  ├─ node verify-pipeline.mjs                            │
│  │  └─ Health check (consistency, statuses, formats)    │
│  ├─ node normalize-statuses.mjs                         │
│  │  └─ Canonicalize all statuses (Evaluated, Applied...) │
│  ├─ node dedup-tracker.mjs                              │
│  │  └─ Remove duplicate entries                         │
│  └─ node cv-sync-check.mjs                              │
│     └─ Check CV consistency with tracker                │
│                                                            │
│  Analysis:                                                │
│  ├─ node analyze-patterns.mjs → JSON                    │
│  │  └─ Rejection pattern analysis                       │
│  └─ node followup-cadence.mjs → JSON                    │
│     └─ Follow-up scheduling                             │
│                                                            │
│  Generation:                                              │
│  ├─ node generate-pdf.mjs (Playwright)                  │
│  │  └─ HTML → PDF conversion                            │
│  └─ node generate-latex.mjs                             │
│     └─ LaTeX → PDF compilation                          │
│                                                            │
│  Standalone:                                              │
│  ├─ node scan.mjs (zero-token)                          │
│  │  └─ Direct API portal scanning                       │
│  ├─ node check-liveness.mjs                             │
│  │  └─ Job posting status checker                       │
│  ├─ node gemini-eval.mjs                                │
│  │  └─ Standalone Gemini evaluator (no CLI required)    │
│  └─ node update-system.mjs                              │
│     └─ Version checker & auto-updater                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Folder Purpose Summary

| Folder | Purpose | User Edits? | Auto-Updated? | Keep in Git? |
|--------|---------|-----------|--------------|------------|
| `.gemini/` | Gemini CLI command definitions | ❌ No | ✅ Yes | ✅ Yes |
| `modes/` | AI instruction sets (contexts) | ✅ Yes (_profile.md only) | ✅ Yes (others) | ✅ Yes |
| `config/` | Your identity & targets | ✅ Yes | ❌ No | ✅ Yes |
| `templates/` | CV template, state definitions | ❌ No | ✅ Yes | ✅ Yes |
| `data/` | Live tracker + pipeline + history | ✅ Yes (applications.md, pipeline.md) | ✅ Partial (scan-history) | ✅ Yes |
| `reports/` | Evaluation reports | ❌ No (auto-generated) | ✅ Yes | ✅ Yes |
| `output/` | Generated PDFs | ❌ No (auto-generated) | ✅ Yes | ❌ No (.gitignored) |
| `batch/` | Batch processing | ❌ Scripts only | ✅ Partial | ✅ scripts, ❌ logs/additions |
| `interview-prep/` | Interview stories | ✅ Yes (user adds) | ✅ Yes (system generates) | ✅ Yes |
| `jds/` | Saved job descriptions (optional) | ✅ Yes | ❌ No | ✅ Yes |
| `writing-samples/` | Writing samples (optional) | ✅ Yes | ❌ No | ✅ Yes |
| `fonts/` | Custom CV fonts | ❌ No | ✅ Yes | ✅ Yes |
| `dashboard/` | TUI dashboard (Go) | ❌ No | ✅ Yes | ✅ Yes |
| `docs/` | Documentation | ❌ No | ✅ Yes | ✅ Yes |
| `examples/` | Example files | ❌ No | ✅ Yes | ✅ Yes |

---

## Data Flow (Step by Step)

### When You Paste a Job Description

```
User: gemini /career-ops "Senior AI Engineer job description..."
  │
  1. Gemini loads: .gemini/commands/career-ops.toml
  2. Prompt instructs: "Load modes/_shared.md + auto-pipeline.md"
  3. Agent loads context:
     - modes/_shared.md (system rules)
     - modes/auto-pipeline.md (workflow steps)
     - modes/oferta.md (evaluation logic)
     - cv.md (your resume)
     - config/profile.yml (your identity)
     - modes/_profile.md (your customizations)
  │
  4. Agent evaluates:
     - Paso 0: Detect archetype (AI Platform? Agentic? etc.)
     - Bloque A: Role summary
     - Bloque B: CV match vs gaps
     - Bloque C: Seniority strategy
     - Bloque D: Comp analysis (WebSearch)
     - Bloque E: CV personalization plan
     - Bloque F: Interview stories (from story-bank.md)
     - Bloque G: Posting legitimacy check
     - Global score: 1-5
  │
  5. Agent generates:
     - Report: reports/001-company-slug-2026-05-05.md
     - PDF: (if score >= 3.0) output/cv-rudra-modi-company-2026-05-05.pdf
     - Tracker line: batch/tracker-additions/001.tsv
  │
  6. Agent registers:
     - data/applications.md updated (new row added after merge)
  │
  User sees: Report + Score + PDF status + Tracker update
```

### When You Run the Scanner

```
User: gemini /career-ops-scan
  │
  1. Gemini loads: .gemini/commands/career-ops-scan.toml
  2. Prompt instructs: "Load modes/_shared.md + scan.md"
  3. Agent loads:
     - portals.yml (companies to track, search queries)
     - scan-history.tsv (avoid duplicates)
     - data/applications.md (already applied?)
     - data/pipeline.md (already pending?)
  │
  4. Agent executes:
     - Level 1 (Playwright): Navigate each company's careers page
     - Level 2 (API): Query Greenhouse, Ashby, Lever, BambooHR, etc.
     - Level 3 (WebSearch): Broad discovery with site: filters
     - Filter by: title_filter.positive + title_filter.negative
     - Deduplicate: skip URLs in scan-history + applications + pipeline
  │
  5. Agent generates:
     - data/pipeline.md: Add new offers as "- [ ]" items
     - data/scan-history.tsv: Update dedup history
  │
  User sees: Summary of new offers + count
```

### When You Process the Pipeline

```
User: gemini /career-ops-pipeline
  │
  1. Gemini loads: .gemini/commands/career-ops-pipeline.toml
  2. Prompt instructs: "Load modes/_shared.md + pipeline.md"
  3. Agent loads:
     - data/pipeline.md (read "- [ ]" items)
     - modes/auto-pipeline.md (evaluation workflow)
  │
  4. For each pending URL:
     a. Extract JD (Playwright → WebFetch → manual paste)
     b. Evaluate A-G (same as auto-pipeline)
     c. Generate report + PDF
     d. Create tracker line in batch/tracker-additions/
     e. Mark as "- [x]" in pipeline.md
  │
  5. Post-processing:
     - node merge-tracker.mjs
     - batch/tracker-additions/*.tsv → data/applications.md
     - data/applications.md updated with all new entries
  │
  User sees: Progress + final tracker + summary table
```

---

## Key File Formats

### applications.md (Tracker)

```markdown
| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|----|------|---------|------|-------|--------|-----|--------|-------|
| 1 | 2026-05-05 | OpenAI | Senior AI | 4.3 | Applied | ✅ | [1](reports/001-openai-senior-ai-2026-05-05.md) | Great fit, team seems aligned |
| 2 | 2026-05-04 | Anthropic | ML Engineer | 3.8 | Evaluated | ❌ | [2](reports/002-anthropic-ml-2026-05-04.md) | Lower comp, interesting research |
```

**Columns:**
- `#` — Sequential report number
- `Date` — When evaluated (YYYY-MM-DD)
- `Company` — Company name (short)
- `Role` — Job title
- `Score` — 1-5 rating
- `Status` — Evaluated / Applied / Responded / Interview / Offer / Rejected / Discarded / SKIP
- `PDF` — ✅ if generated, ❌ if not
- `Report` — Link to detailed report
- `Notes` — User notes

---

### pipeline.md (Inbox)

```markdown
# Job Pipeline

## Pendientes
- [ ] https://jobs.example.com/posting/123
- [ ] https://boards.greenhouse.io/company/jobs/456 | Company Inc | Senior PM
- [!] https://private.url/job — Error: login required

## Procesadas
- [x] #143 | https://jobs.example.com/posting/789 | Acme Corp | AI PM | 4.2/5 | PDF ✅
- [x] #144 | https://boards.greenhouse.io/xyz/jobs/012 | BigCo | SA | 2.1/5 | PDF ❌
```

---

### batch/tracker-additions/{id}.tsv

```
num	date	company	role	status	score	pdf	report	notes
1	2026-05-05	OpenAI	Senior AI	Applied	4.3/5	✅	[1](reports/001-openai-senior-ai-2026-05-05.md)	Strong match
```

**Column order (important):** num, date, company, role, status, score, pdf, report, notes

**Note:** In applications.md, `status` and `score` columns are swapped (status BEFORE score). The merge script handles this automatically.

---

### batch-state.tsv (Batch Progress)

```
id	url	status	started_at	completed_at	report_num	score	error	retries
1	https://...	completed	2026-05-05T10:00:00Z	2026-05-05T10:05:00Z	001	4.2	-	0
2	https://...	failed	2026-05-05T10:05:00Z	2026-05-05T10:10:00Z	-	-	Timeout after 30s	1
3	https://...	pending	-	-	-	-	-	0
```

**Used for:** Resumable batch processing (crash → re-run → skips completed jobs)

---

### scan-history.tsv (Deduplication)

```
url	company	role	date_found	source
https://jobs.example.com/123	Acme	Senior AI	2026-05-05	level1-playwright
https://api.lever.co/123	BigCorp	ML Engineer	2026-05-03	level2-api
```

**Used for:** Preventing duplicate offers from scan results

---

## Command Cheat Sheet

```bash
# Discover
gemini /career-ops-scan
gemini /career-ops                           # Show menu

# Evaluate
gemini /career-ops "JD text or URL"         # Full pipeline
gemini /career-ops-evaluate "JD"            # Evaluation only
gemini /career-ops-compare "JD1" "JD2" "JD3" # Ranked comparison

# Process batch
gemini /career-ops-pipeline                 # Evaluate inbox
gemini /career-ops-batch --parallel 5       # Parallel evaluation

# Generate assets
gemini /career-ops-pdf "JD"                 # Personalized CV
gemini /career-ops-latex "JD"               # LaTeX export

# Support
gemini /career-ops-tracker                  # Status dashboard
gemini /career-ops-apply "URL"              # Fill forms
gemini /career-ops-deep "Company"           # Company research
gemini /career-ops-contact "Company"        # LinkedIn outreach
gemini /career-ops-interview-prep --company "X" --role "Y"
gemini /career-ops-patterns                 # Analyze rejections
gemini /career-ops-followup                 # Follow-up reminders

# Maintenance
npm run verify                               # Health check
npm run normalize                            # Fix statuses
npm run dedup                                # Remove duplicates
npm run merge                                # Merge batch results
node scan.mjs                                # Zero-token scanner
```

---

## Update & Maintenance

### Updating Career-Ops

```bash
# Check for updates
node update-system.mjs check

# If update available:
node update-system.mjs apply

# Your data is preserved:
# ✅ cv.md, config/profile.yml, modes/_profile.md, portals.yml
# ✅ data/, reports/, output/, interview-prep/
# ❌ modes/_shared.md, modes/*.md (others), templates/, scripts

# Rollback if needed:
node update-system.mjs rollback
```

### Health Checks

```bash
# Verify pipeline integrity
npm run verify
# Checks: all reports exist, statuses valid, no orphans

# Normalize statuses
npm run normalize
# Canonicalizes to: Evaluated, Applied, Responded, Interview, Offer, Rejected, Discarded, SKIP

# Dedup tracker
npm run dedup
# Removes duplicate entries

# Check CV sync
npm run sync-check
# Verifies cv.md is consistent with tracker
```

---

## Customization Checklist

**When you want to change something, edit:**

| Want to change... | Edit this file | Why |
|------------------|----------------|-----|
| Your resume content | `cv.md` | Source of truth for all evaluations |
| Your name, email, location | `config/profile.yml` | Used in PDFs and applications |
| Your target roles | `config/profile.yml` → `target_roles` | Affects archetype detection |
| Your salary targets | `config/profile.yml` → `compensation` | Affects comp scoring |
| Your custom archetypes | `modes/_profile.md` | Override system archetypes |
| Your proof points mapping | `modes/_profile.md` | Control what gets emphasized per role |
| Your negotiation scripts | `modes/_profile.md` | Custom language for discussions |
| Companies to track | `portals.yml` | Affects scanner discovery |
| Job title filters | `portals.yml` | Affects which offers pass scan |
| Job search queries | `portals.yml` | Affects WebSearch discovery |
| How evaluations work | `modes/oferta.md` | Changes what gets scored (system layer) |
| How PDFs are generated | `modes/pdf.md` | Changes CV personalization logic |
| CV design/layout | `templates/cv-template.html` | Visual PDF appearance |

---

## Git Ignore Guidelines

```gitignore
# Auto-generated (safe to ignore)
batch/logs/
batch/batch-state.tsv
batch/tracker-additions/
output/                    # Generated PDFs
data/scan-history.tsv      # Auto-updated
.env                       # API keys

# User data (DO commit)
cv.md
config/profile.yml
modes/_profile.md
portals.yml
data/applications.md
data/pipeline.md
reports/
interview-prep/
```

---

## See Also

- [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) — Full design
- [GEMINI-INTEGRATION.md](GEMINI-INTEGRATION.md) — Gemini CLI details
- [SETUP.md](SETUP.md) — Installation guide
