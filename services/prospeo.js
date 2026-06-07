import axios from 'axios';
import { config } from '../config.js';

const BASE_URL = 'https://api.prospeo.io';
const TARGET_SENIORITIES = ['Founder/Owner', 'C-Suite', 'Vice President'];
const MAX_DOMAINS_PER_REQUEST = 500;

async function searchPeople(domains){
  const batch = domains.slice(0, MAX_DOMAINS_PER_REQUEST);
  
  const res = await axios.post(
    `${BASE_URL}/search-person`,
    {
      page: 1,
      filters:{
        company:{
          websites:{
            include: batch,
          },
        },
        person_seniority:{
          include: TARGET_SENIORITIES,
        },
      },
    },
    {
      headers:{
        'X-KEY': config.prospeo.apiKey,
        'Content-Type': 'application/json',
      },
    }
  );

  return res.data.results ?? [];
}

async function enrichPeople(people) {
  const results = [];

  for (const person of people) {
    await sleep(1100);                             //prospeo has hidden rate limits that are different from the api `'x-second-rate-limit': '1',` so only 1 request per second is allowed
    try {
      const res = await axios.post(
        `${BASE_URL}/bulk-enrich-person`,
        {
          only_verified_email: true,
          data: [{
            identifier: '0',
            person_id: person.person.person_id,
          }],
        },
        {
          headers: {
            'X-KEY': config.prospeo.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const matched = res.data.matched ?? [];
      if (matched.length > 0) {
        results.push(matched[0]);
        console.log(`[Prospeo] Enriched: ${matched[0].person?.full_name}`);
      }

    } catch (err) {
      if (err.response?.status === 429) {
        console.warn('[Prospeo] Rate limited, skipping person.');
      } else if (err.response?.data?.error_code === 'INSUFFICIENT_CREDITS') {
        console.error('[Prospeo] Out of credits, stopping enrich.');
        break;
      } else {
        console.error('[Prospeo] Enrich error:', err.response?.data ?? err.message);
      }
    }
  }

  return results;
}

export async function getDecisionMakers(domains){
  console.log(`[Prospeo]: Finding decision makers for ${domains.length} domains...`); 
  let searchResults;
  try{
    searchResults = await searchPeople(domains);
  }catch(err){ 
    if (err.response?.status === 429) {
      console.error('[Prospeo]: Rate limited on search.', err.response?.data ?? err.message); 
    }else{
      console.error('[Prospeo]: Search error:', err.response?.data ?? err.message);
    }
    return [];
  }

  if(searchResults.length === 0){
    console.warn('[Prospeo] No decision makers found.'); 
    return [];
  } 

  console.log(`[Prospeo] Found ${searchResults.length} people, enriching for emails...`);
  let enriched; 
  try{ 
    enriched = await enrichPeople(searchResults);
  }catch(err){
    console.log('STATUS:', err.response?.status);
    console.log('HEADERS:', err.response?.headers);
    console.log('DATA:', err.response?.data);
    console.log('MESSAGE:', err.message);
    if(err.response?.status === 400 && err.response?.data?.error_code === 'INSUFFICIENT_CREDITS') {
      console.error('[Prospeo] Out of credits.');
    }else if(err.response?.status === 429){
      console.error('[Prospeo] Rate limited on enrich.', err.response?.data ?? err.message);  
    }else{  
      console.error('[Prospeo] Enrich error:', err.response?.data ?? err.message);
    }
    return []; 
  }
  
  const contacts = enriched
    .map(r =>({
      name: r.person?.full_name ?? null,
      email: r.person?.email?.email ?? null,
      linkedin: r.person?.linkedin_url ?? null,
      company: r.company?.name ?? null,
      title: r.person?.current_job_title ?? null,
    }))
    .filter(c => c.email);

  console.log(`[Prospeo]: ${contacts.length} contacts with verified emails ready`);
  return contacts;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}