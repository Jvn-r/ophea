import {getLookalikes} from './services/ocean.js';
import {getDecisionMakers} from './services/prospeo.js';
import {sendOutreach} from './services/brevo.js';

async function run() {
  const seedDomain = process.argv[2];

  if(!seedDomain){
    console.error('Usage: node index.js <seed-domain>');
    console.error('Please enter: node index.js intercom.com');
    process.exit(1);
  }
  console.log(`\nStarting outreach pipeline for: ${seedDomain}\n`);

  const domains = await getLookalikes(seedDomain);
  if(domains.length === 0){
    console.error('Pipeline stopped: no lookalike domains found.');
    process.exit(1);
  }
  const uniqueDomains = [...new Set(domains)];

  const contacts = await getDecisionMakers(uniqueDomains);
  if(contacts.length === 0){
    console.error('Pipeline stopped: no contacts with emails found.');
    process.exit(1);
  }
  const seen = new Set();
  const uniqueContacts = contacts.filter(c => {
    if (seen.has(c.email)) return false;
    seen.add(c.email);
    return true;
  });

  await sendOutreach(uniqueContacts);
  
  console.log('\nPipeline completeed\n');
}

run().catch(err =>{
  console.error('Unexpected error:', err.message);
  process.exit(1);
});