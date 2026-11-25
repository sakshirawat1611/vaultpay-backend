const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendReceiptEmail = async (toEmail, invoice, pdfBuffer) => {
  await transporter.sendMail({
    from: `"Nexus Corporate Services" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Payment Receipt - ${invoice.invoiceNumber}`,
    text: `Thank you. Your payment of $${invoice.amount} for ${invoice.invoiceNumber} was received. Your receipt is attached.`,
    attachments: [
      {
        filename: `receipt-${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
};

module.exports = { sendReceiptEmail };