# Indeed Integration Setup Guide

**Date:** May 5, 2026  
**Career-Ops Version:** 1.6+  
**Status:** Indeed RapidAPI fully integrated

---

## Overview

Your career-ops system now supports **Indeed job searches** via the RapidAPI Indeed12 API. This allows you to:
- Search job postings across Indeed by keyword and location
- Automatically add matching offers to your pipeline
- Filter results by your custom title criteria
- Integrate Indeed alongside Greenhouse, Ashby, Lever, and other ATS platforms

---

## Setup (5 minutes)

### Step 1: Get RapidAPI Key

1. Go to https://rapidapi.com and sign up (free)
2. Search for "Indeed12" API: https://rapidapi.com/laimoon/api/indeed12
3. Click "Subscribe" (free tier available)
4. Go to your API dashboard and copy:
   - **X-RapidAPI-Host**: `indeed12.p.rapidapi.com`
   - **X-RapidAPI-Key**: Your unique key (keep private!)

### Step 2: Update portals.yml

Edit `portals.yml` and add your RapidAPI credentials at the top:

```yaml
# RapidAPI Configuration (for Indeed searches)
rapidapi:
  host: "indeed12.p.rapidapi.com"
  key: "YOUR_RAPIDAPI_KEY_HERE"  # ← Replace with your key
```

### Step 3: Configure Indeed Searches (Optional)

Add Indeed searches to your `tracked_companies` section in `portals.yml`:

```yaml
tracked_companies:
  # ... existing companies ...

  # Indeed searches
  - name: "Indeed AI Jobs — India"
    api: "indeed"
    indeed_query: "AI Engineer OR Machine Learning Engineer"
    indeed_location: "India"
    notes: "Broad AI job search across India"
    enabled: true

  - name: "Indeed Fresher Roles — Bangalore"
    api: "indeed"
    indeed_query: "Graduate Trainee AI OR Fresher ML OR Associate AI"
    indeed_location: "Bangalore, India"
    notes: "Entry-level AI roles in Bangalore"
    enabled: true
```

**That's it!** Now when you run the scanner, Indeed will be included.

---

## How It Works

### Architecture

```
gemini /career-ops-scan
  │
  ├─ Level 1: Playwright → careers pages (real-time)
  ├─ Level 2: APIs (Greenhouse, Ashby, Lever, Indeed RapidAPI)
  ├─ Level 3: WebSearch → broad discovery
  │
  └─ Results → filter by title → deduplicate → add to pipeline.md
```

### Indeed Endpoint

When you configure Indeed in `tracked_companies` with `api: "indeed"`:

```
https://indeed12.p.rapidapi.com/jobs/search?
  query={indeed_query}
  &location={indeed_location}
  &page_id=1
  &locality=us
```

**Headers:**
```
Content-Type: application/json
x-rapidapi-host: indeed12.p.rapidapi.com
x-rapidapi-key: YOUR_KEY
```

### Response Parsing

The Indeed API returns:

```json
{
  "results": [
    {
      "title": "Senior AI Engineer",
      "company": "Acme Corp",
      "location": "Bangalore",
      "url": "https://www.indeed.com/jobs?q=...",
      "jobkey": "abc123...",
      "postingdate": "2026-05-05",
      ...
    },
    ...
  ]
}
```

Your system parses this into:
- `title` → Job title
- `url` → Indeed posting link
- `company` → Company name
- `location` → Job location

All results are:
- **Filtered** by your `title_filter.positive` and `title_filter.negative` keywords
- **Deduplicated** against existing applications and pipeline
- **Added to** `data/pipeline.md` as pending items

---

## Running Your First Indeed Scan

```bash
# Scan all portals (including Indeed)
npm run scan

# Output will show:
# Scanning X companies via API
# - Greenhouse: 5 jobs found, 4 new
# - Ashby: 3 jobs found, 2 new
# - Indeed: 12 jobs found, 8 new
# - Lever: 2 jobs found, 1 new
# ...
# New offers added to data/pipeline.md

# Then evaluate them all:
gemini /career-ops-pipeline
```

---

## API Reference

### Supported Endpoints (in scan.mjs)

#### 1. Job Search (Currently Used)

```
GET https://indeed12.p.rapidapi.com/jobs/search?query={query}&location={location}&page_id=1&locality=us

Query Parameters:
  query        (string, required) — job title or keywords
  location     (string, optional) — city or region
  page_id      (int, optional) — pagination (default: 1)
  locality     (string, optional) — country code (default: us)
  fromage      (int, optional) — days old (e.g., 7 for last week)
  radius       (int, optional) — search radius in miles
  sort         (string, optional) — 'date' or 'relevance'
  job_type     (string, optional) — 'permanent', 'contract', 'temporary'

Response:
  results[]
    ├─ title
    ├─ company
    ├─ location
    ├─ url
    ├─ jobkey
    ├─ postingdate
    ├─ snippet
    └─ ...
```

#### 2. Job Details (Not Yet Used)

```
GET https://indeed12.p.rapidapi.com/job/{job_id}?locality=us

Returns: Full job posting details
  ├─ title
  ├─ company
  ├─ description (full JD)
  ├─ salary
  ├─ requirements
  ├─ benefits
  └─ ...

Possible Future Use:
  - Auto-fetch full JD for promising matches (score >= 4.0)
  - Extract detailed requirements
```

#### 3. Company Info (Not Yet Used)

