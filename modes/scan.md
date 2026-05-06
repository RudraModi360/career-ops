# Mode: scan — Portal Scanner (Job Offer Discovery)

Scans configured job portals, filters by title relevance, and adds new job offers to the pipeline for later evaluation.

> **Note (v1.6+):** The default scanner (`scan.mjs` / `npm run scan`) is **zero-token** and directly queries the public APIs of Greenhouse, Ashby, Lever, and Indeed (RapidAPI). The Playwright/WebSearch levels described below are the **agent** workflow (executed by Claude/Codex), not what `scan.mjs` does. If a company doesn't have an API in these systems, `scan.mjs` will skip it; for those cases, the agent must manually complete Level 1 (Playwright) or Level 3 (WebSearch).

## Recommended execution

Run as a subagent to avoid consuming main context:

```
Agent(
    subagent_type="general-purpose",
    prompt="[contents of this file + specific data]",
    run_in_background=True
)
```

## Configuration

Read `portals.yml` which contains:
- `search_queries`: List of WebSearch queries with `site:` filters per portal (broad discovery)
- `tracked_companies`: Specific companies with `careers_url` for direct navigation
- `title_filter`: Keywords (positive/negative/seniority_boost) for title filtering

## Discovery strategy (3 levels)

### Level 1 — Direct Playwright (PRIMARY)

**For each company in `tracked_companies`:** Navigate to its `careers_url` with Playwright (`browser_navigate` + `browser_snapshot`), read ALL visible job listings, and extract title + URL from each. This is the most reliable method because:
- Sees the page in real-time (not cached Google results)
- Works with SPAs (Ashby, Lever, Workday)
- Detects new offers instantly
- Doesn't depend on Google indexation

**Each company MUST have `careers_url` in portals.yml.** If it doesn't, search for it once, save it, and use it in future scans.

### Level 2 — ATS APIs / Feeds (COMPLEMENTARY)

For companies with a public API or structured feed, use the JSON/XML response as a fast complement to Level 1. It's faster than Playwright and reduces visual scraping errors.

**Current support (variables in `{}`):**
- **Greenhouse**: `https://boards-api.greenhouse.io/v1/boards/{company}/jobs`
- **Ashby**: `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`
- **BambooHR**: list `https://{company}.bamboohr.com/careers/list`; detail `https://{company}.bamboohr.com/careers/{id}/detail`
- **Lever**: `https://api.lever.co/v0/postings/{company}?mode=json`
- **Teamtailor**: `https://{company}.teamtailor.com/jobs.rss`
- **Workday**: `https://{company}.{shard}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs`
- **Indeed (RapidAPI)**: `https://indeed12.p.rapidapi.com/jobs/search?query={query}&location={location}&page_id=1&locality=us`

**Parsing convention by provider:**
- `greenhouse`: `jobs[]` → `title`, `absolute_url`
- `ashby`: GraphQL `ApiJobBoardWithTeams` with `organizationHostedJobsPageName={company}` → `jobBoard.jobPostings[]` (`title`, `id`; build public URL if not in payload)
- `bamboohr`: list `result[]` → `jobOpeningName`, `id`; build detail URL `https://{company}.bamboohr.com/careers/{id}/detail`; to read full JD, GET the detail and use `result.jobOpening` (`jobOpeningName`, `description`, `datePosted`, `minimumExperience`, `compensation`, `jobOpeningShareUrl`)
- `lever`: root array `[]` → `text`, `hostedUrl` (fallback: `applyUrl`)
- `teamtailor`: RSS items → `title`, `link`
- `workday`: `jobPostings[]`/`jobPostings` (per tenant) → `title`, `externalPath` or URL built from host
- `indeed`: RapidAPI response `results[]` → `title`, `url`, `company`, `location`, `jobkey`

### Level 3 — WebSearch queries (BROAD DISCOVERY)

