require('dotenv').config();
const { generateReceipt } = require('./utils/receipt');
const { sendReceiptEmail } = require('./utils/mailer');

(async () => {
  const invoice = { invoiceNumber: 'INV-001', description: 'Consulting services', amount: 5000 };
  const client = { name: 'Test Client', email: process.env.EMAIL_USER };
  const pdf = await generateReceipt(invoice, client);
  await sendReceiptEmail(process.env.EMAIL_USER, invoice, pdf);
  console.log('Email sent');
})().catch((e) => console.log('Email error:', e.message));