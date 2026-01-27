/**
 * Email Service
 * Uses Nodemailer directly to send emails via Gmail SMTP
 */

const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn('SMTP credentials not configured. Email sending disabled.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }
  return transporter;
};

/**
 * Send an email via Nodemailer
 * @param {Object} options Email options
 * @param {string|string[]} options.to Recipient email(s)
 * @param {string} options.subject Email subject
 * @param {string} options.html HTML content
 * @param {string} [options.text] Plain text content (optional)
 * @param {string|string[]} [options.cc] CC recipients
 * @param {string|string[]} [options.bcc] BCC recipients
 * @param {string} [options.replyTo] Reply-to address
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async ({ to, subject, html, text, cc, bcc, replyTo }) => {
  const transport = getTransporter();

  if (!transport) {
    console.log('Email would be sent to:', to, 'Subject:', subject);
    return { messageId: 'email-disabled', status: 'skipped' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text: text || stripHtml(html),
  };

  if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
  if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
  if (replyTo) mailOptions.replyTo = replyTo;

  const result = await transport.sendMail(mailOptions);
  console.log('Email sent:', result.messageId);
  return result;
};

/**
 * Simple HTML tag stripper for plain text fallback
 */
const stripHtml = (html) => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Format currency for display
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount || 0);
};

/**
 * Format date for display
 */
const formatDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  let date;
  if (dateVal.toDate) {
    date = dateVal.toDate();
  } else if (dateVal._seconds) {
    date = new Date(dateVal._seconds * 1000);
  } else {
    date = new Date(dateVal);
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Generate HTML email for a Purchase Order
 */
const generatePurchaseOrderEmail = (po, vendor, tenant) => {
  const lineItemsHtml = po.lineItems
    .map(
      (line, index) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${line.description || 'Item'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${line.qtyOrdered}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${line.uom || 'units'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(line.unitPrice)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(line.qtyOrdered * line.unitPrice)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">Purchase Order</h1>
    <p style="margin: 8px 0 0 0; font-size: 18px; opacity: 0.9;">${po.poNumber}</p>
  </div>

  <!-- Main Content -->
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

    <!-- From/To Section -->
    <div style="display: flex; margin-bottom: 30px;">
      <div style="flex: 1; padding-right: 20px;">
        <h3 style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">From</h3>
        <p style="margin: 0; font-weight: 600;">${tenant?.name || 'SteadStack Farm'}</p>
        ${tenant?.address ? `<p style="margin: 4px 0 0 0; color: #6b7280;">${tenant.address}</p>` : ''}
      </div>
      <div style="flex: 1; padding-left: 20px; border-left: 1px solid #e5e7eb;">
        <h3 style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 8px 0;">To</h3>
        <p style="margin: 0; font-weight: 600;">${vendor.name}</p>
        ${vendor.email ? `<p style="margin: 4px 0 0 0; color: #6b7280;">${vendor.email}</p>` : ''}
        ${vendor.phone ? `<p style="margin: 4px 0 0 0; color: #6b7280;">${vendor.phone}</p>` : ''}
      </div>
    </div>

    <!-- PO Details -->
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <div style="display: flex; flex-wrap: wrap; gap: 20px;">
        <div style="flex: 1; min-width: 150px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Order Date</p>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${formatDate(po.orderDate)}</p>
        </div>
        <div style="flex: 1; min-width: 150px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Expected Delivery</p>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${formatDate(po.expectedDate)}</p>
        </div>
        <div style="flex: 1; min-width: 150px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Payment Terms</p>
          <p style="margin: 4px 0 0 0; font-weight: 600;">${po.paymentTerms || 'Net 30'}</p>
        </div>
      </div>
    </div>

    <!-- Line Items -->
    <h3 style="margin: 0 0 16px 0; font-size: 16px;">Order Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">#</th>
          <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Description</th>
          <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Qty</th>
          <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Unit</th>
          <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
          <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="text-align: right; margin-top: 20px;">
      <div style="display: inline-block; text-align: left;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; min-width: 250px;">
          <span style="color: #6b7280;">Subtotal:</span>
          <span style="font-weight: 500;">${formatCurrency(po.totals?.subtotal)}</span>
        </div>
        ${
          po.totals?.tax
            ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #6b7280;">Tax:</span>
          <span style="font-weight: 500;">${formatCurrency(po.totals.tax)}</span>
        </div>
        `
            : ''
        }
        ${
          po.totals?.shipping
            ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #6b7280;">Shipping:</span>
          <span style="font-weight: 500;">${formatCurrency(po.totals.shipping)}</span>
        </div>
        `
            : ''
        }
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #1f2937; margin-top: 8px;">
          <span style="font-weight: 700; font-size: 18px;">Total:</span>
          <span style="font-weight: 700; font-size: 18px;">${formatCurrency(po.totals?.total)}</span>
        </div>
      </div>
    </div>

    ${
      po.notes
        ? `
    <!-- Notes -->
    <div style="margin-top: 30px; padding: 20px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <h4 style="margin: 0 0 8px 0; color: #92400e;">Notes</h4>
      <p style="margin: 0; color: #78350f;">${po.notes}</p>
    </div>
    `
        : ''
    }

  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">This purchase order was generated by SteadStack</p>
    <p style="margin: 8px 0 0 0;">Please contact us if you have any questions about this order.</p>
  </div>

</body>
</html>
`;

  return html;
};

/**
 * Send a Purchase Order email to vendor
 */
const sendPurchaseOrderEmail = async (po, vendor, tenant, replyToEmail) => {
  const html = generatePurchaseOrderEmail(po, vendor, tenant);

  return sendEmail({
    to: vendor.email,
    subject: `Purchase Order ${po.poNumber} from ${tenant?.name || 'SteadStack Farm'}`,
    html,
    replyTo: replyToEmail,
  });
};

module.exports = {
  sendEmail,
  sendPurchaseOrderEmail,
  generatePurchaseOrderEmail,
};