The `search_queries` with `site:` filters cover portals transversely (all Ashby, all Greenhouse, etc.). Useful for discovering NEW companies not yet in `tracked_companies`, but results may be stale.

**Execution priority:**
1. Level 1: Playwright → all `tracked_companies` with `careers_url`
2. Level 2: API → all `tracked_companies` with `api:`
3. Level 3: WebSearch → all `search_queries` with `enabled: true`

Levels are additive — all execute, results are mixed and deduplicated.

## Workflow

1. **Read configuration**: `portals.yml`
2. **Read history**: `data/scan-history.tsv` → URLs already seen
3. **Read dedup sources**: `data/applications.md` + `data/pipeline.md`

4. **Level 1 — Playwright scan** (parallel in batches of 3-5):
   For each company in `tracked_companies` with `enabled: true` and `careers_url` defined:
   a. `browser_navigate` to the `careers_url`
   b. `browser_snapshot` to read all job listings
   c. If the page has filters/departments, navigate relevant sections
   d. For each job listing extract: `{title, url, company}`
   e. If the page paginates results, navigate additional pages
   f. Accumulate into candidate list
   g. If `careers_url` fails (404, redirect), attempt `scan_query` as fallback and note for URL update

5. **Level 2 — ATS APIs / feeds** (parallel):
   For each company in `tracked_companies` with `api:` defined and `enabled: true`:
   a. WebFetch the API/feed URL
   b. If `api_provider` is defined, use its parser; if not, infer by domain (`boards-api.greenhouse.io`, `jobs.ashbyhq.com`, `api.lever.co`, `*.bamboohr.com`, `*.teamtailor.com`, `*.myworkdayjobs.com`)
   c. For **Ashby**, send POST with:
      - `operationName: ApiJobBoardWithTeams`
      - `variables.organizationHostedJobsPageName: {company}`
      - GraphQL query for `jobBoardWithTeams` + `jobPostings { id title locationName employmentType compensationTierSummary }`
   d. For **BambooHR**, the list only returns basic metadata. For each relevant item, read `id`, GET `https://{company}.bamboohr.com/careers/{id}/detail`, and extract full JD from `result.jobOpening`. Use `jobOpeningShareUrl` as public URL if available; otherwise use the detail URL.
   e. For **Workday**, send POST JSON with at least `{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}` and paginate by `offset` until exhausted
   f. For each job extract and normalize: `{title, url, company}`
   g. Accumulate into candidate list (dedup with Level 1)

6. **Level 3 — WebSearch queries** (parallel if possible):
   For each query in `search_queries` with `enabled: true`:
   a. Execute WebSearch with the defined `query`
   b. From each result extract: `{title, url, company}`
      - **title**: from result title (before " @ " or " | ")
      - **url**: URL from result
      - **company**: after " @ " in title, or extract from domain/path
   c. Accumulate into candidate list (dedup with Level 1+2)

6. **Filter by title** using `title_filter` from `portals.yml`:
   - At least 1 keyword from `positive` must appear in title (case-insensitive)
   - 0 keywords from `negative` must appear
   - `seniority_boost` keywords give priority but are not mandatory

7. **Deduplicate** against 3 sources:
   - `scan-history.tsv` → exact URL already seen
   - `applications.md` → company + normalized role already evaluated
   - `pipeline.md` → exact URL already in pending or processed

7.5. **Verify liveness of WebSearch results (Level 3)** — BEFORE adding to pipeline:

   WebSearch results can be stale (Google caches results for weeks or months). To avoid evaluating expired offers, verify with Playwright each new URL from Level 3. Levels 1 and 2 are inherently real-time and don't require this verification.

   For each new Level 3 URL (sequential — NEVER parallel Playwright):
   a. `browser_navigate` to the URL
   b. `browser_snapshot` to read content
   c. Classify:
      - **Active**: job title visible + role description + visible Apply/Submit/Apply button in main content. Don't count generic header/navbar/footer text.
      - **Expired** (any of these signals):
        - Final URL contains `?error=true` (Greenhouse redirects here when offer is closed)
        - Page contains: "job no longer available" / "no longer open" / "position has been filled" / "this job has expired" / "page not found"
        - Only navbar and footer visible, no JD content (content < ~300 chars)
   d. If expired: record in `scan-history.tsv` with status `skipped_expired` and discard
   e. If active: proceed to step 8

   **Don't interrupt entire scan if a URL fails.** If `browser_navigate` errors (timeout, 403, etc.), mark as `skipped_expired` and continue with next.

