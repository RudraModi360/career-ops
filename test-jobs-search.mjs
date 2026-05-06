#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config();

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'indeed12.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

async function testJobSearch() {
  console.log('Testing /jobs/search endpoint...\n');
  
  const searchUrl = `https://${RAPIDAPI_HOST}/jobs/search?query=software+engineer&page_id=1&locality=us`;
  
  const headers = {
    'Content-Type': 'application/json',
    'x-rapidapi-host': RAPIDAPI_HOST,
    'x-rapidapi-key': RAPIDAPI_KEY,
  };

  try {
    console.log('URL:', searchUrl);
    console.log('');
    
    const res = await fetch(searchUrl, {
      headers,
      signal: AbortSignal.timeout(90000),
    });
    
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response keys:', Object.keys(json));
    console.log('Count:', json.count || 'N/A');
    console.log('');
    
    if (json.hits) {
      console.log('✓ Found hits array with', json.hits.length, 'items');
      if (json.hits.length > 0) {
        console.log('\nFirst result object keys:', Object.keys(json.hits[0]));
        console.log('\nFirst result (full):');
        console.log(JSON.stringify(json.hits[0], null, 2));
      }
    } else if (json.results) {
      console.log('✓ Found results array with', json.results.length, 'items');
    } else {
      console.log('✗ No hits or results array');
      console.log('Full response:', JSON.stringify(json, null, 2).slice(0, 500));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testJobSearch();
