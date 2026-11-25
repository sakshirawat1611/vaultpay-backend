const fs = require('fs');
const { generateReceipt } = require('./utils/receipt');

generateReceipt(
  { invoiceNumber: 'INV-001', description: 'Consulting services', amount: 5000 },
  { name: 'Test Client', email: 'client1@test.com' }
).then((buf) => {
  fs.writeFileSync('test-receipt.pdf', buf);
  console.log('PDF written');
});