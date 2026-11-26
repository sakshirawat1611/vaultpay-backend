# VaultPay Financial Core

A secure, role-based invoicing and payment backend for **Nexus Corporate Services**. Admins create invoices, clients log in and see only their own invoices, pay them through Stripe, and automatically receive a PDF receipt by email.

Built for Prodesk IT, Client Delivery Phase III (Finance & Security), Track B: Fullstack (Node.js / Express / Stripe).

---

## Features

- **JWT authentication** with hashed passwords (bcrypt)
- **Role-based access control**: `admin` and `client`
- **Zero-trust API**: IDOR prevention through ownership checks on every invoice route
- **Stripe Checkout** for card payments (card details never touch this server)
- **Stripe webhook** with cryptographic signature verification as the only source of truth for "Paid"
- **Automatic PDF receipt** (pdfkit) with a PAID stamp
- **Automatic email delivery** of the receipt (nodemailer)

---

## Tech Stack

| Area | Tool |
|---|---|
| Runtime / server | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Auth | jsonwebtoken, bcryptjs |
| Payments | Stripe (Checkout + Webhooks) |
| PDF | pdfkit |
| Email | nodemailer (Gmail App Password) |
| Dev | nodemon, dotenv |

---

## Security Design

1. **Authentication**: every protected route runs the `protect` middleware, which verifies the JWT signature and expiry.
2. **Authorization**: the `adminOnly` middleware rejects non-admins with `403`.
3. **IDOR prevention**: for `GET /api/invoices/:id` and `POST /api/invoices/:id/pay`, the server loads the invoice and compares `invoice.client` with the user ID inside the verified token. A mismatch returns `403 Forbidden`. The frontend is never trusted to hide data.
4. **Registration is always `client`**: the `role` field is ignored in `/register`, so nobody can sign up as an admin. The admin is created once with `seedAdmin.js`.
5. **Payments are confirmed only by Stripe**: the browser returning to the success page proves nothing. The webhook verifies Stripe's signature using `stripe.webhooks.constructEvent` on the raw request body, and only then sets `status: 'Paid'`.
6. **Same error for wrong email and wrong password** (`Invalid credentials`), so attackers cannot tell which one was wrong.
7. **Secrets** live in environment variables and `.env` is git-ignored.

---

## Project Structure

```
vaultpay-backend/
├── server.js              Entry point: Express app, middleware order, DB connection
├── seedAdmin.js           One-time script that creates the admin user
├── middleware/
│   └── auth.js            protect (JWT check) and adminOnly (role check)
├── models/
│   ├── User.js            name, email (unique), hashed password, role
│   └── Invoice.js         invoiceNumber, description, amount, status, client (User _id)
├── routes/
│   ├── auth.js            register and login
│   ├── invoices.js        create (admin), list, get one (ownership check)
│   ├── payments.js        create Stripe Checkout session (ownership check)
│   └── webhooks.js        Stripe webhook: verify, mark Paid, PDF, email
├── utils/
│   ├── receipt.js         builds the PDF receipt in memory
│   └── mailer.js          sends the receipt email
├── .gitignore
└── package.json
```

---

## API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a client account |
| POST | `/api/auth/login` | Public | Returns a JWT |
| GET | `/api/me` | Logged in | Returns the user ID and role from the token |
| POST | `/api/invoices` | Admin | Create an invoice for a client |
| GET | `/api/invoices` | Logged in | Admin sees all, a client sees only their own |
| GET | `/api/invoices/:id` | Owner or admin | Get one invoice (`403` if not the owner) |
| POST | `/api/invoices/:id/pay` | Invoice owner | Returns a Stripe Checkout URL |
| POST | `/api/webhooks/stripe` | Stripe only | Signed webhook, marks the invoice Paid |

Send the token as: `Authorization: Bearer <token>`

---

## Payment Flow

1. Admin creates an invoice for a client (`status: Pending`).
2. Client logs in and calls `POST /api/invoices/:id/pay`. The server checks ownership, then creates a Stripe Checkout session with `metadata.invoiceId`.
3. Client pays on Stripe's hosted page.
4. Stripe calls `POST /api/webhooks/stripe` with a signed event.
5. The server verifies the signature, sets the invoice to `Paid`, generates the PDF receipt, and emails it to the client.

The webhook route is mounted **before** `express.json()` and uses `express.raw()`, because signature verification needs the untouched raw body.

---

## Environment Variables

Create a `.env` file (never commit it):

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
```

On Render, add the same six values under **Environment**.

---

## Run Locally

```bash
npm install
node seedAdmin.js      # creates the admin user once
npm run dev            # starts the server on port 5000
```

Change the admin email and password inside `seedAdmin.js` before using this anywhere real.

### Testing the webhook locally

Stripe cannot reach `localhost`. Use a tunnel (for example `cloudflared tunnel --url http://localhost:5000`), then add an endpoint in the Stripe dashboard:

```
https://<your-tunnel>/api/webhooks/stripe
```

Select the event `checkout.session.completed` and copy the signing secret into `STRIPE_WEBHOOK_SECRET`. Restart the server after changing `.env`.

### Stripe test card

| Field | Value |
|---|---|
| Card | `4242 4242 4242 4242` |
| Expiry | any future date (e.g. `12/30`) |
| CVC | any 3 digits |

---

## Deployment

1. Push the repo to GitHub.
2. On Render, create a **Web Service** from the repo.
   - Build command: `npm install`
   - Start command: `node server.js`
3. Add the six environment variables.
4. In the Stripe dashboard, set the webhook endpoint URL to `https://<your-render-url>/api/webhooks/stripe` and copy its signing secret into Render.

---

## Security Audit Checklist

- Client calls an admin route: `403 Admins only`
- Client A requests Client B's invoice: `403 Forbidden`
- Client A tries to pay Client B's invoice: `403 Forbidden`
- Request without a token: `401`
- Forged webhook call: `400 Webhook signature failed`
- Tampered JWT payload: rejected (signature mismatch)

---

## AI Transparency

AI assistance was used for guidance on the Stripe webhook signature check, PDF buffer generation, and deployment steps. Details are documented in `Prompts.md`.

---

## Author

Sakshi Rawat
GitHub: [sakshirawat1611](https://github.com/sakshirawat1611)
