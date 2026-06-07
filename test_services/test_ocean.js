import {getLookalikes} from '../services/ocean.js';

const results = await getLookalikes('stripe.com');

console.log(results);