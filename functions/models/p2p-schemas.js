/**
 * P2P (Purchase-to-Pay) Data Schemas
 * Firestore document structures for the procurement workflow
 */

// ============================================
// ENUMS / CONSTANTS
// ============================================

const RequisitionStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CONVERTED: 'CONVERTED', // Converted to PO
};

const PurchaseOrderStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  OPEN: 'OPEN', // Sent and acknowledged/confirmed
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED', // Fully received
  CLOSED: 'CLOSED', // Completed and finalized
  CANCELLED: 'CANCELLED',
};

const ReceiptStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
};

const VendorBillStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  VOID: 'VOID',
};

const BillMatchStatus = {
  UNMATCHED: 'UNMATCHED',
  PARTIAL: 'PARTIAL',
  MATCHED: 'MATCHED',
  DISCREPANCY: 'DISCREPANCY',
};

const PaymentStatus = {
  DRAFT: 'DRAFT',
  SENT: 'SENT', // Check mailed / ACH initiated
  CLEARED: 'CLEARED', // Bank reconciled
  VOID: 'VOID',
};

const PaymentMethod = {
  CHECK: 'CHECK',
  ACH: 'ACH',
  CARD: 'CARD',
  CASH: 'CASH',
  WIRE: 'WIRE',
};

const P2PEventType = {
  // Requisition events
  REQUISITION_CREATED: 'REQUISITION_CREATED',
  REQUISITION_SUBMITTED: 'REQUISITION_SUBMITTED',
  REQUISITION_APPROVED: 'REQUISITION_APPROVED',
  REQUISITION_REJECTED: 'REQUISITION_REJECTED',

  // PO events
  PO_CREATED: 'PO_CREATED',
  PO_SENT: 'PO_SENT',
  PO_CANCELLED: 'PO_CANCELLED',

  // Receipt events (these post to ledger)
  RECEIPT_POSTED: 'RECEIPT_POSTED',

  // Bill events
  BILL_CREATED: 'BILL_CREATED',
  BILL_APPROVED: 'BILL_APPROVED',
  BILL_VARIANCE_POSTED: 'BILL_VARIANCE_POSTED',
  BILL_VOIDED: 'BILL_VOIDED',

  // Payment events (these post to ledger)
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_SENT: 'PAYMENT_SENT',
  PAYMENT_CLEARED: 'PAYMENT_CLEARED',
  PAYMENT_VOIDED: 'PAYMENT_VOIDED',
};

const RequisitionSource = {
  MANUAL: 'MANUAL',
  AUTO_REORDER: 'AUTO_REORDER',
  TASK: 'TASK',
};

// ============================================
// DOCUMENT SCHEMAS (for reference/validation)
// ============================================

/**
 * Vendor Schema
 * tenants/{tenantId}/vendors/{vendorId}
 */
const vendorSchema = {
  name: 'string', // Required
  code: 'string|null', // Optional vendor code
  email: 'string|null',
  phone: 'string|null',
  address: {
    street: 'string|null',
    city: 'string|null',
    state: 'string|null',
    zip: 'string|null',
    country: 'string|null',
  },
  taxId: 'string|null', // EIN/SSN for 1099
  taxExemptForms: ['storageRef'], // W-9, etc.
  defaultPaymentTerms: 'number', // Days, e.g., 30
  defaultPaymentMethod: 'PaymentMethod|null',
  notes: 'string|null',
  isActive: 'boolean',
  createdAt: 'timestamp',
  createdBy: 'string',
  updatedAt: 'timestamp',
};

/**
 * Purchase Requisition Schema
 * tenants/{tenantId}/purchaseRequisitions/{reqId}
 */
