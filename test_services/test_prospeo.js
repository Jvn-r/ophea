import {getDecisionMakers} from '../services/prospeo.js';

try {
  const contacts = await getDecisionMakers([
    'paypal.com'
  ]);

  console.log('\n=== RESULTS ===\n');

  console.log(
    JSON.stringify(
      contacts,
      null,
      2
    )
  );

} catch (err) {
  console.error(
    'Test failed:',
    err.response?.data ?? err.message
  );
}