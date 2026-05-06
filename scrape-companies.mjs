#!/usr/bin/env node

/**
 * scrape-companies.mjs — Gemini-powered company career page scraper
 * 
 * Researches tracked companies' career pages using Gemini API to find
 * AI/ML Engineer roles matching entry-level profile.
 * 
 * Usage:
 *   node scrape-companies.mjs                    # Research all enabled companies
 *   node scrape-companies.mjs --company "SAP"    # Research specific company
 *   node scrape-companies.mjs --dry-run          # Preview without saving
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

dotenv.config();

const parseYaml = yaml.load;

// ── Config ──────────────────────────────────────────────────────

const PORTALS_PATH = 'portals.yml';
const PIPELINE_PATH = 'data/pipeline.md';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SPECIFIC_COMPANY = args[args.indexOf('--company') + 1] || null;

// ── Load Configuration ──────────────────────────────────────────

let config;
try {
  const yamlContent = readFileSync(PORTALS_PATH, 'utf-8');
  config = parseYaml(yamlContent);
} catch (err) {
  console.error(`❌ Error loading ${PORTALS_PATH}:`, err.message);
  process.exit(1);
}

const trackedCompanies = config.tracked_companies || [];
const enabledCompanies = trackedCompanies.filter(c => c.enabled !== false);

if (enabledCompanies.length === 0) {
  console.error('❌ No tracked companies enabled in portals.yml');
  process.exit(1);
}

// ── Gemini API Call ──────────────────────────────────────────────

async function callGemini(prompt) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.3, // Lower temperature for focused results
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || '';
}

// ── Research Company for AI/ML Roles ────────────────────────────

async function researchCompany(company) {
  const prompt = `
You are a job market researcher. Your task is to find current AI/ML Engineer job openings at: ${company.name}

Company careers page: ${company.careers_url}

Search for ENTRY-LEVEL AI/ML positions including:
- AI Engineer (Entry/Junior/Fresher)
- ML Engineer (Entry/Junior/Fresher)
- Data Scientist (Entry/Junior/Fresher)
- Generative AI Engineer
- Deep Learning Engineer
- LLM Engineer
- NLP Engineer
- Computer Vision Engineer

IMPORTANT: Only list ENTRY-LEVEL roles (Fresher, Junior, Associate, Graduate, Intern)
EXCLUDE: Senior, Staff, Principal, Lead, Manager, Director

For each job found, provide:
1. Exact job title
2. Direct link to the job posting (if available)
3. Location
4. Brief description of role (1 sentence)
5. Match score to this profile:
   - Profile: Entry-level SDE + AI Engineer specializing in LLMs, generative AI, and production ML systems
   - Focus: End-to-end AI projects, multi-agent frameworks, deep learning fundamentals, MLOps

Format as JSON array like:
[
  {
    "title": "AI Engineer",
    "url": "https://...",
    "location": "Bangalore",
    "description": "Build ML models for mobile apps",
    "match_score": 9,
    "match_reason": "High ML focus, mobile + AI"
  }
]

If no jobs found, return: []

Search ${company.careers_url} and provide ONLY valid JSON, no other text.
`;

  console.log(`🔍 Researching ${company.name}...`);
  
  try {
    const result = await callGemini(prompt);
    
    // Extract JSON from response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`  ⚠️  No jobs found`);
      return [];
    }

    const jobs = JSON.parse(jsonMatch[0]);
    
    if (jobs.length === 0) {
      console.log(`  ⚠️  No entry-level AI/ML roles found`);
      return [];
    }

    console.log(`  ✅ Found ${jobs.length} potential match(es)`);
    return jobs.map(job => ({
      ...job,
      company: company.name,
    }));

  } catch (err) {
    console.error(`  ❌ Error researching ${company.name}:`, err.message);
    return [];
  }
}

// ── Add Jobs to Pipeline ────────────────────────────────────────

function addToPipeline(jobs) {
  if (jobs.length === 0) return 0;

  // Read existing pipeline
  let pipelineContent = '';
  if (existsSync(PIPELINE_PATH)) {
    pipelineContent = readFileSync(PIPELINE_PATH, 'utf-8');
  } else {
    pipelineContent = '## Pendientes\n\n';
  }

  // Filter for valid URLs only
  const validJobs = jobs.filter(j => j.url && j.url.startsWith('http'));
  
  if (validJobs.length === 0) {
    console.log('  ⚠️  No valid URLs to add');
    return 0;
  }

  // Add jobs to pipeline (avoid duplicates)
  let added = 0;
  for (const job of validJobs) {
    const jobLine = `- [ ] ${job.url} | ${job.company} | ${job.title}`;
    
    if (!pipelineContent.includes(job.url)) {
      pipelineContent += jobLine + '\n';
      console.log(`    ✅ Added: ${job.title}`);
      added++;
    } else {
      console.log(`    ⏭️  Already in pipeline: ${job.title}`);
    }
  }

  if (!DRY_RUN && added > 0) {
    writeFileSync(PIPELINE_PATH, pipelineContent);
  }

  return added;
}

// ── Main Execution ──────────────────────────────────────────────

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('\n🚀 Gemini-Powered Company Career Scraper');
  console.log('═'.repeat(50));
  if (DRY_RUN) console.log('(DRY-RUN MODE — No files will be saved)\n');

  const companiesToResearch = SPECIFIC_COMPANY
    ? enabledCompanies.filter(c => c.name.toLowerCase().includes(SPECIFIC_COMPANY.toLowerCase()))
    : enabledCompanies;

  if (companiesToResearch.length === 0) {
    console.error(`❌ No companies match: ${SPECIFIC_COMPANY}`);
    process.exit(1);
  }

  let totalJobsFound = 0;
  let totalJobsAdded = 0;

  for (const company of companiesToResearch) {
    const jobs = await researchCompany(company);
    totalJobsFound += jobs.length;

    if (jobs.length > 0) {
      // Filter by match score (>= 7)
      const highMatchJobs = jobs.filter(j => j.match_score >= 7);
      console.log(`  🎯 High match (score ≥7): ${highMatchJobs.length}/${jobs.length}`);
      
      const added = addToPipeline(highMatchJobs);
      totalJobsAdded += added;
    }

    // Rate limit: 1 second between requests
    if (companiesToResearch.indexOf(company) < companiesToResearch.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Results:`);
  console.log(`   Companies researched: ${companiesToResearch.length}`);
  console.log(`   Total jobs found: ${totalJobsFound}`);
  console.log(`   High match jobs (score ≥7): ${totalJobsAdded} added`);
  
  if (!DRY_RUN && totalJobsAdded > 0) {
    console.log(`\n✅ Results saved to ${PIPELINE_PATH}`);
    console.log(`→ Run: gemini /career-ops-pipeline`);
    console.log(`→ To evaluate and score these jobs\n`);
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