const purchaseRequisitionSchema = {
  reqNumber: 'string', // Human-readable REQ-0001
  siteId: 'string', // Required
  requestedByUserId: 'string',
  status: 'RequisitionStatus',
  source: 'RequisitionSource',
  sourceTaskId: 'string|null', // If from task
  neededByDate: 'timestamp|null',
  notes: 'string|null',
  lineItems: [{
    itemId: 'string', // inventoryItems ref
    description: 'string',
    qty: 'number',
    uom: 'string',
    estimatedUnitPrice: 'number|null',
    preferredVendorId: 'string|null',
  }],
  approval: {
    approvedByUserId: 'string|null',
    approvedAt: 'timestamp|null',
    rejectedByUserId: 'string|null',
    rejectedAt: 'timestamp|null',
    rejectedReason: 'string|null',
  },
  convertedToPoId: 'string|null',
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

/**
 * Purchase Order Schema
 * tenants/{tenantId}/purchaseOrders/{poId}
 */
const purchaseOrderSchema = {
  poNumber: 'string', // Human-readable PO-0001
  siteId: 'string',
  vendorId: 'string',
  status: 'PurchaseOrderStatus',
  sourceRequisitionId: 'string|null',
  orderDate: 'timestamp',
  expectedDate: 'timestamp|null',
  shipToSiteId: 'string', // Usually same as siteId
  shipToAddress: {
    street: 'string|null',
    city: 'string|null',
    state: 'string|null',
    zip: 'string|null',
  },
  lineItems: [{
    lineNumber: 'number', // 1, 2, 3...
    itemId: 'string',
    description: 'string',
    qtyOrdered: 'number',
    uom: 'string',
    unitPrice: 'number',
    qtyReceived: 'number', // Running total
    qtyCancelled: 'number',
    lineTotal: 'number', // qtyOrdered * unitPrice
    glAccountId: 'string|null', // Override default
  }],
  totals: {
    subtotal: 'number',
    tax: 'number',
    shipping: 'number',
    total: 'number',
  },
  terms: 'string|null', // Payment terms text
  notes: 'string|null',
  internalNotes: 'string|null',
  sentAt: 'timestamp|null',
  sentByUserId: 'string|null',
  createdAt: 'timestamp',
  createdBy: 'string',
  updatedAt: 'timestamp',
};

/**
 * Receipt (Goods Receipt) Schema
 * tenants/{tenantId}/receipts/{receiptId}
 */
const receiptSchema = {
  receiptNumber: 'string', // RCV-0001
  siteId: 'string',
  poId: 'string',
  vendorId: 'string', // Denormalized for queries
  status: 'ReceiptStatus',
  receivedAt: 'timestamp',
  receivedByUserId: 'string',
  packingSlipNumber: 'string|null',
  notes: 'string|null',
  lines: [{
    poLineNumber: 'number', // Links to PO line
    itemId: 'string',
    description: 'string',
    qtyReceived: 'number',
    uom: 'string',
    unitCost: 'number', // From PO or adjusted
    totalCost: 'number',
    lotNumber: 'string|null',
    expirationDate: 'timestamp|null',
    storageLocation: 'string|null',
  }],
  totals: {
    totalCost: 'number',
    lineCount: 'number',
  },
  eventId: 'string|null', // After posting
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
};

/**
 * Vendor Bill Schema
 * tenants/{tenantId}/vendorBills/{billId}
 */
const vendorBillSchema = {
  billNumber: 'string', // Vendor's invoice number
  internalNumber: 'string', // Our reference BILL-0001
  siteId: 'string',
  vendorId: 'string',
  status: 'VendorBillStatus',
  billDate: 'timestamp',
  dueDate: 'timestamp',
  attachments: [{
    storageRef: 'string',
    fileName: 'string',
    uploadedAt: 'timestamp',
  }],
  match: {
    poId: 'string|null',
    receiptIds: ['string'],
    matchStatus: 'BillMatchStatus',
    matchedAt: 'timestamp|null',
    matchedByUserId: 'string|null',
    varianceAmount: 'number', // + = bill higher, - = bill lower
    varianceNotes: 'string|null',
  },
  lines: [{
    lineNumber: 'number',
    description: 'string',
    itemId: 'string|null', // Optional for non-inventory expenses
    poLineNumber: 'number|null', // Links to PO line if matched
    qty: 'number|null',
    uom: 'string|null',
    unitPrice: 'number|null',
    amount: 'number', // Line total
    glAccountId: 'string', // Expense/Inventory account
  }],
  totals: {
    subtotal: 'number',
    tax: 'number',
    total: 'number',
    amountPaid: 'number',
    amountDue: 'number',
  },
  approval: {
    approvedByUserId: 'string|null',
    approvedAt: 'timestamp|null',
  },
  payments: [{
    paymentId: 'string',
    amount: 'number',
    paidAt: 'timestamp',
  }],
  varianceEventId: 'string|null', // If variance posted
  createdAt: 'timestamp',
  createdBy: 'string',
  updatedAt: 'timestamp',
};

/**
 * Payment Schema
 * tenants/{tenantId}/payments/{paymentId}
 */
const paymentSchema = {
  paymentNumber: 'string', // PAY-0001 or check number
  siteId: 'string',
  vendorId: 'string',
  status: 'PaymentStatus',
  method: 'PaymentMethod',
  amount: 'number',
  paidAt: 'timestamp',
  referenceNumber: 'string|null', // Check #, ACH ref, etc.
  memo: 'string|null',
  allocations: [{
    billId: 'string',
    amountApplied: 'number',
  }],
  bankAccountId: 'string', // GL account for cash/checking
  eventId: 'string|null',
  clearedAt: 'timestamp|null',
  clearedByUserId: 'string|null',
  voidedAt: 'timestamp|null',
  voidedByUserId: 'string|null',
  voidReason: 'string|null',
  createdAt: 'timestamp',
  createdBy: 'string',
  updatedAt: 'timestamp',
};

// ============================================
// STATE MACHINE TRANSITIONS
// ============================================

const RequisitionTransitions = {
  [RequisitionStatus.DRAFT]: [RequisitionStatus.SUBMITTED],
  [RequisitionStatus.SUBMITTED]: [RequisitionStatus.APPROVED, RequisitionStatus.REJECTED],
  [RequisitionStatus.APPROVED]: [RequisitionStatus.CONVERTED],
  [RequisitionStatus.REJECTED]: [], // Terminal
  [RequisitionStatus.CONVERTED]: [], // Terminal
};

const PurchaseOrderTransitions = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.SENT, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.SENT]: [PurchaseOrderStatus.OPEN, PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.OPEN]: [PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CLOSED],
  [PurchaseOrderStatus.RECEIVED]: [PurchaseOrderStatus.CLOSED],
  [PurchaseOrderStatus.CLOSED]: [], // Terminal
  [PurchaseOrderStatus.CANCELLED]: [], // Terminal
};