8. **For each new verified offer that passes filters**:
   a. Add to `pipeline.md` section "Pending": `- [ ] {url} | {company} | {title}`
   b. Record in `scan-history.tsv`: `{url}\t{date}\t{query_name}\t{title}\t{company}\tadded`

9. **Offers filtered by title**: record in `scan-history.tsv` with status `skipped_title`
10. **Duplicate offers**: record with status `skipped_dup`
11. **Expired offers (Level 3)**: record with status `skipped_expired`

## Managing careers_url

WebSearch results come in format: `"Job Title @ Company"` or `"Job Title | Company"` or `"Job Title — Company"`.

Extraction patterns by portal:
- **Ashby**: `"Senior AI PM (Remote) @ EverAI"` → title: `Senior AI PM`, company: `EverAI`
- **Greenhouse**: `"AI Engineer at Anthropic"` → title: `AI Engineer`, company: `Anthropic`
- **Lever**: `"Product Manager - AI @ Temporal"` → title: `Product Manager - AI`, company: `Temporal`

Generic regex: `(.+?)(?:\s*[@|—–-]\s*|\s+at\s+)(.+?)$`

## Private URLs

If a non-publicly accessible URL is found:
1. Save the JD in `jds/{company}-{role-slug}.md`
2. Add to pipeline.md as: `- [ ] local:jds/{company}-{role-slug}.md | {company} | {title}`

## Scan History

`data/scan-history.tsv` tracks ALL URLs seen:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby — AI PM	PM AI	Acme	added
https://...	2026-02-10	Greenhouse — SA	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	Ashby — AI PM	SA AI	OldCo	skipped_dup
https://...	2026-02-10	WebSearch — AI PM	PM AI	ClosedCo	skipped_expired
```

## Output summary

```
Portal Scan — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Queries executed: N
Offers found: N total
Filtered by title: N relevant
Duplicates: N (already evaluated or in pipeline)
Expired discarded: N (dead links, Level 3)
New added to pipeline.md: N

  + {company} | {title} | {query_name}
  ...

→ Run /career-ops pipeline to evaluate the new offers.
```

## Indeed (RapidAPI) Integration

**Setup:**
1. Get a free RapidAPI account: https://rapidapi.com
2. Subscribe to "Indeed12" API (free tier available): https://rapidapi.com/laimoon/api/indeed12
3. Copy your RapidAPI Key and Host from the API dashboard
4. Add to `portals.yml`:
   ```yaml
   rapidapi:
     host: "indeed12.p.rapidapi.com"
     key: "YOUR_RAPIDAPI_KEY_HERE"
   ```

**Configuration in portals.yml:**

For each Indeed search, add to `tracked_companies`:

```yaml
  - name: "Indeed AI Jobs — India"
    api: "indeed"
    indeed_query: "AI Engineer OR Machine Learning Engineer"
    indeed_location: "India"
    notes: "Broad AI job search across India"
    enabled: true
```

**Query parameters:**
- `indeed_query` (required): Search query (supports OR, AND operators)
  - Example: `"AI Engineer OR ML Engineer"`, `"Fresher AI"`, `"Graduate Trainee ML"`
- `indeed_location` (optional, default: "us"): Location filter
  - Example: `"Bangalore, India"`, `"Remote"`, `"San Francisco, CA"`

**API endpoints used:**
- **Job Search**: `https://indeed12.p.rapidapi.com/jobs/search`
  - Parameters: `query`, `location`, `page_id`, `locality`, `fromage` (days old), `radius`, `sort`, `job_type`
  - Returns: `results[]` with jobs matching criteria

