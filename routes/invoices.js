const express = require('express');
const Invoice = require('../models/Invoice');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Admin creates an invoice for a client
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { invoiceNumber, description, amount, client } = req.body;
    const invoice = await Invoice.create({
      invoiceNumber,
      description,
      amount,
      client,
    });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// List invoices: admin sees all, client sees only their own
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { client: req.user.id };
    const invoices = await Invoice.find(filter);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get one invoice: ownership check prevents IDOR
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const isOwner = invoice.client.toString() === req.user.id;
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;