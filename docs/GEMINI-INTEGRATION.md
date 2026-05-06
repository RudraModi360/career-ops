# Career-Ops for Gemini CLI — Complete Integration Guide

**Updated:** May 5, 2026  
**Scope:** Gemini CLI commands, execution flow, configuration, and workflow examples

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Gemini CLI Commands Reference](#gemini-cli-commands-reference)
3. [Command Execution Flow](#command-execution-flow)
4. [How Gemini Commands Load Context](#how-gemini-commands-load-context)
5. [Practical Workflows](#practical-workflows)
6. [Troubleshooting & Tips](#troubleshooting--tips)

---

## Quick Start

### Prerequisites

```bash
# Install Gemini CLI
# https://github.com/google-gemini/gemini-cli

# Get free API key
# https://aistudio.google.com/apikey

# Set environment variable
export GEMINI_API_KEY=your_api_key_here
```

### First Command

```bash
# Show help and available commands
gemini career-ops

# Output shows all 15 sub-commands

# Evaluate a job description
gemini career-ops-evaluate "Senior AI Engineer at OpenAI..."

# Or evaluate from URL
gemini career-ops-evaluate "https://jobs.openai.com/api/..."
```

### First Run Setup (If Not Done)

```bash
# Check if system is configured
ls cv.md config/profile.yml modes/_profile.md portals.yml

# If any missing, run setup
gemini career-ops
# → Prompts you to create missing files
```

---

## Gemini CLI Commands Reference

### Command List (15 total)

```bash
gemini /career-ops                    # Main dispatcher
gemini /career-ops-evaluate           # Evaluate offer (A-G scoring)
gemini /career-ops-compare            # Compare multiple offers
gemini /career-ops-pipeline           # Process URLs from inbox
gemini /career-ops-scan               # Discover new offers
gemini /career-ops-batch              # Batch evaluate many JDs
gemini /career-ops-pdf                # Generate ATS-optimized CV
gemini /career-ops-latex              # Export CV as LaTeX (.tex)
gemini /career-ops-apply              # Fill application forms
gemini /career-ops-tracker            # Show application status
gemini /career-ops-deep               # Company research
gemini /career-ops-contact            # LinkedIn outreach drafting
gemini /career-ops-interview-prep     # Interview preparation
gemini /career-ops-project            # Evaluate portfolio project
gemini /career-ops-training           # Evaluate course/cert
gemini /career-ops-patterns           # Analyze rejection patterns
gemini /career-ops-followup           # Calculate follow-up cadence
```

### Detailed Command Reference

#### `/career-ops` — Main Dispatcher

**Purpose:** Show menu or auto-evaluate a JD

```bash
gemini /career-ops
# → Shows menu with all commands

gemini /career-ops "Senior AI Engineer JD..."
# → Auto-pipeline: evaluate + report + PDF + tracker

gemini /career-ops https://jobs.example.com/posting/123
# → Extract JD from URL, then auto-pipeline
```

**What it does:**
- If no arguments → show discovery menu
- If arguments contain JD keywords or URL → run auto-pipeline
- Auto-pipeline = evaluate A-G + save report + generate PDF + update tracker

**Modes loaded:** `_shared.md` + `auto-pipeline.md` (or `GEMINI.md` for menu)

**Output:**
```
Report: reports/123-company-slug-2026-05-05.md
PDF: output/cv-rudra-modi-company-2026-05-05.pdf
Tracker: data/applications.md (updated)
Score: 4.2/5
Status: Applied ✅
```

---

#### `/career-ops-evaluate` — Evaluation Only

**Purpose:** Score an offer without generating PDF or auto-submitting

```bash
gemini /career-ops-evaluate "Full JD text..."
gemini /career-ops-evaluate https://boards.greenhouse.io/.../job/123
```

**What it does:**
1. Extracts JD from URL (Playwright preferred, WebFetch fallback)
2. Loads `_shared.md` + `oferta.md` + your `cv.md` + `profile.yml` + `_profile.md`
3. Evaluates on 6 dimensions (Match, North Star, Comp, Culture, Red Flags, Legitimacy)
4. Returns blocks A-G with detailed reasoning
5. Saves report to `reports/`
6. Registers in `data/applications.md`

**Modes loaded:** `_shared.md` + `oferta.md`

**Output:** 7-block evaluation report (no PDF, no application drafting)

**Use when:**
- You want to review evaluation before deciding to apply
- You want to compare offers on criteria (use `/career-ops-compare` instead)
- Score is < 4.0 and you want to understand why

---

#### `/career-ops-compare` — Compare Multiple Offers

**Purpose:** Rank and compare 2-5 offers side-by-side

```bash
gemini /career-ops-compare \
  "https://job1.com/posting" \
  "https://job2.com/posting" \
  "https://job3.com/posting"

# Or paste text:
gemini /career-ops-compare "Senior role at Acme..." "Manager role at BigCorp..."
```

**What it does:**
1. Evaluates each offer separately (A-G blocks)
2. Creates comparison table:
   ```
   | Offer | Score | Match | Comp | Culture | Remote | Recommendation |
   |-------|-------|-------|------|---------|--------|-----------------|
   | Acme  | 4.3   | 4.5   | 4.0  | 4.2     | 5      | Apply now      |
   | BigCorp | 3.8 | 3.5   | 4.5  | 3.2     | 2      | Proceed w/caution |
   ```
3. Ranked recommendations (best to worst)
4. Narrative for each: why you'd choose offer A over B

**Modes loaded:** `_shared.md` + `ofertas.md`

**Output:** Comparison report + ranked recommendations

**Use when:**
- You've applied to multiple roles
- You have multiple offers and need to decide
- You want to understand trade-offs objectively

---

#### `/career-ops-pipeline` — Process Inbox URLs

**Purpose:** Batch process all pending URLs from `data/pipeline.md`

```bash
gemini /career-ops-pipeline

# Results show:
# ✅ https://jobs.example.com/123 → 4.2/5 → Applied
# ✅ https://...
# ❌ https://... → Could not extract JD
```

**What it does:**
1. Reads `data/pipeline.md` (looks for `- [ ]` items)
2. For each pending URL:
   - Extracts JD (Playwright → WebFetch → manual paste fallback)
   - Evaluates A-G
   - Generates PDF (if score >= 3.0)
   - Registers in tracker
   - Marks as `- [x]` (processed)
3. Merges batch results
4. Shows summary table

**Modes loaded:** `_shared.md` + `pipeline.md` + `auto-pipeline.md`

**Output:** Processed URLs + updated tracker

**Workflow:**
```
1. Use /career-ops-scan to find offers
2. They get added to data/pipeline.md as pending
3. Run /career-ops-pipeline to evaluate them all at once
4. New scores appear in data/applications.md
```

**Use when:**
- You've accumulated 3+ URLs to evaluate
- You want to batch process instead of one-by-one

---

#### `/career-ops-scan` — Discover New Offers

**Purpose:** Search job portals for matching offers

```bash
gemini /career-ops-scan

# Output:
# Level 1 (Playwright careers pages) → 47 results
# Level 2 (ATS APIs) → 12 results (Greenhouse, Ashby, Lever)
# Level 3 (WebSearch) → 8 results
# Deduplicated: 52 new offers found
# Added to data/pipeline.md
```

**What it does:**
1. Loads `portals.yml` (your tracked companies + search queries)
2. **Level 1:** Navigates company careers pages (real-time)
3. **Level 2:** Queries ATS APIs (Greenhouse, Ashby, Lever, BambooHR, Teamtailor, Workday)
4. **Level 3:** WebSearch with `site:` filters (backup)
5. Filters by your `title_filter.positive` and `title_filter.negative`
6. Deduplicates against `scan-history.tsv` + existing tracker
7. Adds new offers to `data/pipeline.md` as pending items

**Modes loaded:** `_shared.md` + `scan.md`

**Output:** New offers added to pipeline

**How to customize:**
```yaml
# In portals.yml:

tracked_companies:
  - name: "OpenAI"
    careers_url: "https://openai.com/careers"
    enabled: true
  
  - name: "Anthropic"
    careers_url: "https://www.anthropic.com/careers"
    api:
      provider: "greenhouse"
      endpoint: "https://boards-api.greenhouse.io/v1/boards/anthropic/jobs"

title_filter:
  positive:
    - "AI"
    - "ML"
    - "LLM"
  negative:
    - "Intern"
    - ".NET"
```

**Use when:**
- You want to discover new offers automatically
- You want a weekly/daily check on tracked companies
- You want to build your `data/pipeline.md` inbox

---

#### `/career-ops-batch` — Batch Evaluate Many JDs

**Purpose:** Evaluate 10-50 JDs in parallel (faster than one-by-one)

```bash
# Mode A: Conductor (navigates portal in real-time)
gemini /career-ops-batch --mode conductor --url "https://jobs.ashbyhq.com"
# → Opens portal, extracts all JDs, evaluates in parallel

# Mode B: Standalone (URLs already collected)
gemini /career-ops-batch --file batch-input.tsv
# → Processes pre-collected URLs
```

**What it does:**
1. Reads batch configuration (URLs or portal)
2. Dispatches workers in parallel (default: 3 parallel workers)
3. Each worker evaluates a JD independently
4. Saves report + PDF per job
5. Tracks state in `batch-state.tsv` (resumable)
6. Merges all results into `data/applications.md`

**Output:** Fast batch evaluation + tracker updates + detailed logs

**Advanced usage:**
```bash
# Retry only failed jobs
gemini /career-ops-batch --retry-failed

# Start from job ID 42 (skip first 41)
gemini /career-ops-batch --start-from 42

# Use 5 parallel workers (faster, higher CPU)
gemini /career-ops-batch --parallel 5

# Dry run: see what would be processed
gemini /career-ops-batch --dry-run
```

**Use when:**
- You want to evaluate 10+ offers quickly
- You're processing a portal full of offers
- You want parallelization (faster than pipeline mode)

---

#### `/career-ops-pdf` — Generate ATS-Optimized CV

**Purpose:** Create a personalized, ATS-compliant PDF for a specific offer

```bash
gemini /career-ops-pdf "Senior AI Engineer at OpenAI..."
# OR
gemini /career-ops-pdf https://jobs.openai.com/api/...

# Output:
# ✅ Generated: output/cv-rudra-modi-openai-2026-05-05.pdf
# Keywords matched: 18/20 (90%)
# Pages: 2
```

**What it does:**
1. Reads your `cv.md` (canonical source)
2. Extracts 15-20 keywords from the JD
3. Personalizes Professional Summary (adds keywords naturally)
4. Reorders experience bullets by relevance
5. Builds competency grid from JD requirements
6. Generates HTML from template
7. Renders PDF with Playwright
8. Validates ATS compliance (single column, standard fonts, selectable text)

**Modes loaded:** `_shared.md` + `pdf.md`

**Output:** `output/cv-{name}-{company}-{date}.pdf`

**PDF design:**
- Single-column layout (ATS-friendly)
- Headers: Space Grotesk 24px (name) + 13px (sections)
- Body: DM Sans 11px
- Keywords naturally distributed in summary + first bullet + skills
- 0.6" margins
- US Letter or A4 (based on job location)

**Use when:**
- You're about to apply to a role (include PDF with application)
- You want to tailor CV to specific job
- You want an ATS-compliant version (vs visual design)

---

#### `/career-ops-apply` — Fill Application Forms

**Purpose:** Draft application form answers for you to review

```bash
gemini /career-ops-apply https://jobs.example.com/apply
# → Extracts form questions, drafts answers, waits for your review
```

**What it does:**
1. Navigates to application form (Playwright)
2. Reads all form fields
3. For each question, generates 2-4 sentence answer using:
   - Your CV (proof points)
   - Your profile (targets, narrative)
   - The JD (requirements)
4. Saves draft to report section `## H) Draft Application Answers`
5. Shows you the draft in the terminal
6. **STOPS** before submitting (you click Submit manually)

**Modes loaded:** `_shared.md` + `apply.md`

**Example output:**
```markdown
### Why are you interested in this role?

Your system for agentic AI engineering maps directly to where I want to apply my experience. I've built production multi-agent systems with Logicore — your need for that specific blend of execution + architecture is exactly what I'm looking for.

[Approved by you? Then copy-paste into form and click Submit]
```

**Use when:**
- You've decided to apply to a role
- You want intelligent, customized application answers
- You want to save time on the writing while reviewing quality

---

#### `/career-ops-tracker` — Application Status Dashboard

**Purpose:** Quick view of all applications and their status

```bash
gemini /career-ops-tracker

# Output:
# Total: 47
# Evaluated: 12
# Applied: 28
# Responded: 5
# Interview: 2
# Offer: 1
# Rejected: 3
# Funnel chart + detailed table
```

**What it does:**
1. Reads `data/applications.md`
2. Groups by status
3. Shows metrics:
   - Total applications
   - Funnel (evaluated → applied → interview → offer)
   - Conversion rates
   - Average score per status
4. Sorts by most recent
5. Highlights pending actions

**Modes loaded:** `tracker.md`

**Output:** Status dashboard + table

**Use when:**
- You want a quick overview of your pipeline
- You want to see conversion rates
- You want to identify bottlenecks (e.g., low offer rate)

---

#### `/career-ops-deep` — Company Research

**Purpose:** Deep dive research on a company

```bash
gemini /career-ops-deep "OpenAI"
gemini /career-ops-deep "https://openai.com"

# Output:
# Company: OpenAI
# Funding: $157B (Series D)
# Headcount: 1,800+
# Culture: Fast-moving, research-driven, product-focused
# Compensation: Top quartile, stock options + bonus
# Hiring: Aggressive growth in AI/ML (2024-2025)
# Concerns: Competition from Anthropic, scaling challenges
# LinkedIn: https://linkedin.com/company/openai
```

**What it does:**
1. WebSearch for company info (funding, headcount, market position)
2. LinkedIn research (hiring trends, employee reviews)
3. Job posting analysis (how many open roles, types, patterns)
4. Competitive landscape (similar companies hiring)
5. Culture signals (glassdoor reviews, Blind posts)
6. Investment signals (recent funding, strategic direction)

**Modes loaded:** `deep.md`

**Output:** Company research report

**Use when:**
- Before evaluating a role at unfamiliar company
- You're deciding between two companies
- You want to understand company trajectory

---

#### `/career-ops-contact` — LinkedIn Outreach

**Purpose:** Find decision-makers and draft outreach

```bash
gemini /career-ops-contact \
  --company "OpenAI" \
  --role "Senior AI Engineer" \
  --name "Jane Smith"

# Output:
# Found: Jane Smith, Hiring Manager @ OpenAI
# LinkedIn: https://linkedin.com/in/janesmith
# 
# Draft message:
# "Hi Jane — I came across your Senior AI Engineer role...
```

**What it does:**
1. WebSearch for hiring manager/recruiter at company
2. Finds LinkedIn profile
3. Analyzes recent posts (signals interest)
4. Drafts outreach message:
   - Personalized (references their recent work)
   - Confident ("I'm choosing you")
   - Specific (references JD details)
5. Provides fallback if exact person not found

**Modes loaded:** `contacto.md`

**Output:** Contact info + draft LinkedIn message

**Use when:**
- You want to reach out directly (vs apply form)
- You want personalized outreach (higher response rate)
- You're targeting a specific hiring manager

---

#### `/career-ops-interview-prep` — Interview Preparation

**Purpose:** Prepare for a specific company interview

```bash
gemini /career-ops-interview-prep \
  --company "OpenAI" \
  --role "Senior AI Engineer"

# Output:
# Company research (culture, tech stack, recent news)
# Likely interview questions (technical + behavioral)
# Your STAR stories mapped to role requirements
# Red-flag questions and how to answer
# Negotiation talking points
```

**What it does:**
1. Deep research on company (using `/career-ops-deep` logic)
2. Reads your story bank (`interview-prep/story-bank.md`)
3. Maps your STAR stories to role requirements
4. Generates likely interview questions
5. Prepares answers for red-flag questions
6. Provides comp/negotiation talking points
7. Saves to `interview-prep/{company}-{role}.md`

**Modes loaded:** `interview-prep.md`

**Output:** Interview prep guide + story mapping

**Use when:**
- You have an interview scheduled
- You want to refresh on company-specific talking points
- You want to practice your STAR stories

---

#### `/career-ops-project` — Evaluate Portfolio Project

**Purpose:** Assess if a project idea strengthens your candidacy

```bash
gemini /career-ops-project \
  --idea "Build a fine-tuned LLM using customer feedback" \
  --target-role "LLM Engineer"

# Output:
# Project fit: 4.2/5
# Strengths: Shows fine-tuning expertise, real-world feedback loop
# Gaps: Doesn't demo deployment/inference optimization
# Recommendation: Great project for LLM roles, slight boost for AI/ML platform roles
# Time to execute: 2-3 weeks
# Showcase strategy: GitHub + blog post on learnings
```

**What it does:**
1. Reads your target roles (from `_profile.md`)
2. Evaluates project idea against those roles
3. Scores on:
   - Relevance to target archetype
   - Proof of technical depth
   - Feasibility (time/scope)
   - Showcase value (GitHub, blog, talk potential)
4. Recommends execution or pivot

**Modes loaded:** `project.md`

**Output:** Project evaluation + execution recommendation

**Use when:**
- You're deciding on portfolio projects
- You want to maximize project value for job search
- You want to validate project scope before starting

---

#### `/career-ops-training` — Evaluate Course/Cert

**Purpose:** Assess if a course strengthens your candidacy

```bash
gemini /career-ops-training \
  --course "DeepLearning.AI: LLMs and Transformers" \
  --provider "Coursera"

# Output:
# Course fit: 3.8/5
# Strengths: Comprehensive transformer knowledge, from-scratch implementation
# Gaps: Doesn't cover production deployment or evals
# Recommendation: Good foundational course, good for junior→mid-level jump
# Time investment: 40 hours
# Value for roles: LLM Engineer (4.0), ML Engineer (3.5), AI PM (2.5)
```

**What it does:**
1. Researches course (content, difficulty, instructor reputation)
2. Maps against your target roles
3. Scores on:
   - Relevance to archetype
   - Time investment vs payoff
   - Signaling value (on resume vs interview)
   - Skill gap closure
4. Recommends or suggests alternatives

**Modes loaded:** `training.md`

**Output:** Training evaluation + recommendation

**Use when:**
- You're considering taking a course
- You want to validate if time investment pays off for your career
- You have multiple course options and want to rank

---

#### `/career-ops-patterns` — Analyze Rejection Patterns

**Purpose:** Find what's working and what's wasting your time

```bash
gemini /career-ops-patterns

# Output:
# Total entries: 47
# Applied: 28 | Responded: 5 (18% response rate)
# Offers: 1 | Conversion: 3.6%
#
# What's working:
#   → AI Engineer roles (conversion 8.2%)
#   → Remote roles (conversion 5.1%)
#   → Startups 50-200 people (conversion 7.0%)
#
# What's wasting time:
#   → Enterprise on-site roles (0% response, 5 apps)
#   → Java/C++ stack roles (0% response, 3 apps)
#   → Roles requiring 5+ years direct LLM experience (2% response)
#
# Recommendations:
#   1. Stop applying to enterprise on-site roles (double constraint)
#   2. Add "Remote LLM Engineer" to portals.yml title_filter
#   3. Update CV summary to lead with production deployment experience
#   4. Consider deepening expertise in one archetype (vs generalist)
```

**What it does:**
1. Runs `node analyze-patterns.mjs`
2. Analyzes:
   - Funnel metrics (evaluated → applied → interviewed → offer)
   - Conversion rates by archetype
   - Conversion rates by remote policy
   - Conversion rates by company size
   - Tech stack match rates
   - Score vs outcome correlation
3. Identifies blockers (geo-restriction, stack mismatch, seniority)
4. Generates 5 actionable recommendations
5. Saves to `reports/pattern-analysis-{date}.json`

**Modes loaded:** `patterns.md` (+ output from `analyze-patterns.mjs`)

**Output:** Pattern analysis + ranked recommendations

**Minimum threshold:** Requires 5+ applications beyond "Evaluated" status

**Use when:**
- You have 20+ applications tracked
- You want to understand why some converts and some don't
- You want to optimize your search (what to keep, what to stop)

---

#### `/career-ops-followup` — Follow-Up Cadence

**Purpose:** Calculate optimal timing and frequency for follow-ups

```bash
gemini /career-ops-followup

# Output:
# Rules:
# - No contact → send first follow-up at day 14
# - 1 contact → send second follow-up at day 28
# - 2+ contacts → stop, assume not interested
# - Interview scheduled → no follow-up until after
#
# Current pending follow-ups:
# [ ] OpenAI / Senior AI Engineer (applied 2026-04-15, today 2026-05-05)
#     → 20 days elapsed → SEND FOLLOW-UP NOW
#
# [ ] Anthropic / ML Engineer (applied 2026-04-28)
#     → 7 days elapsed → follow up in 7 more days
#
# Tips:
# - Mention specific conversation detail
# - Ask if you can help clarify anything
# - Offer to chat on call if helpful
```

**What it does:**
1. Reads `data/applications.md` + `data/follow-ups.md`
2. Runs `node followup-cadence.mjs`
3. Calculates:
   - Days since application
   - Follow-up count
   - Days until next follow-up
4. Identifies overdue follow-ups
5. Shows follow-up history
6. Provides email templates

**Modes loaded:** `followup.md`

**Output:** Follow-up schedule + email templates

**Use when:**
- You want to stay top-of-mind without being pushy
- You want to know when and what to follow up with
- You're tracking multiple applications over time

---

## Command Execution Flow

### Example: User Runs `/career-ops-evaluate`

```
┌─ User Input ─────────────────────────────────────────────────────┐
│  gemini /career-ops-evaluate                                     │
│  "Senior AI Engineer at OpenAI. Responsibilities: Build LLMOps..." │
└──────────────────────────────────────────────────┬────────────────┘
                                                   │
                    ┌──────────────────────────────▼──────────────────────────────┐
                    │ Gemini CLI loads: .gemini/commands/career-ops-evaluate.toml │
                    │                                                             │
                    │ prompt = """                                              │
                    │ You are career-ops in oferta (evaluation) mode.           │
                    │                                                             │
                    │ Load evaluation context:                                   │
                    │ - Read file: modes/_shared.md                            │
                    │ - Read file: modes/oferta.md                            │
                    │ - Read file: cv.md                                       │
                    │ - Read file (if exists): modes/_profile.md               │
                    │ - Read file (if exists): article-digest.md               │
                    │                                                             │
                    │ Then execute the full A-G evaluation...                   │
                    │ """                                                        │
                    └──────────────────────────────┬───────────────────────────────┘
                                                   │
                    ┌──────────────────────────────▼───────────────────────────────┐
                    │ Gemini Agent Executes:                                      │
                    │                                                             │
                    │ 1. Parse modes/_shared.md                                 │
                    │    ├─ Scoring system (6 dimensions)                      │
                    │    ├─ Archetype detection (6 types)                      │
                    │    ├─ Block G legitimacy rules                           │
                    │    └─ Global rules (ethical gates, etc.)                 │
                    │                                                             │
                    │ 2. Parse modes/oferta.md                                 │
                    │    ├─ Paso 0: Detect archetype in JD                    │
                    │    ├─ Bloque A: Role summary                            │
                    │    ├─ Bloque B: CV match + gaps + mitigation            │
                    │    ├─ Bloque C: Seniority + positioning strategy        │
                    │    ├─ Bloque D: Comp + demand                           │
                    │    ├─ Bloque E: CV personalization plan                 │
                    │    ├─ Bloque F: Interview stories (STAR+R)              │
                    │    └─ Bloque G: Posting legitimacy                      │
                    │                                                             │
                    │ 3. Load your data                                         │
                    │    ├─ cv.md → skills, experience, projects               │
                    │    ├─ config/profile.yml → targets, comp, location       │
                    │    └─ modes/_profile.md → custom archetypes, narrative   │
                    │                                                             │
                    │ 4. Evaluate JD against your context                       │
                    │    ├─ Extract keywords                                   │
                    │    ├─ Match vs CV skills                                │
                    │    ├─ Score on 6 dimensions                             │
                    │    ├─ Assess posting legitimacy                         │
                    │    └─ Generate A-G blocks                               │
                    │                                                             │
                    │ 5. Calculate global score                                │
                    │    └─ Weighted average (4.2/5 = "Apply")                │
                    │                                                             │
                    │ 6. Save report                                           │
                    │    └─ reports/001-openai-senior-ai-2026-05-05.md        │
                    │                                                             │
                    │ 7. Register in tracker                                   │
                    │    └─ data/applications.md (new row)                     │
                    └──────────────────────────────┬───────────────────────────────┘
                                                   │
         ┌─────────────────────────────────────────▼─────────────────────────────┐
         │ Gemini Returns to Terminal:                                          │
         │                                                                       │
         │ ╔═══════════════════════════════════════════════════════════════╗  │
         │ ║                     EVALUATION REPORT                         ║  │
         │ ║═══════════════════════════════════════════════════════════════║  │
         │ ║                                                               ║  │
         │ ║ Bloque A: OpenAI | AI | LLMOps | Senior | Remote | 8 people ║  │
         │ ║ Bloque B: Match 4.5/5 | Gaps: (none critical)              ║  │
         │ ║ Bloque C: Level Match ✓ | Positioning: Lead w/ production  ║  │
         │ ║ Bloque D: Comp $500K | Glassdoor avg $480K | 4.2/5         ║  │
         │ ║ Bloque E: 5 CV changes, 5 LinkedIn changes                 ║  │
         │ ║ Bloque F: 8 STAR stories, case study: Logicore             ║  │
         │ ║ Bloque G: High Confidence (posting age 5d, apply active)   ║  │
         │ ║                                                               ║  │
         │ ║ GLOBAL SCORE: 4.3/5 ✅ RECOMMEND APPLYING                   ║  │
         │ ║ Report: reports/001-openai-senior-ai-2026-05-05.md         ║  │
         │ ║═══════════════════════════════════════════════════════════════║  │
         │ └─────────────────────────────────────────────────────────────────┘
         │
         │ Files created/updated:
         │ ✅ reports/001-openai-senior-ai-2026-05-05.md (4KB)
         │ ✅ data/applications.md (1 new row)
         └────────────────────────────────────────────────────────────────
```

---

## How Gemini Commands Load Context

### The "Modes" Loading Pattern

Every Gemini command follows this pattern:

```
Command file (.gemini/commands/something.toml)
│
└─ prompt: "Load these modes and execute..."
   │
   ├─ Read: modes/_shared.md (system context)
   ├─ Read: modes/{specific}.md (workflow instructions)
   ├─ Read: cv.md (canonical resume)
   ├─ Read: config/profile.yml (your identity)
   ├─ Read: modes/_profile.md (your customizations)
   ├─ Read: article-digest.md (if exists)
   │
   └─ Execute: [specific workflow as defined in modes file]
```

### Why Modes Matter

Modes are **instructions for the AI**. They describe HOW to:
- Evaluate an offer (modes/oferta.md)
- Generate a CV (modes/pdf.md)
- Process URLs (modes/pipeline.md)
- Scan portals (modes/scan.md)

When you edit a mode, you're changing the behavior of ALL commands that use that mode.

**Examples:**
- Edit `modes/oferta.md` → next `/career-ops-evaluate` uses new logic
- Edit `modes/_shared.md` → affects all evaluations system-wide
- Edit `modes/_profile.md` → affects your personalization system-wide

### Loading Order (Important)

When the system reads files, it uses this order:

```
1. modes/_shared.md       ← Global system rules (auto-updated)
2. modes/{specific}.md    ← Workflow rules (auto-updated)
3. cv.md                  ← Your resume (never auto-updated)
4. config/profile.yml     ← Your identity (never auto-updated)
5. modes/_profile.md      ← Your customizations (NEVER auto-updated)
6. article-digest.md      ← Your proof points (optional, never auto-updated)
```

**Key:** Your files are read AFTER system files, so your customizations win. If system says "use archetype X" but `_profile.md` says "I'm archetype Y", your version applies.

---

## Practical Workflows

### Workflow 1: Find & Evaluate Offers (Scanning + Pipeline)

```bash
# Step 1: Scan for new offers
gemini /career-ops-scan
# Output: 52 new offers added to data/pipeline.md

# Step 2: Review the pipeline manually
cat data/pipeline.md
# See: 52 pending items

# Step 3: Evaluate them all at once
gemini /career-ops-pipeline
# Output: 52 evaluated + registered + PDFs generated (in parallel if agents available)

# Step 4: Check your tracker
gemini /career-ops-tracker
# Output: Funnel, conversion rates, next steps
```

**Time:** 5-10 min total (vs 2+ hours if manual)

---

### Workflow 2: Get an Offer, Make Decision

```bash
# Step 1: Evaluate multiple offers
gemini /career-ops-evaluate "Offer 1 JD..."
gemini /career-ops-evaluate "Offer 2 JD..."
gemini /career-ops-evaluate "Offer 3 JD..."

# Step 2: Compare side-by-side
gemini /career-ops-compare \
  "Offer 1 JD..." \
  "Offer 2 JD..." \
  "Offer 3 JD..."

# Output: Ranked comparison + trade-off analysis
```

**Time:** 10-15 min to decide between offers with full context

---

### Workflow 3: Deep Dive into Company Before Interview

```bash
# Step 1: Company research
gemini /career-ops-deep "Company Name"
# Output: Funding, culture, hiring trends, recent news

# Step 2: Interview prep
gemini /career-ops-interview-prep \
  --company "Company Name" \
  --role "Role Title"

# Output: Likely questions + your STAR stories mapped to role

# Step 3: Negotiation points
# (included in interview prep output)
```

**Time:** 30 min prep, very thorough

---

### Workflow 4: Optimize Your CV for a Role

```bash
# Step 1: Generate tailored PDF
gemini /career-ops-pdf "Senior AI Engineer at Company..."
# Output: cv-rudra-modi-company-2026-05-05.pdf

# Step 2: Review PDF in application form
# (verify it matches what you're about to apply to)

# Step 3: Apply with PDF attached
# (user submits form manually)

# Step 4: Track in applications.md
```

**Time:** 5 min to generate PDF, 10 min to apply

---

### Workflow 5: Understand Why You're Not Getting Offers

```bash
# Step 1: Analyze patterns
gemini /career-ops-patterns

# Output:
# - Conversion rate is 2% (low)
# - Remote roles convert at 8%, on-site at 0%
# - Recommendation: Focus on remote, add Remote keyword to filter

# Step 2: Update portals config
# Edit portals.yml: add "Remote" to title_filter.positive
# Edit portals.yml: remove on-site companies from tracked_companies

# Step 3: Rescan
gemini /career-ops-scan
```

**Time:** 20 min analysis + optimization

---

## Troubleshooting & Tips

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `No such file: cv.md` | Create `cv.md` first: `gemini /career-ops` (guides you) |
| `Error extracting JD from URL` | Paste JD text instead: `gemini /career-ops "Full JD text..."` |
| `PDF generation failed` | Check if `cv.md` has all required sections (Summary, Experience, etc.) |
| `Tracker deduplication failed` | Run `node dedup-tracker.mjs` to clean up |
| `Pipeline URL didn't process` | Check `data/pipeline.md` format (must be valid markdown) |
| `Score seems low (below 4.0)` | This is intentional (ethical gate). Use `/career-ops-deep` to research company. |
| `Can't find company in WebSearch` | Use `/career-ops-contact` to find recruiters directly |

### Tips & Tricks

**Tip 1: Customize Your Archetypes**

Edit `modes/_profile.md`:
```markdown
## Your Target Roles

| Archetype | Thematic axes | What they buy |
|-----------|---------------|---------------|
| **AI Engineer** | Production systems, LLMs | Practical deployment + algorithms |
| **Research Engineer** | Fundamentals, papers, novel methods | Deep technical innovation |
```

This changes how every evaluation frames your experience.

**Tip 2: Speed Up Scanning**

Add more companies to `portals.yml`:

```yaml
tracked_companies:
  - name: "Company A"
    careers_url: "https://..."
    enabled: true
  - name: "Company B"
    careers_url: "https://..."
    enabled: true
  # Add 10-20 companies you want to track
```

Now `/career-ops-scan` checks all of them automatically.

**Tip 3: Batch Process Without Waiting**

Use background mode:

```bash
# Evaluate 50 JDs in background (you can do other work)
gemini /career-ops-batch --parallel 5 &
# Check status anytime: tail batch/logs/latest.log
```

**Tip 4: Use Follow-Up Reminder**

Set up a cron job to remind you:

```bash
# Every Monday at 9am, check follow-ups
0 9 * * 1 gemini /career-ops-followup >> /tmp/followup-reminder.txt
```

**Tip 5: Export Tracker for Analysis**

Convert markdown to CSV for spreadsheet analysis:

```bash
# (Manual for now, but you can write a small script)
# Copy data/applications.md → Excel → pivot on Score/Status
```

**Tip 6: Archive Old Reports**

Keep `reports/` clean:

```bash
# Archive reports older than 90 days
mkdir -p reports/archive
mv reports/*-2026-01-*.md reports/archive/
mv reports/*-2026-02-*.md reports/archive/
```

---

## See Also

- [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) — Full system design
- [SCRIPTS.md](SCRIPTS.md) — Utility script documentation
- [CUSTOMIZATION.md](CUSTOMIZATION.md) — How to customize for your career
- [SETUP.md](SETUP.md) — Installation & first-run guide
