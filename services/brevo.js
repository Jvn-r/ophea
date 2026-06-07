import axios from 'axios';
import {config} from '../config.js';

const BASE_URL = 'https://api.brevo.com/v3';

function buildEmailVersion(contact) {
  return {
    to: [{ email: contact.email, name: contact.name }],
    subject: `Quick question, {{params.firstName}}`,
    params: {
      firstName: contact.name.split(' ')[0],
      company: contact.company ?? 'your company',
      title: contact.title ?? 'your role',
    },
  };
}

export async function sendOutreach(contacts){
  console.log(`[Brevo]: Preparing outreach for ${contacts.length} contacts...`);

  if(contacts.length === 0){
    console.warn('[Brevo]: No contacts to mail. Exiting.');
    return;
  }

  //safety checkpoint show summary before firing
  console.log('\n ---OUTREACH SUMMARY ---');
  contacts.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.title ?? 'N/A'}) @ ${c.company ?? 'N/A'} -> ${c.email}`);
  });
  console.log('------------\n');

  const proceed = await confirm(`Send to ${contacts.length} contact(s)? (yes/no): `);
  if (!proceed) {
    console.log('[Brevo]: Aborted by user');
    return;
  }

  try{
    const res = await axios.post(
      `${BASE_URL}/smtp/email`,
      {
        sender:{
          email: config.brevo.senderEmail,
          name: config.brevo.senderName,
        },
        subject: 'Quick question',
        messageVersions: contacts.map(buildEmailVersion),
        htmlContent: `
          <p>Hello {{params.firstName}},</p>
          <p>
            I came across {{params.company}} and was impressed by what you're building.
            As {{params.title}}, I imagine you're always looking for ways to streamline operations and drive growth.
          </p>
          <p>
            I'd love to show you how we can help, would you be open to a quick 15-minute call this week?
          </p>
          <p>
            Best,<br/>
            ${config.brevo.senderName}
          </p>
        `,
      },
      {
        headers:{
          'api-key': config.brevo.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`[Brevo]: Outreach sent. Message ID: ${res.data.messageIds?.[0] ?? 'Unknown'}`);
  }catch(err){
    console.error('[Brevo]: Error sending emails:', err.response?.data ?? err.message);
  }
}

//readline-based yes no prompt
async function confirm(question){
  const {createInterface} = await import('readline');
  const rl = createInterface({input: process.stdin, output: process.stdout});
  return new Promise(resolve =>{
    rl.question(question, answer =>{
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}