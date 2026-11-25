const express = require('express');
const Stripe = require('stripe');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/:id/pay', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (invoice.status === 'Paid') {
      return res.status(400).json({ message: 'Invoice already paid' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: invoice.invoiceNumber },
            unit_amount: Math.round(invoice.amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId: invoice._id.toString() },
      success_url: 'http://localhost:3000/payment-success',
      cancel_url: 'http://localhost:3000/payment-cancelled',
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;