const PDFDocument = require('pdfkit');

const generateReceipt = (invoice, client) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).text('Nexus Corporate Services', { align: 'center' });
    doc.moveDown().fontSize(16).text('Payment Receipt', { align: 'center' });
    doc.moveDown(2).fontSize(12);
    doc.text(`Invoice: ${invoice.invoiceNumber}`);
    doc.text(`Description: ${invoice.description}`);
    doc.text(`Client: ${client.name} (${client.email})`);
    doc.text(`Amount: $${invoice.amount.toFixed(2)}`);
    doc.text(`Date: ${new Date().toDateString()}`);

    doc.moveDown(2).fontSize(40).fillColor('green').text('PAID', { align: 'center' });
    doc.end();
  });

module.exports = { generateReceipt };