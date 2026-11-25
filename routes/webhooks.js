const express = require('express');
const Stripe = require('stripe');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { generateReceipt } = require('../utils/receipt');
const { sendReceiptEmail } = require('../utils/mailer');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log('Webhook error:', err.message);
    return res.status(400).send('Webhook signature failed');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const invoiceId = session.metadata.invoiceId;
      const invoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        { status: 'Paid' },
        { new: true }
      );
      console.log('Invoice marked Paid:', invoiceId);

      try {
        const client = await User.findById(invoice.client);
        const pdf = await generateReceipt(invoice, client);
        console.log('PDF generated');
        await sendReceiptEmail(client.email, invoice, pdf);
        console.log('Receipt emailed to', client.email);
      } catch (err) {
        console.log('Receipt/email error:', err.message);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;