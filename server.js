require('dotenv').config();
require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const express = require('express');
const { protect } = require('./middleware/auth');

const app = express();

// Webhook must come BEFORE express.json()
app.use('/api/webhooks', require('./routes/webhooks'));

app.use(express.json());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/invoices', require('./routes/payments'));

app.get('/', (req, res) => {
  res.send('VaultPay API is running');
});

app.get('/api/me', protect, (req, res) => {
  res.json({ user: req.user });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB error:', err.message));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});