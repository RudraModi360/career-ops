# Career-Ops System Architecture & Gemini Integration

**Last Updated:** May 5, 2026  
**System Version:** 1.6.0  
**Research Scope:** Full system architecture, Gemini CLI integration, data flows, modes, and scripts

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Gemini CLI Integration](#gemini-cli-integration)
4. [Data Contract & Layers](#data-contract--layers)
5. [Folder Structure Explained](#folder-structure-explained)
6. [Modes System (Execution Workflows)](#modes-system-execution-workflows)
7. [Data Flow Pipelines](#data-flow-pipelines)
8. [Scripts & CLI Tools](#scripts--cli-tools)
9. [Scoring & Evaluation System](#scoring--evaluation-system)
10. [User Customization Points](#user-customization-points)

---

## System Overview

**Career-Ops** is an AI-powered job search automation system originally built by Santiago Fernández de Valderrama using Claude Code. It has been ported to Gemini CLI and OpenCode, maintaining the same evaluation logic, modes, and data structures across all platforms.

**Core functions:**
- Evaluate job offers with A-G scoring (skills match, seniority alignment, comp, culture, flags, legitimacy)
- Track applications in a markdown-based database
- Generate ATS-optimized CVs tailored to each job
- Scan job portals automatically (Greenhouse, Ashby, Lever, BambooHR, Teamtailor, Workday)
- Process pending URLs in batch
- Analyze rejection patterns and hiring funnel
- Manage interview prep and STAR stories
- Calculate follow-up cadence

**Tested at scale:** 740+ evaluated offers → 100+ tailored CVs → 1 Head of Applied AI role landed

---

## Core Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     GEMINI CLI / Claude Code                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼────┐      ┌──────▼──────┐
    │   User   │      │   Modes  │      │   Scripts   │
    │ Commands │      │  (Flows) │      │  (CLI tools)│
    └────┬─────┘      └─────┬────┘      └──────┬──────┘
         │                  │                   │
         │  /career-ops     │  modes/*.md       │  *.mjs
         │  /scan           │  _shared.md       │  generate-pdf.mjs
         │  /evaluate       │  _profile.md      │  scan.mjs
         │  /batch          │  oferta.md        │  merge-tracker.mjs
         │  /pdf            │  auto-pipeline.md │  verify-pipeline.mjs
         │  /apply          │  ...              │  analyze-patterns.mjs
         └────────┬─────────┴────────┬──────────┘
                  │                  │
         ┌────────▼──────────────────▼────────┐
         │      FILE SYSTEM (data layer)       │
         └────────┬──────────────────┬────────┘
                  │                  │
    ┌─────────────▼──┐     ┌────────▼──────────┐
    │ USER LAYER     │     │  SYSTEM LAYER     │
    │ (never auto-   │     │  (auto-updatable) │
    │  updated)      │     └───────────────────┘
    │                │
    │ cv.md          │
    │ config/        │
    │ modes/         │
    │ _profile.md    │
    │ article-       │
    │   digest.md    │
    │ portals.yml    │
    │ data/*         │
    │ reports/*      │
    │ output/*       │
    │ interview-prep │
    └────────────────┘
```

### Key Design Principles

1. **Separation of Concerns**
   - **User Layer:** cv.md, _profile.md, portals.yml, config/profile.yml
   - **System Layer:** modes/_shared.md, modes/*.md (other), scripts
   - User customizations NEVER auto-update; system layer updates safely

2. **Markdown-First Data**
   - Applications tracker: `data/applications.md` (markdown table)
   - Pipeline inbox: `data/pipeline.md` (markdown checklist)
   - Reports: `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`
   - CV: `cv.md` (source of truth for candidate info)

3. **Modes System**
   - Each command loads specific modes (e.g., `/evaluate` loads `modes/_shared.md` + `modes/oferta.md`)
   - Modes are instruction sets for the AI to follow
   - User customizations live in `modes/_profile.md` (always read after `_shared.md`)

4. **No Hardcoded Data**
   - CV metrics, proof points, comp targets all read from files at evaluation time
   - Enables updates without breaking evaluations

5. **Ethical by Default**
   - Evaluations ALWAYS stop before application submission
   - Scores below 4.0/5 are flagged with warnings
   - Quality over quantity is emphasized

---

## Gemini CLI Integration

### Commands Entry Points

Gemini CLI is configured via `.gemini/commands/*.toml` files. Each file defines:
- A description (shown in Gemini CLI help)
- A prompt (context loaded when command is executed)

**Command files:**
```
.gemini/commands/
├── career-ops.toml              # Main menu / auto-pipeline dispatch
├── career-ops-evaluate.toml      # /career-ops-evaluate
├── career-ops-compare.toml       # /career-ops-compare
├── career-ops-contact.toml       # /career-ops-contact (LinkedIn outreach)
├── career-ops-deep.toml          # /career-ops-deep (company research)
├── career-ops-pdf.toml           # /career-ops-pdf (CV generation)
├── career-ops-pipeline.toml      # /career-ops-pipeline (process URLs)
├── career-ops-scan.toml          # /career-ops-scan (portal discovery)
├── career-ops-batch.toml         # /career-ops-batch (mass processing)
├── career-ops-apply.toml         # /career-ops-apply (fill app forms)
├── career-ops-tracker.toml       # /career-ops-tracker (show status)
├── career-ops-training.toml      # /career-ops-training (evaluate courses)
├── career-ops-project.toml       # /career-ops-project (evaluate portfolio projects)
├── career-ops-contact.toml       # /career-ops-contact (LinkedIn research)
├── career-ops-patterns.toml      # /career-ops-patterns (rejection analysis)
└── career-ops-followup.toml      # /career-ops-followup (cadence tracking)
```

### How a Gemini Command Executes

**Example: `/career-ops-evaluate "Senior AI Engineer JD..."`**

```
Gemini CLI loads:
├── career-ops-evaluate.toml
│   └── prompt: Read modes/_shared.md + modes/oferta.md + cv.md + modes/_profile.md
│
└── Agent executes:
    ├── Parse modes/_shared.md → scoring system, archetypes, global rules
    ├── Parse modes/oferta.md → 7-block evaluation template (A-F + G)
    ├── Parse cv.md → candidate skills, projects, experience
    ├── Parse modes/_profile.md → user customizations (archetypes, narrative, proof points)
    ├── Evaluate the JD against above context
    ├── Generate blocks A-G with scores
    └── Save report to reports/{###}-{company-slug}-{date}.md + register in tracker
```

### Gemini CLI vs Claude Code

| Feature | Gemini CLI | Claude Code | OpenCode |
|---------|-----------|-----------|----------|
| **Platform** | Google Gemini API | Claude (via Cursor/VS Code) | OpenCode.ai |
| **Auth** | GEMINI_API_KEY env var | Automatic (Cursor/VS Code) | OpenCode API key |
| **Commands** | `.gemini/commands/*.toml` | `.claude/skills/` + claude-code context | `.opencode/commands/` |
| **Cost Model** | Gemini free tier (generous) | Cursor Pro / Token-based | OpenCode free tier |
| **Modes** | Shared `modes/*.md` | Shared `modes/*.md` | Shared `modes/*.md` |
| **Data Access** | Full filesystem | Full workspace | Full workspace |
| **Parallelization** | CLI flags | Agent tool | Native subagent |

**All three platforms use the same:**
- Evaluation logic (modes/_shared.md, modes/oferta.md)
- CV (cv.md)
- User customizations (modes/_profile.md, config/profile.yml)
- Scripts (*.mjs)

---

## Data Contract & Layers

### THE CARDINAL RULE

> **User Layer (NEVER auto-updated):** cv.md, config/profile.yml, modes/_profile.md, article-digest.md, portals.yml, data/*, reports/*, output/*, interview-prep/*
>
> **System Layer (auto-updatable):** modes/_shared.md, modes/*.md (except _profile.md), *.mjs scripts, dashboard/, templates/
>
> **THE RULE:** When the user customizes anything (archetypes, narrative, negotiation scripts, proof points, location policy, comp targets), ALWAYS write to `modes/_profile.md` or `config/profile.yml`. NEVER edit `modes/_shared.md` for user-specific content.

This ensures:
- System updates don't overwrite customizations
- Customizations are easy to maintain and migrate
- Version control treats user data differently than system code

### User Layer Files

| File | Purpose | Editability |
|------|---------|-----------|
| `cv.md` | Canonical resume/CV in markdown | ✏️ User edits directly |
| `config/profile.yml` | Candidate identity, targets, comp | ✏️ User edits directly |
| `modes/_profile.md` | User archetypes, narrative, proof points, negotiation scripts | ✏️ User edits (never auto-updated) |
| `article-digest.md` | Proof point summary from portfolio (optional) | ✏️ User adds/updates |
| `portals.yml` | Job portal configuration, search queries, tracked companies | ✏️ User edits to add/remove companies |
| `data/applications.md` | Application tracker (markdown table) | ✏️ Updated by merge-tracker.mjs |
| `data/pipeline.md` | Pending URLs inbox (markdown checklist) | ✏️ User adds URLs manually |
| `data/follow-ups.md` | Follow-up history | ✏️ Updated by followup-cadence.mjs |
| `data/scan-history.tsv` | Deduplication history for scanner | 🔄 Auto-generated by scan.mjs |
| `reports/{###}-{slug}-{date}.md` | Individual evaluation reports | 🔄 Auto-generated by agent |
| `output/cv-{name}-{company}-{date}.pdf` | Generated ATS-optimized CVs | 🔄 Auto-generated by generate-pdf.mjs |
| `interview-prep/story-bank.md` | Accumulated STAR+R stories | ✏️ User adds stories, agent appends |
| `interview-prep/{company}-{role}.md` | Company-specific interview prep | 🔄 Auto-generated by agent |

### System Layer Files

| File | Purpose |
|------|---------|
| `GEMINI.md` | Gemini CLI configuration & commands |
| `CLAUDE.md` | Claude Code & OpenCode configuration |
| `modes/_shared.md` | Global scoring logic, archetypes, rules |
| `modes/*.md` (other) | Instruction sets for each mode |
| `templates/cv-template.html` | HTML CV template |
| `templates/cv-template.tex` | LaTeX CV template |
| `templates/states.yml` | Canonical application statuses |
| `*.mjs` | Utility scripts (scan, merge, verify, etc.) |
| `batch/*` | Batch processing infrastructure |
| `dashboard/*` | TUI dashboard (Go) |

---

## Folder Structure Explained

```
d:\career-ops\
│
├─ .gemini/                          [Gemini CLI configuration]
│  └─ commands/                      # 15 command definitions (.toml)
│     ├─ career-ops.toml             # Main dispatcher
│     ├─ career-ops-evaluate.toml    # /career-ops-evaluate
│     ├─ career-ops-scan.toml        # /career-ops-scan
│     └─ ...                         # Other commands
│
├─ modes/                            [Execution workflows / instruction sets]
│  ├─ _shared.md                     # System context (auto-updatable)
│  ├─ _profile.md                    # User customizations (NEVER auto-updated)
│  ├─ _profile.template.md           # Template for _profile.md
│  ├─ auto-pipeline.md               # Full pipeline when user pastes JD
│  ├─ oferta.md                      # 7-block evaluation (A-F + G)
│  ├─ ofertas.md                     # Compare multiple offers
│  ├─ pdf.md                         # ATS-optimized CV generation
│  ├─ latex.md                       # LaTeX CV generation
│  ├─ pipeline.md                    # Process URLs from inbox
│  ├─ scan.md                        # Portal discovery
│  ├─ batch.md                       # Mass processing
│  ├─ apply.md                       # Application form filling
│  ├─ deep.md                        # Company research
│  ├─ contacto.md                    # LinkedIn outreach
│  ├─ interview-prep.md              # Interview preparation
│  ├─ project.md                     # Portfolio project evaluation
│  ├─ training.md                    # Course/cert evaluation
│  ├─ tracker.md                     # Status dashboard
│  ├─ patterns.md                    # Rejection pattern analysis
│  └─ followup.md                    # Follow-up cadence
│
├─ config/                           [User configuration]
│  ├─ profile.yml                    # Your candidate identity & targets
│  └─ profile.example.yml            # Example (system-provided)
│
├─ templates/                        [Templates & reference data]
│  ├─ cv-template.html               # HTML CV template
│  ├─ cv-template.tex                # LaTeX CV template
│  ├─ states.yml                     # Canonical application statuses
│  ├─ portals.example.yml            # Example portal config
│  └─ README.md                      # Template documentation
│
├─ data/                             [Live application data]
│  ├─ applications.md                # Tracker table (main database)
│  ├─ pipeline.md                    # Pending URLs inbox (if user creates)
│  ├─ scan-history.tsv               # Scanner dedup history (auto-generated)
│  ├─ follow-ups.md                  # Follow-up history (auto-generated)
│  └─ README.md                      # Data structure documentation
│
├─ reports/                          [Evaluation reports (auto-generated)]
│  ├─ 001-hoonartek-genai-eng-2026-05-05.md
│  ├─ 002-...
│  └─ ...
│
├─ output/                           [Generated CVs (auto-generated, gitignored)]
│  ├─ cv-rudra-modi-hoonartek-2026-05-05.pdf
│  └─ ...
│
├─ batch/                            [Batch processing infrastructure]
│  ├─ batch-runner.sh                # Standalone batch orchestrator
│  ├─ batch-prompt.md                # System prompt for batch workers
│  ├─ README.md                      # Batch documentation
│  ├─ logs/                          # Execution logs (gitignored)
│  └─ tracker-additions/             # Tracker lines (gitignored)
│     ├─ merged/                     # Merged tracker lines
│     └─ 001.tsv, 002.tsv, ...
│
├─ interview-prep/                   [Interview preparation]
│  ├─ story-bank.md                  # Master STAR+R stories (accumulates)
│  └─ {company}-{role}.md            # Company-specific prep (auto-generated)
│
├─ jds/                              [Saved job descriptions (optional)]
│  └─ linkedin-pm-ai.md              # Example JD (user saves)
│
├─ writing-samples/                  [User writing samples (optional)]
│  └─ README.md                      # How to organize samples
│
├─ fonts/                            [Custom fonts for PDF CV]
│  └─ ... (font files for CV template)
│
├─ dashboard/                        [TUI dashboard (Go)]
│  ├─ main.go                        # Dashboard entry point
│  ├─ go.mod                         # Go dependencies
│  └─ internal/                      # Dashboard code
│
├─ docs/                             [Documentation]
│  ├─ ARCHITECTURE.md                # This file
│  ├─ SETUP.md                       # Setup instructions
│  ├─ SCRIPTS.md                     # Script documentation
│  ├─ CUSTOMIZATION.md               # Customization guide
│  ├─ CODEX.md                       # Codex-specific notes
│  └─ README.md                      # Documentation overview
│
├─ examples/                         [Example files]
│  ├─ cv-example.md                  # Example CV
│  ├─ article-digest-example.md      # Example proof points
│  ├─ sample-report.md               # Example evaluation report
│  └─ dual-track-engineer-instructor/ # Example profile
│
├─ GEMINI.md                         # Gemini CLI setup & commands
├─ CLAUDE.md                         # Claude Code setup & commands
├─ AGENTS.md                         # AI agent configuration
├─ DATA_CONTRACT.md                  # Full data layer specification
├─ cv.md                             # YOUR RESUME (canonical source)
├─ portals.yml                       # YOUR job portal configuration
├─ article-digest.md                 # YOUR proof point summary (optional)
├─ package.json                      # npm dependencies + scripts
├─ VERSION                           # System version tag
│
├─ *.mjs scripts                     [Utility CLIs]
│  ├─ scan.mjs                       # Zero-token portal scanner
│  ├─ generate-pdf.mjs               # Playwright: HTML → PDF
│  ├─ generate-latex.mjs             # LaTeX compilation
│  ├─ merge-tracker.mjs              # Merge batch results into applications.md
│  ├─ verify-pipeline.mjs            # Health check
│  ├─ normalize-statuses.mjs         # Status canonicalization
│  ├─ dedup-tracker.mjs              # Remove duplicate entries
│  ├─ analyze-patterns.mjs           # Rejection pattern analysis
│  ├─ followup-cadence.mjs           # Follow-up scheduling
│  ├─ check-liveness.mjs             # Job posting liveness checker
│  ├─ gemini-eval.mjs                # Standalone Gemini evaluator
│  ├─ cv-sync-check.mjs              # CV consistency checker
│  ├─ update-system.mjs              # Version checker & updater
│  ├─ doctor.mjs                     # System diagnostics
│  └─ ...
│
├─ README.md                         # Main project README
├─ SECURITY.md                       # Security policy
├─ CODE_OF_CONDUCT.md                # Community guidelines
├─ CONTRIBUTING.md                   # Contribution guidelines
└─ LICENSE                           # MIT License
```

---

## Modes System (Execution Workflows)

### What is a Mode?

A **mode** is a markdown file (`modes/*.md`) that contains instructions for the AI to execute a specific workflow. When you run `/career-ops-evaluate`, the system:

1. Reads `modes/_shared.md` (global context)
2. Reads `modes/oferta.md` (evaluation mode)
3. Reads your `cv.md`, `config/profile.yml`, `modes/_profile.md`
4. Executes the instructions to evaluate the offer

**Key:** Modes are composable. Most complex workflows read BOTH:
- `modes/_shared.md` (system context: scoring logic, archetypes, rules)
- A specific mode file (e.g., `modes/oferta.md` for evaluation)

### Mode Command Mapping

| Command | Modes Loaded | Output |
|---------|--------------|--------|
| `/career-ops {JD}` | _shared.md + auto-pipeline.md | Full pipeline (eval + report + PDF + tracker) |
| `/career-ops-evaluate` | _shared.md + oferta.md | Evaluation report only (A-G blocks) |
| `/career-ops-compare` | _shared.md + ofertas.md | Ranked comparison of multiple offers |
| `/career-ops-pdf` | _shared.md + pdf.md | ATS-optimized CV PDF |
| `/career-ops-latex` | _shared.md + latex.md | LaTeX CV export (.tex for Overleaf) |
| `/career-ops-pipeline` | _shared.md + pipeline.md | Process pending URLs from inbox |
| `/career-ops-scan` | _shared.md + scan.md | Discover new offers from portals |
| `/career-ops-batch` | _shared.md + batch.md | Mass evaluate multiple JDs |
| `/career-ops-apply` | _shared.md + apply.md | Fill application forms |
| `/career-ops-tracker` | tracker.md | Show application status dashboard |
| `/career-ops-deep` | deep.md | Company research & LinkedIn |
| `/career-ops-contact` | contacto.md | LinkedIn outreach drafting |
| `/career-ops-interview-prep` | interview-prep.md | Interview preparation guide |
| `/career-ops-project` | project.md | Evaluate a portfolio project idea |
| `/career-ops-training` | training.md | Evaluate course/certification |
| `/career-ops-patterns` | patterns.md | Analyze rejection patterns |
| `/career-ops-followup` | followup.md | Calculate follow-up cadence |

### Structure of `modes/_shared.md`

**Global system context** (120+ lines):
- Sources of truth (cv.md, article-digest.md, profile.yml, _profile.md)
- Scoring system (6 dimensions: Match, North Star, Comp, Culture, Red Flags, Global)
- Archetype detection (6 types: AI Platform, Agentic, Tech PM, Solutions Architect, FDE, Transformation)
- Posting legitimacy criteria (Block G)
- Global rules (never invent data, never auto-submit, etc.)

**Read by EVERY mode** — ensures consistency across all workflows.

### Structure of `modes/oferta.md` (Evaluation Mode)

**7-block evaluation template** (used by `/career-ops-evaluate` and auto-pipeline):

| Block | What it Measures | Example Output |
|-------|-----------------|-----------------|
| **A** | Role summary | Archetype, domain, function, seniority, remote, team size |
| **B** | CV match | Map JD requirements → CV lines, identify gaps, mitigation strategy |
| **C** | Seniority strategy | Level detected, how to position experience, handling downgrades |
| **D** | Comp & demand | Glassdoor/Levels.fyi data, salary range, market reputation |
| **E** | Personalization plan | Top 5 CV changes, top 5 LinkedIn changes for this offer |
| **F** | Interview prep | 6-10 STAR+R stories mapped to JD requirements, reflection column |
| **G** | Legitimacy assessment | High Confidence / Proceed with Caution / Suspicious |

**Also returns:**
- Global score (1-5)
- Recommendation (Apply / Consider / Skip)
- Post-evaluation actions (save report, generate PDF if score >= 4.5, register in tracker)

---

## Data Flow Pipelines

### Pipeline 1: Manual JD Evaluation (Auto-Pipeline)

```
User action:  /career-ops "Senior AI Engineer job description..."
              (or paste URL)

             ↓

Step 0        Extract JD
              ├─ If URL: use Playwright → browser_navigate + snapshot
              ├─ If text: use directly
              └─ If extract fails: ask user to paste manually

             ↓

Step 1        Evaluate A-G
              ├─ Load modes/_shared.md + modes/oferta.md
              ├─ Load cv.md + config/profile.yml + modes/_profile.md
              ├─ Score offer on 6 dimensions
              ├─ Assess posting legitimacy
              └─ Generate blocks A-G

             ↓

Step 2        Save report
              ├─ Calculate REPORT_NUM (max existing + 1)
              ├─ Save to reports/{###}-{company-slug}-{YYYY-MM-DD}.md
              └─ Include block G in header: **Legitimacy:** {tier}

             ↓

Step 3        Generate PDF (if score >= 3.0)
              ├─ Extract 15-20 JD keywords
              ├─ Personalize Professional Summary
              ├─ Reorder bullets by relevance
              ├─ Build competency grid
              └─ Generate output/cv-{name}-{company}-{date}.pdf

             ↓

Step 4        Draft application answers (if score >= 4.5)
              ├─ Extract form questions via Playwright
              ├─ Generate 2-4 sentence responses
              ├─ Save to report as section H
              └─ Note: user still reviews before submitting

             ↓

Step 5        Register in tracker
              └─ Update data/applications.md with evaluation result

User sees:    Full report (A-G) + PDF + status
```

### Pipeline 2: Batch Portal Scanning

```
User action:  /career-ops-scan
              (or npm run scan)

             ↓

Load config   portals.yml
              ├─ title_filter.positive (keywords matching your targets)
              ├─ tracked_companies (Ashby, Greenhouse, Workday, etc.)
              └─ search_queries (WebSearch fallback)

             ↓

Level 1       Direct Playwright (PRIMARY)
Discovery     For each company in tracked_companies:
              ├─ browser_navigate to careers_url
              ├─ browser_snapshot to read all job listings
              ├─ Extract {title, url, company}
              └─ Filter by title_filter.positive

             ↓

Level 2       API / Feeds (COMPLEMENTARY)
Discovery     For companies with API support:
              ├─ Greenhouse: fetch from boards-api.greenhouse.io/v1/boards/{id}/jobs
              ├─ Ashby: POST GraphQL query to jobs.ashbyhq.com
              ├─ Lever: fetch from api.lever.co/v0/postings/{company}
              ├─ BambooHR: fetch from {company}.bamboohr.com/careers
              └─ Workday/Teamtailor: similar API patterns

             ↓

Level 3       WebSearch (BROAD DISCOVERY)
Discovery     For queries in search_queries:
              ├─ Execute WebSearch with site: filters
              └─ Extract results (may be stale)

             ↓

Deduplication Read scan-history.tsv + applications.md + pipeline.md
              ├─ Skip URLs already seen
              ├─ Verify candidates are new
              └─ Update scan-history.tsv

             ↓

Filter        Apply title_filter
              ├─ Title must have ≥1 positive keyword
              ├─ Title must have 0 negative keywords
              └─ Skip mismatches

             ↓

Output        Add to pipeline.md
              ├─ Add as pending items
              └─ User can run /career-ops-pipeline to process

User sees:    Summary of new offers found + portal activity
```

### Pipeline 3: Batch Process URLs (Pipeline Mode)

```
User action:  /career-ops-pipeline
              (or manually edit data/pipeline.md)

             ↓

Read inbox    data/pipeline.md
              ├─ Find all "- [ ]" items (pending)
              └─ Extract URLs

             ↓

For each URL  (optionally parallel with agents)
              │
              ├─ Extract JD (Playwright → WebFetch → WebSearch)
              │
              ├─ Auto-pipeline for this URL
              │  ├─ Evaluate A-G
              │  ├─ Save report
              │  ├─ Generate PDF
              │  └─ Register in tracker
              │
              └─ Mark as "[x]" (processed) in pipeline.md

             ↓

Merge results node merge-tracker.mjs
              ├─ Consolidate batch/tracker-additions/ TSV files
              ├─ Merge into data/applications.md
              ├─ Deduplicate
              └─ Sort by date

             ↓

Summary       Show table of results
              ├─ Company | Role | Score | PDF | Action
              └─ Health: any failures?

User sees:    Processing status + final tracker
```

### Pipeline 4: Batch Evaluate Many URLs (Batch Mode)

```
User action:  /career-ops-batch
              (or batch/batch-runner.sh)

             ↓

Mode A (CLI mode): Conductor navigates portals
                   ├─ Chrome: search portal
                   ├─ Extract all job URLs
                   ├─ Save to batch-input.tsv
                   └─ Dispatch each to worker

Mode B (Standalone): User provides batch-input.tsv
                     └─ Direct evaluation

             ↓

For each job (parallel workers)
              ├─ Worker receives JD
              ├─ Evaluates A-G
              ├─ Saves report + PDF
              ├─ Saves tracker line to batch/tracker-additions/{id}.tsv
              └─ Updates batch-state.tsv (status + score)

             ↓

Tracking      batch-state.tsv
              ├─ id | url | status | report_num | score | error | retries
              └─ Resumable: crash → re-run → skips completed jobs

             ↓

Merge         node merge-tracker.mjs
              └─ Consolidate all tracker-additions → applications.md

User sees:    Progress as jobs complete (parallel)
```

---

## Scripts & CLI Tools

### npm run scripts (from package.json)

```bash
npm run doctor              # System diagnostics
npm run verify             # Verify pipeline integrity
npm run normalize          # Canonicalize statuses
npm run dedup              # Remove duplicates
npm run merge              # Merge batch results
npm run pdf                # Generate PDF (see generate-pdf.mjs)
npm run sync-check         # CV consistency check
npm run update:check       # Check for system updates
npm run update             # Apply system update
npm run rollback           # Rollback to previous version
npm run liveness           # Check if postings are active
npm run scan               # Scan portals for new offers
npm run gemini:eval        # Evaluate JD using Gemini API
```

### Standalone .mjs Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scan.mjs` | **Zero-token** portal scanner (API-only, no Playwright) | `node scan.mjs` |
| `generate-pdf.mjs` | HTML → PDF conversion via Playwright | `node generate-pdf.mjs input.html output.pdf` |
| `generate-latex.mjs` | LaTeX → PDF compilation + validation | `node generate-latex.mjs input.tex output.pdf` |
| `gemini-eval.mjs` | Standalone Gemini evaluator (no CLI required) | `node gemini-eval.mjs "JD text"` |
| `merge-tracker.mjs` | Merge batch/tracker-additions → applications.md | `node merge-tracker.mjs` |
| `verify-pipeline.mjs` | Health check (statuses, reports, tracker consistency) | `node verify-pipeline.mjs` |
| `normalize-statuses.mjs` | Canonicalize all statuses to valid values | `node normalize-statuses.mjs` |
| `dedup-tracker.mjs` | Remove duplicate entries | `node dedup-tracker.mjs` |
| `analyze-patterns.mjs` | Rejection pattern analysis → JSON | `node analyze-patterns.mjs` |
| `followup-cadence.mjs` | Calculate follow-up schedule → JSON | `node followup-cadence.mjs` |
| `check-liveness.mjs` | Verify if job postings are still active | `node check-liveness.mjs` |
| `cv-sync-check.mjs` | Check CV consistency with tracker | `node cv-sync-check.mjs` |
| `update-system.mjs` | Version checker & auto-updater | `node update-system.mjs check/apply/rollback` |
| `doctor.mjs` | System diagnostics & troubleshooting | `node doctor.mjs` |

### batch/batch-runner.sh (Bash Orchestrator)

```bash
bash batch/batch-runner.sh [OPTIONS]

OPTIONS:
  --dry-run           # List pending jobs without executing
  --retry-failed      # Retry only failed jobs
  --start-from N      # Start from job ID N
  --parallel N        # N workers in parallel (default: 3)
  --max-retries N     # Attempts per job (default: 2)
```

---

## Scoring & Evaluation System

### 6 Scoring Dimensions

Each offer is scored 1-5 on these dimensions:

| Dimension | What it Measures | How It Affects Score |
|-----------|-----------------|----------------------|
| **A: Match** | Skills, experience, proof points alignment to JD | CV relevance + gap analysis |
| **B: North Star** | How well the role fits your target archetypes | Archetype detection + _profile.md weighting |
| **C: Comp** | Salary vs market + currency + location | Glassdoor + Levels.fyi + your target range |
| **D: Culture** | Company culture, growth, stability, remote policy | Company research + JD signals |
| **E: Red Flags** | Blockers, warnings, concerning signals | Negative adjustments |
| **Global** | Weighted average of above | Final recommendation score |

### Score Interpretation

- **4.5-5.0** → Strong match → Recommend applying immediately
- **4.0-4.4** → Good match → Worth applying
- **3.5-3.9** → Decent but not ideal → Apply only if specific reason
- **Below 3.5** → Recommend AGAINST applying (ethical gate)

### Archetype Detection

The system classifies offers into 6 archetypes:

1. **AI Platform / LLMOps** → Observability, evals, pipelines, monitoring, reliability
2. **Agentic / Automation** → Agents, HITL, orchestration, workflow, multi-agent
3. **Technical AI PM** → PRD, roadmap, discovery, stakeholder, product manager
4. **AI Solutions Architect** → Architecture, enterprise, integration, design, systems
5. **AI Forward Deployed** → Client-facing, deploy, prototype, fast delivery, field
6. **AI Transformation** → Change management, adoption, enablement, transformation

**Why archetypes matter:**
- Determines which proof points to emphasize
- Changes how you rewrite your Professional Summary
- Selects which STAR stories to prepare

### Posting Legitimacy Assessment (Block G)

**Three tiers:**
- **High Confidence** → Real, active opening (most signals positive)
- **Proceed with Caution** → Mixed signals worth noting (some concerns)
- **Suspicious** → Multiple ghost job indicators, investigate first

**Key signals (ranked by reliability):**

| Signal | Source | Reliability | What to Look For |
|--------|--------|-------------|------------------|
| Posting age | Page snapshot | High | Under 30d = good, 30-60d = mixed, 60d+ = concerning |
| Apply button | Page snapshot | High | Active = good, closed/missing = red flag |
| Tech specificity | JD text | Medium | Generic = weaker signal, specific = stronger |
| Requirements realism | JD text | Medium | Contradictions = strong signal, vagueness = weaker |
| Recent layoffs | WebSearch | Medium | Note: department, timing, scale |
| Reposting pattern | scan-history.tsv | Medium | Same role 2+ times in 90 days = concerning |
| Salary transparency | JD text | Low | Jurisdiction-dependent, many legitimate reasons to omit |

---

## User Customization Points

### 1. Your Profile (`config/profile.yml`)

```yaml
candidate:
  full_name: "Rudra Modi"
  email: "..."
  phone: "..."
  location: "Gujarat, India"
  linkedin: "..."
  portfolio_url: "..."
  github: "..."
  twitter: "..."

target_roles:
  primary:
    - "AI/ML Engineer"
    - "Generative AI Engineer"
    - "LLM Engineer"
    - ...

compensation:
  target_range: "₹8L-20L"
  currency: "INR"
  minimum: "₹6L"

location:
  country: "India"
  city: ["Bangalore", "Hyderabad", "Pune", "Mumbai"]
```

### 2. Your Customizations (`modes/_profile.md`)

```markdown
## Your Target Roles
[Your archetype mappings]

## Your Adaptive Framing
[How you emphasize experience per archetype]

## Your Exit Narrative
[Your headline + story]

## Your Cross-cutting Advantage
[Your superpowers]

## Your Portfolio / Demo
[Links to projects]

## Your Comp Targets
[Salary expectations]

## Your Negotiation Scripts
[Scripts for salary discussions]

## Your Location Policy
[City preferences, remote flexibility]
```

### 3. Your Resume (`cv.md`)

Markdown format with sections:
- Summary
- Experience (with quantified achievements)
- Projects (with proof points)
- Education
- Skills

### 4. Your Portals (`portals.yml`)

```yaml
title_filter:
  positive:
    - "AI"
    - "ML"
    - "LLM"
    - ...
  negative:
    - "Intern"
    - ".NET"
    - ...

tracked_companies:
  - name: "OpenAI"
    careers_url: "https://openai.com/careers"
    enabled: true

search_queries:
  - name: "Ashby AI Engineer"
    query: "site:jobs.ashbyhq.com 'AI Engineer'"
    enabled: true
```

### 5. Your Proof Points (`article-digest.md` — Optional)

Compact summary of key achievements (used when detailed CV is too long).

### 6. Your Interview Stories (`interview-prep/story-bank.md`)

Master STAR+R stories that accumulate over time. Each evaluation appends new stories discovered.

---

## Key Concepts

### The "Data Contract" Philosophy

The system separates **immutable user data** (cv.md, profile.yml, _profile.md) from **updatable system code** (modes/*.md, scripts). This ensures:
- You can update the system without losing customizations
- Version control cleanly separates user from system
- Migrations are simple (user layer is portable)

### The "Modes" Philosophy

Instead of hardcoding logic, the system treats each workflow as a reusable instruction set (markdown file). To change how evaluations work, you edit `modes/oferta.md`, not application code. This makes the system:
- Transparent (you can read the exact evaluation criteria)
- Customizable (you can modify instructions without touching code)
- Portable (modes work across Claude, Gemini, OpenCode)

### The "Score Gate" Philosophy

Scores below 4.0/5 trigger warnings. This prevents low-quality applications that waste both your time and recruiters' time. The system is designed for **quality over quantity**.

### The "No Auto-Submit" Philosophy

The system ALWAYS stops before submitting applications. You review every word before hitting Apply. The agent fills forms, drafts responses, generates PDFs — but the final decision is always yours.

---

## How Your System Fits Together

When you run `/career-ops-scan`:

```
1. Read portals.yml (your config)
2. Load modes/_shared.md + scan.md (instructions)
3. Execute Level 1 (Playwright careers pages)
4. Execute Level 2 (API calls to ATS platforms)
5. Filter by your title_filter (from portals.yml)
6. Deduplicate against scan-history.tsv
7. Add new offers to data/pipeline.md
8. You run /career-ops-pipeline to process them
```

When you evaluate an offer:

```
1. Paste JD or URL
2. System loads _shared.md + oferta.md
3. Reads cv.md (your resume)
4. Reads config/profile.yml (your targets)
5. Reads modes/_profile.md (your customizations)
6. Evaluates offer against YOUR context
7. Generates report with A-G blocks
8. Saves report to reports/
9. Registers in tracker
10. (Optional) Generates personalized PDF
11. (Optional) Drafts application answers
```

The entire system is built around **your data being the source of truth**. Everything flows from cv.md, profile.yml, and _profile.md.

---

## Update Strategy

The system auto-updates:
- `modes/_shared.md` (global scoring logic)
- All other `modes/*.md` files
- Scripts (*.mjs)
- Templates

But PRESERVES (never overwrites):
- `cv.md`
- `config/profile.yml`
- `modes/_profile.md`
- `portals.yml`
- All `data/` and `reports/` and `output/`

This means you can update the system safely without losing your work.

---

## See Also

- [SETUP.md](SETUP.md) — Installation and first-run guide
- [SCRIPTS.md](SCRIPTS.md) — Detailed script documentation
- [CUSTOMIZATION.md](CUSTOMIZATION.md) — How to personalize for your career
- [CODEX.md](CODEX.md) — Codex-specific setup notes
- [GEMINI.md](../GEMINI.md) — Gemini CLI commands reference
- [CLAUDE.md](../CLAUDE.md) — Claude Code commands reference
