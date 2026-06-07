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
  const contacts = await getDecisionMakers(domains);
  if(contacts.length === 0){
    console.error('Pipeline stopped: no contacts with emails found.');
    process.exit(1);
  }
  await sendOutreach(contacts);
  
  console.log('\nPipeline completeed\n');
}

run().catch(err =>{
  console.error('Unexpected error:', err.message);
  process.exit(1);
});