#!/usr/bin/env node

/**
 * Quick test to see what Indeed API returns
 */

import dotenv from 'dotenv';

dotenv.config();

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'indeed12.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

async function test() {
  const companyName = 'Google';
  const companyJobsUrl = `https://${RAPIDAPI_HOST}/company/${encodeURIComponent(companyName)}/jobs?locality=us&start=1`;
  
  const headers = {
    'Content-Type': 'application/json',
    'x-rapidapi-host': RAPIDAPI_HOST,
    'x-rapidapi-key': RAPIDAPI_KEY,
  };

  console.log('Testing Indeed API with', companyName, '...');
  console.log('URL:', companyJobsUrl);
  console.log('Host header:', RAPIDAPI_HOST);
  console.log('Key (masked):', RAPIDAPI_KEY.slice(0, 10) + '...');
  console.log('');

  try {
    const res = await fetch(companyJobsUrl, {
      headers,
      signal: AbortSignal.timeout(90000),
    });
    
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers));
    console.log('');
    
    const json = await res.json();
    console.log('Response keys:', Object.keys(json));
    console.log('Count:', json.count);
    console.log('');
    
    if (json.hits) {
      console.log('✓ Found hits array with', json.hits.length, 'items');
      if (json.hits.length > 0) {
        console.log('First result keys:', Object.keys(json.hits[0]));
        console.log('First 3 results:');
        json.hits.slice(0, 3).forEach((hit, i) => {
          console.log(`  ${i+1}. ${hit.title} @ ${hit.company} (${hit.location})`);
          console.log(`     URL: ${hit.url || hit.joburl}`);
        });
      }
    } else {
      console.log('✗ No hits array found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
