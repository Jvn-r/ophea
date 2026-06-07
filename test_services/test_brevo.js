import { sendOutreach } from '../services/brevo.js';

const results = await sendOutreach([
  {
    name: "Test User",
    email: "rjeevan1495@gmail.com", 
    company: "Test Corp",
    title: "CEO",
  }
]);