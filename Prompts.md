# Prompts.md: AI Transparency

**Project:** VaultPay Financial Core (Client Delivery Phase III, Finance & Security)
**Track:** B, Fullstack (Node.js / Express / Stripe)
**Author:** Sakshi Rawat
**AI tool used:** Claude (Anthropic), in a single long chat session

This file documents how I used AI on this project, as required by the delivery rules. I am being specific about what the AI did and what I did, because the brief says webhooks and PDF generation are tricky and AI use must be documented thoroughly.

---

## 1. How I framed the AI's role

I pasted the full project brief and asked Claude to act as my **mentor**:

> "I want you to be my mentor and help me with this project by teaching core and all the concepts."

The agreed working style was:

- Explain the **concept first**, then give code.
- Work **one small step at a time**.
- Keep explanations **short and simple**.
- After each step, I run it, test it, and send back the output, error, or my file.
- Claude **reviews what I pasted** (my files, terminal output, screenshots) and tells me what is right or wrong before we continue.

Claude opened by explaining the single principle behind the whole project: **never trust the client**. Authentication (who are you), authorization (what may you touch), and payment truth (only Stripe's server can say a payment succeeded).

---

## 2. What I did myself

- Installed Node.js, Git, VS Code, GitHub CLI, and cloudflared on a new laptop.
- Created the MongoDB Atlas database user and connection, and the Stripe sandbox, API keys, and webhook destination.
- Created the Gmail App Password.
- Created every file and folder, typed the code, saved it, and ran the server.
- Tested every route in Thunder Client, including the attack tests.
- Debugged my own environment problems (listed in section 5), using Claude's diagnosis.
- Committed to Git and pushed to GitHub from the command line.
- Stored all secrets in `.env` and environment variables. No secret was ever pasted into the chat or committed.

## 3. What the AI did

- Taught each concept before the code (JWT, hashing, middleware, roles, IDOR, Checkout Sessions, webhooks, raw body, PDF buffers, SMTP App Passwords).
- **Reviewed my files and logs** after each step and pointed out what was correct or wrong.
- Diagnosed errors from my terminal output and screenshots.
- Wrote the README and this file from our conversation.


---

## 4. Step-by-step log: concept taught, then what I did

| # | Concept the AI taught | What I built and tested |
|---|---|---|
| 1 | **JWT**: header, payload, signature. Payload is only encoded, the signature makes it tamper-proof. A user who edits `role` to `admin` is rejected because the signature no longer matches. | Understood the threat model before coding. |
| 2 | **Project structure**: root folder, `server.js` as entry point, `models`, `routes`, `middleware`, `utils`. | Created the folders and `package.json` scripts (`start`, `dev` with nodemon). |
| 3 | **Data modeling**: an invoice must point to its owner so ownership can be compared later. | Wrote `models/User.js` (name, email unique, password hash, role enum) and `models/Invoice.js` (invoiceNumber, description, amount, status enum, `client` as an ObjectId reference). The AI checked both files. |
| 4 | **Express basics**: `express.json()`, routes, ports. | `server.js` returned "VaultPay API is running" in the browser. |
| 5 | **Environment variables** and `.env`, why secrets stay out of code, `.gitignore`. | Created `.env` and `.gitignore`. Connected Mongoose to Atlas. |
| 6 | **Password hashing**: bcrypt, salt, one-way hashes, why two identical passwords get different hashes. | `POST /api/auth/register`. Role is never read from the request body, so nobody can self-register as admin. |
| 7 | **Login and JWT signing**: compare hash, sign `{id, role}` with `JWT_SECRET`, expiry, identical error for wrong email and wrong password. | `POST /api/auth/login`. Inspected the token structure. |
| 8 | **Auth middleware (`protect`)**: `Authorization: Bearer <token>`, `jwt.verify`, `401` versus `403`. | `middleware/auth.js`. Tested `/api/me` with and without a token. |
| 9 | **Role guard (`adminOnly`)**: order matters, it must run after `protect`. | Added `adminOnly`. A client creating an invoice got `403 Admins only`. |
| 10 | **Seeding an admin** because registration only creates clients. | `seedAdmin.js` run once. Admin created an invoice successfully. |
| 11 | **IDOR prevention**: load the record, compare `invoice.client.toString()` with `req.user.id`, return `403` on mismatch. Why `.toString()` is needed (ObjectId vs string). | `GET /api/invoices` (filtered by owner) and `GET /api/invoices/:id`. **Attack test:** client 2 requested client 1's invoice and got `403 Forbidden`; client 2's list was `[]`. |
| 12 | **Stripe Checkout Sessions**: Stripe hosts the card form, my server never sees card data. `metadata.invoiceId` ties the payment to the invoice. Amounts are in cents. Ownership is checked **before** creating the session. | `POST /api/invoices/:id/pay`. Owner got a Stripe URL; client 2 got `403`. Paid with test card `4242 4242 4242 4242`. |
| 13 | **Webhooks as the source of truth**: the frontend can lie, only a signed server-to-server call can be trusted. `stripe.webhooks.constructEvent` verifies the signature. | `routes/webhooks.js` marks the invoice `Paid` only after verification. |
| 14 | **Raw body requirement**: the signature is computed on the exact raw bytes, so the webhook route must use `express.raw()` and be mounted **before** `express.json()`. | Fixed the route order in `server.js` after the error below. |
| 15 | **PDF generation in memory**: pdfkit writes to a buffer, so it can be attached to an email without saving a file. | `utils/receipt.js`. Generated a test PDF and checked the company name, details, and PAID stamp. |
| 16 | **SMTP and Gmail App Passwords** with nodemailer. | `utils/mailer.js`. Sent a test email with the PDF attached. |
| 17 | **Connecting the pipeline**: webhook verified, invoice Paid, PDF generated, email sent. The email step is in a `try/catch` so a mail failure does not make Stripe retry the webhook. | Server log showed `Invoice marked Paid`, `PDF generated`, `Receipt emailed to ...`. |
| 18 | **Deployment prep**: push to GitHub safely, verify `.env` is not tracked, `process.env.PORT` for Render. | Verified `.env` is not in the repo or its history. Pushed from the command line. |

---

## 5. Problems I hit, and how the AI helped diagnose them

| Problem | Cause the AI identified | Fix |
|---|---|---|
| `npm` / `node` not recognized | New laptop, Node.js not installed | Installed the Node.js LTS, reopened the terminal |
| `Missing script: "dev"` | Script was not yet in `package.json` | Added `start` and `dev` scripts |
| `MongoDB error: bad auth` | Wrong or placeholder password in the connection string | Reset the Atlas user password and corrected `.env` |
| `querySrv ECONNREFUSED` | My network's DNS refused the SRV lookup for the `mongodb+srv://` address | Set Google DNS inside `server.js` |
| `Invalid scheme` for Mongo URI | Malformed `MONGO_URI` line in `.env` | Corrected the line |
| `Cannot access 'app' before initialization` | A line used `app` before `const app = express()` | Moved the line below it |
| `Cannot find module '../models/User'` | Folder was named `model`, code expected `models` | Renamed the folder |
| Stripe CLI blocked | Windows Smart App Control blocked unsigned `stripe.exe` | Switched to a tunnel instead of disabling a Windows security feature |
| Webhook `408` timeouts | The localtunnel URL was dead (`503 Tunnel Unavailable`) | Switched to Cloudflare Tunnel |
| Webhook `400 Webhook signature failed` (1) | `STRIPE_WEBHOOK_SECRET` in `.env` was incomplete (`whsec_` plus a stray character) | Pasted the full signing secret and restarted the server |
| Webhook `400 Webhook signature failed` (2) | `express.json()` ran before the webhook route, so the body was already parsed | Mounted the webhook route before `express.json()`. I added a debug log to read the real error message, which pointed straight at this |

---

## 6. Security checks I ran myself

- Client calls an admin route: `403 Admins only`
- Client 2 requests client 1's invoice: `403 Forbidden`
- Client 2 tries to pay client 1's invoice: `403 Forbidden`
- Request without a token: `401 No token provided`
- Forged or badly signed webhook: `400 Webhook signature failed`
- A real Stripe payment through the signed webhook marked the invoice `Paid`, generated a PDF, and sent the email
- `.env` is not tracked and was never in Git history

---

## 7. Specific areas where AI helped, as requested by the brief

**Stripe signature verification:** Claude explained why the signature is computed on the raw body, why the route needs `express.raw({ type: 'application/json' })`, and why it must be registered before `express.json()`. It supplied the `constructEvent` call, and I debugged two real failures (section 5) before it passed.

**PDF buffer:** Claude explained that pdfkit emits chunks that can be collected and joined with `Buffer.concat`, so the PDF is attached to the email directly from memory. It supplied the generator, and I opened the output to verify the content.

**Known gap:** the Nexus logo required by the brief has not been added to the PDF receipt yet.

---

## 8. Reflection

The most useful part of working with the AI as a mentor was learning why each protection exists, not only how to type it. The two hardest bugs (the incomplete webhook secret and the raw-body ordering) taught me that signature verification fails on a single wrong character or a single parsed byte, which is exactly why the webhook is trustworthy.