```
GET https://indeed12.p.rapidapi.com/company/{company_name}?locality=us

Returns: Company profile
  ├─ name
  ├─ rating
  ├─ reviews_count
  ├─ description
  ├─ industry
  ├─ headquarters
  └─ ...

Possible Future Use:
  - Company research enrichment
  - Culture/rating signals for evaluation
```

#### 4. Company Jobs

```
GET https://indeed12.p.rapidapi.com/company/{company}/jobs?locality=us&start=1

Returns: All jobs at a specific company
  └─ results[] (same as job search)

Possible Use:
  - Monitor specific companies continuously
  - Instead of general search
```

---

## Customization

### Search Queries

Edit `portals.yml` to customize your Indeed searches:

```yaml
  - name: "Custom Search"
    api: "indeed"
    indeed_query: "AI OR ML OR LLM OR GenAI"  # Use OR/AND
    indeed_location: "Remote"                  # Any location
    notes: "Remote AI roles anywhere"
    enabled: true
```

**Query Tips:**
- Use `OR` to combine keywords: `"AI Engineer OR ML Engineer OR Data Scientist"`
- Use `AND` for required keywords: `"AI AND Python"`
- Quotes for exact phrases: `"Machine Learning Engineer"`
- Common patterns:
  - `"Fresher AI" OR "Graduate ML"` — Entry-level
  - `"Senior AI" OR "Staff ML"` — Senior roles
  - `"Remote AI" AND India` — Remote + India

**Location Tips:**
- City: `"Bangalore"`, `"San Francisco"`
- Region: `"California"`, `"India"`
- Country: `"United States"`, `"Canada"`
- Remote: `"Remote"`, `"Work from Home"`

---

## Rate Limits & Quotas

**Free Tier (Indeed12 on RapidAPI):**
- ~500 requests/month (varies by plan)
- Check your RapidAPI dashboard for current quota
- Each `npm run scan` = ~1-5 requests (depending on number of Indeed searches)

**Tips to Stay Within Quota:**
- Run scans once per day or weekly
- Disable low-value searches with `enabled: false`
- Limit number of Indeed `tracked_companies` entries
- Combine similar searches into one query using `OR`

**Check Quota:**
```bash
# Check your RapidAPI usage dashboard:
https://rapidapi.com/user/dashboard/billing
```

---

## Troubleshooting

### "Error: 401 Unauthorized"
**Cause:** Invalid RapidAPI key  
**Fix:** 
1. Go to https://rapidapi.com/user/dashboard/billing
2. Copy the correct X-RapidAPI-Key (not the host)
3. Update `portals.yml` with the correct key
4. Retry: `npm run scan --dry-run`

### "Error: 429 Too Many Requests"
**Cause:** Rate limit exceeded  
**Fix:**
1. Wait 24 hours for quota to reset
2. Upgrade RapidAPI plan
3. Reduce number of Indeed searches

### "No Indeed results found"
**Cause:** Query too specific or no matches in Indeed database  
**Fix:**
- Try broader keywords: `"AI Engineer"` instead of `"Senior AI Engineer ML Systems"`
- Check spelling
- Try different location
- Test query at Indeed.com directly

### "Missing RapidAPI config"
**Cause:** `rapidapi` section not in `portals.yml`  
**Fix:**
```yaml
# Add to top of portals.yml:
rapidapi:
  host: "indeed12.p.rapidapi.com"
  key: "YOUR_KEY_HERE"
```

---

## FAQ

**Q: Will this cost money?**  
A: No. The free RapidAPI tier includes 500 requests/month, which covers regular scanning.

**Q: Can I search specific companies on Indeed?**  
A: Yes, use the company name in `indeed_query`: `"Acme Corp AI Engineer"`

**Q: How do I monitor a specific company?**  
A: Create an Indeed entry:
```yaml
  - name: "Company X — Indeed"
    api: "indeed"
    indeed_query: "Company X"
    enabled: true
```

**Q: Can I fetch full job descriptions from Indeed?**  
A: The Job Details endpoint exists but isn't auto-used yet. Future enhancement: auto-fetch full JD for promising candidates.

**Q: How often should I scan?**  
A: Once per day or 2-3 times per week. More frequent = better coverage, faster quota burn.

**Q: Can I filter by salary?**  
A: Not yet. The Indeed API doesn't expose salary filtering in the free tier. Manual filtering in pipeline after scan.

---

## What's Changed in scan.mjs

**New features added (v1.6+):**
- Indeed API detection and parsing
- RapidAPI authentication headers
- `indeed_query` and `indeed_location` configuration
- Error handling for Indeed API failures
- Integrated into existing parallel fetch logic

**Backward compatible:**
- All existing Greenhouse, Ashby, Lever queries unchanged
- Old `portals.yml` still works (Just add `rapidapi` section)
- No breaking changes to other scanning modes

---

## Next Steps

1. ✅ Add RapidAPI credentials to `portals.yml`
2. ✅ Add Indeed searches to `tracked_companies`
3. ✅ Run: `npm run scan --dry-run` (preview results)
4. ✅ Run: `npm run scan` (save results to pipeline)
5. ✅ Run: `gemini /career-ops-pipeline` (evaluate all)

---

## See Also

- [modes/scan.md](modes/scan.md) — Full scanner documentation
- [QUICK-REFERENCE.md](docs/QUICK-REFERENCE.md) — Command cheat sheet
- [Indeed12 API Docs](https://rapidapi.com/laimoon/api/indeed12) — Official RapidAPI docs
- [RapidAPI Dashboard](https://rapidapi.com/user/dashboard) — Manage API keys and quotas
