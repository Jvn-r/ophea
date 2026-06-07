# Ophea: An Automated Cold Outreach Pipeline

A fully automated cold-outreach CLI tool built as a take-home assignment for Vocallabs/SubSpace. One domain in, personalized outreach emails out — zero manual steps in between.

---
## What it does

You give it a seed domain. It finds companies similar to that one, identifies C-suite and VP-level decision makers at those companies, resolves their verified work emails, and sends each of them a personalized cold email — all on its own.

`node index.js intercom.com`

That's the entire interface.

---
## Pipeline

```
seed domain    
    │
    v
Ocean.io       ->  find lookalike companies          ->  list of domains
    │
    v
Prospeo        ->  find decision makers              ->  people + person_ids
    │
    v
Prospeo        ->  bulk enrich for verified emails   ->  contacts with emails
    │
    v
Brevo          ->  send personalized outreach        ->  emails sent
```

Four stages, three APIs, one command.

---
## Project structure

```
ophea/
	index.js            — orchestrator, runs all stages in sequence
	config.js           — reads API keys from .env
	.env                — API keys (not committed)
	.gitignore          - ignore node_modules/ and .env
	services/
		ocean.js        — stage 1: lookalike company discovery
	    prospeo.js      — stage 2 + 3: people search and email enrichment
	    brevo.js        — stage 4: outreach sending
	test_services/
		test_ocean.js   - test ocean with fixed seed domain
		test_prospeo.js - test for prospeo, both search and enrich
		test_brevo.js   - send test email to personal email
```

---
## Setup

### 1. Clone and install
```bash
git clone https://github.com/your-username/ophea.git
cd ophea
npm install
```
### 2. Create a `.env` file
```env
OCEAN_API_KEY=
PROSPEO_API_KEY=
BREVO_API_KEY=
SENDER_EMAIL=you@yourdomain.com
SENDER_NAME=Your Name
```
### 3. Run
```bash
node index.js <seed-domain>
#example
node index.js intercom.com
```
Before emails fire, the pipeline prints a full summary of every contact it found and asks for confirmation. Type `yes` to send, anything else to abort.

---
## API overview
### Ocean.io
Finds companies with similar firmographics to the seed domain. Uses the `/v3/search/companies` endpoint with `lookalikeDomains` filter. Only the `domain` field is requested to keep credit usage minimal (0.2 credits/result).
### Prospeo
Does two things in sequence:
- `/search-person` — finds decision makers (C-Suite, VP, Founder) at each domain, returns person records with `person_id`
- `/bulk-enrich-person` — takes those `person_id`s and resolves verified work emails

Only contacts with `only_verified_email: true` are kept — no guessed or unverified addresses.
### Brevo
Sends personalized outreach using `messageVersions` — one version per contact, each with their own `to`, `subject`, and `params`. Personalization tokens (`{{params.firstName}}`, `{{params.company}}`, `{{params.title}}`) are resolved by Brevo at send time.

---
## Problems faced and how they were solved

### Ocean.io login issue
Ocean.io requires a company email to sign up, a free Gmail doesn't work. The workaround: set up a transactional email on Brevo using your custom domain first, use that address to create the Ocean.io account. Order matters: domain → Brevo email → Ocean.io.

### Eazyreach credits unavailable
The original pipeline design used Eazyreach to resolve LinkedIn URLs into work emails. Due to a surge in applications, the team running the assignment couldn't provide credits to everyone. Their workaround suggestion: use Prospeo's `/bulk-enrich-person` endpoint instead, since it can do the same job given a `person_id` from the search results. That's what the current implementation does. `eazyreach.js` is removed from repo as the original implementation but is not used.

### Prospeo starter plan rate limits
The API docs of Prospeo state a rate limit of 5 requests per second on the starter plan. In practice the actual limit is 1 request per second, enforced per-endpoint. Printed response headers confirm this:
```
x-second-rate-limit: 1
x-second-request-left: 0
x-second-reset-seconds: 1
```

On top of that, the `/bulk-enrich-person` endpoint on the starter plan effectively processes only 1 record per call regardless of batch size. Hence sending >1 person records in one request returns a 429(rate limiting error).

The fix: loop one person at a time with a 1.1 second sleep between each call. This means enriching 25 people takes about 25 seconds, which is expected and visible in the logs.

### Brevo domain verification
Brevo requires domain verification before you can send from a custom domain email. This involved adding SPF, DKIM, and DMARC DNS records on Namecheap. Once the records propagated, sending from `contacteme@jeevan.website` worked cleanly.

### Prospeo response field names
The person object uses `current_job_title` not `job_title`, and email is nested as `person.email.email` not `person.email`. Found by inspecting actual API responses in docs

---
## Sample run
```
Starting outreach pipeline for: intercom.com

[Ocean]: Finding lookalikes for: intercom.com
[Ocean]: Found 10 domains: kustomer.com, talkdesk.com, helpscout.com, ...

[Prospeo]: Finding decision makers for 10 domains...
[Prospeo] Found 25 people, enriching for emails...
[Prospeo] Enriched: Eric Harrington
[Prospeo] Enriched: Brad Birnbaum
[Prospeo] Enriched: David Slater
...
[Prospeo]: 22 contacts with verified emails ready

[Brevo]: Preparing outreach for 22 contacts...

 --- OUTREACH SUMMARY ---
1. Eric Harrington (Co-Founder) @ TeamSupport → eharrington@teamsupport.com
2. Brad Birnbaum (Chief Executive Officer) @ Kustomer → brad.birnbaum@kustomer.com
3. David Slater (Chief Marketing Officer) @ Front → david.slater@front.com
...
22. Sasha Sobol (VP, Enterprise Cloud Sales) @ Genesys → sasha.sobol@genesys.com
-------------------------

Send to 22 contact(s)? (yes/no): yes

[Brevo]: Outreach sent.
Pipeline complete.
```
---
## Stack
- Node.js (ES modules)
- axios
- dotenv
- Ocean.io API
- Prospeo API
- Brevo API
---
## Notes
- The pipeline is intentionally conservative with credits, Ocean.io is capped at 10 results per run, Prospeo only enriches verified emails
- The safety checkpoint before sending is not optional, it's there so you always know exactly who you're mailing before it fires
- A production version of this would add a retry queue with exponential backoff for the Prospeo rate limit skips, and paginate Ocean.io results for larger runs
---