- **Job Details** (optional, for enhanced info):
  - URL: `https://indeed12.p.rapidapi.com/job/{job_id}`
  - Currently not fetched during scan but available for post-scan enrichment

- **Company Info** (optional):
  - URL: `https://indeed12.p.rapidapi.com/company/{company_name}`
  - Could be used to enrich company data

**Limitations & Notes:**
- RapidAPI has rate limits on free tier (check your subscription)
- Results are cached; real-time data may lag by hours
- Indeed URLs generated from search results are best-effort (may need verification)
- Pagination: scan fetches `page_id=1` by default (first page of results, ~15-25 jobs)
- No login required (Unlike LinkedIn, Glassdoor searches)

## Managing careers_url

Each company in `tracked_companies` must have `careers_url` — the direct URL to its job postings page. This avoids searching for it each time.

**RULE: Always use the company's corporate URL; resort to ATS endpoint only if no corporate page exists.**

The `careers_url` should point to the company's own job page whenever available. Many companies use Workday, Greenhouse, or Lever underneath, but expose job IDs only through their corporate domain. Using the direct ATS URL when a corporate page exists can cause false 410 errors because job IDs don't match.

| ✅ Correct (corporate) | ❌ Incorrect as first option (direct ATS) |
|---|---|
| `https://careers.mastercard.com` | `https://mastercard.wd1.myworkdayjobs.com` |
| `https://openai.com/careers` | `https://job-boards.greenhouse.io/openai` |
| `https://stripe.com/jobs` | `https://jobs.lever.co/stripe` |

Fallback: if you only have the direct ATS URL, navigate to the company website first and locate its corporate job page. Use the direct ATS URL only if the company has no corporate page.

**Known patterns by platform:**
- **Ashby:** `https://jobs.ashbyhq.com/{slug}`
- **Greenhouse:** `https://job-boards.greenhouse.io/{slug}` or `https://job-boards.eu.greenhouse.io/{slug}`
- **Lever:** `https://jobs.lever.co/{slug}`
- **BambooHR:** list `https://{company}.bamboohr.com/careers/list`; detail `https://{company}.bamboohr.com/careers/{id}/detail`
- **Teamtailor:** `https://{company}.teamtailor.com/jobs`
- **Workday:** `https://{company}.{shard}.myworkdayjobs.com/{site}`
- **Custom:** The company's own URL (e.g., `https://openai.com/careers`)

**API/feed patterns by platform:**
- **Ashby API:** `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`
- **BambooHR API:** list `https://{company}.bamboohr.com/careers/list`; detail `https://{company}.bamboohr.com/careers/{id}/detail` (`result.jobOpening`)
- **Lever API:** `https://api.lever.co/v0/postings/{company}?mode=json`
- **Teamtailor RSS:** `https://{company}.teamtailor.com/jobs.rss`
- **Workday API:** `https://{company}.{shard}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs`

**If `careers_url` doesn't exist** for a company:
1. Try the pattern for its known platform
2. If it fails, do a quick WebSearch: `"{company}" careers jobs`
3. Navigate with Playwright to verify it works
4. **Save the found URL in portals.yml** for future scans

**If `careers_url` returns 404 or redirect:**
1. Note in output summary
2. Try scan_query as fallback
3. Mark for manual update

## Maintaining portals.yml

- **ALWAYS save `careers_url`** when adding a new company
- Add new queries as you discover portals or interesting roles
- Disable queries with `enabled: false` if they generate too much noise
- Adjust filter keywords as your target roles evolve
- Add companies to `tracked_companies` when you want to follow them closely
- Verify `careers_url` periodically — companies change ATS platforms
