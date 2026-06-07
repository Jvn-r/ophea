import axios from 'axios';
import {config} from '../config.js';

const BASE_URL = 'https://api.ocean.io/v3';
const RESULTS_PER_RUN = 10;                     //0.2 credits each => 2 creds

export async function getLookalikes(seeDomain) {
  console.log(`[Ocean]: Finding lookalikes for: ${seeDomain}`);

  try {
    const res = await axios.post(
      `${BASE_URL}/search/companies`,
      {
        size: RESULTS_PER_RUN,
        fields: ['domain'],                     //only ask for domain save bandwidth
        companiesFilters: {
          lookalikeDomains: [seeDomain],
        },
      },
      {
        headers: {
          'x-api-token': config.ocean.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const companies = res.data.companies ?? [];

    if (companies.length === 0) {
      console.warn('[Ocean]: No other similar companies were found');
      return [];
    }

    const domains = companies
      .map(c => c.company?.domain)
      .filter(Boolean);                        //remove any null or undefined values

    console.log(`[Ocean]: Found ${domains.length} domains: `, domains);
    return domains;

  }catch (err) {
    if (err.response?.status === 429) {         //429 is rate limit error
      console.error('[Ocean]: Rate limited.');
    }else{
      console.error('[Ocean]: Error: ', err.response?.data ?? err.message);
    }
    return [];
  }
}