const ReceiptTransitions = {
  [ReceiptStatus.DRAFT]: [ReceiptStatus.POSTED],
  [ReceiptStatus.POSTED]: [], // Terminal (reversals create new events)
};

const VendorBillTransitions = {
  [VendorBillStatus.DRAFT]: [VendorBillStatus.APPROVED, VendorBillStatus.VOID],
  [VendorBillStatus.APPROVED]: [VendorBillStatus.PARTIALLY_PAID, VendorBillStatus.PAID, VendorBillStatus.VOID],
  [VendorBillStatus.PARTIALLY_PAID]: [VendorBillStatus.PAID, VendorBillStatus.VOID],
  [VendorBillStatus.PAID]: [], // Terminal
  [VendorBillStatus.VOID]: [], // Terminal
};

const PaymentTransitions = {
  [PaymentStatus.DRAFT]: [PaymentStatus.SENT, PaymentStatus.VOID],
  [PaymentStatus.SENT]: [PaymentStatus.CLEARED, PaymentStatus.VOID],
  [PaymentStatus.CLEARED]: [], // Terminal
  [PaymentStatus.VOID]: [], // Terminal
};

// ============================================
// VALIDATION HELPERS
// ============================================

const validateTransition = (transitions, currentStatus, newStatus) => {
  const allowed = transitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition: ${currentStatus} -> ${newStatus}`);
  }
  return true;
};

const canApproveRequisition = (userRoles) => {
  return userRoles.some(r => ['owner', 'admin', 'manager'].includes(r));
};

const canApproveBill = (userRoles) => {
  return userRoles.some(r => ['owner', 'admin', 'manager'].includes(r));
};

const canMakePayment = (userRoles) => {
  return userRoles.some(r => ['owner', 'admin', 'manager'].includes(r));
};

const canReceive = (userRoles) => {
  // Workers can receive with proper config
  return userRoles.some(r => ['owner', 'admin', 'manager', 'worker'].includes(r));
};

module.exports = {
  // Enums
  RequisitionStatus,
  PurchaseOrderStatus,
  ReceiptStatus,
  VendorBillStatus,
  BillMatchStatus,
  PaymentStatus,
  PaymentMethod,
  P2PEventType,
  RequisitionSource,

  // Transitions
  RequisitionTransitions,
  PurchaseOrderTransitions,
  ReceiptTransitions,
  VendorBillTransitions,
  PaymentTransitions,

  // Validators
  validateTransition,
  canApproveRequisition,
  canApproveBill,
  canMakePayment,
  canReceive,
};
