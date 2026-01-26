/**
 * P2P (Purchase-to-Pay) Service
 * Business logic for procurement workflow
 */

const { db, admin } = require('../config/firebase-admin');
const { FieldValue } = admin.firestore;
const accountingService = require('./accounting');
const {
  RequisitionStatus,
  PurchaseOrderStatus,
  ReceiptStatus,
  VendorBillStatus,
  BillMatchStatus,
  PaymentStatus,
  PaymentMethod,
  P2PEventType,
  RequisitionSource,
  RequisitionTransitions,
  PurchaseOrderTransitions,
  VendorBillTransitions,
  PaymentTransitions,
  validateTransition,
  canApproveRequisition,
  canApproveBill,
  canMakePayment,
  canReceive,
} = require('../models/p2p-schemas');

// ============================================
// SEQUENCE NUMBER GENERATORS
// ============================================

const getNextSequence = async (tenantId, sequenceType) => {
  const seqRef = db.collection('tenants').doc(tenantId).collection('sequences').doc(sequenceType);

  return db.runTransaction(async (transaction) => {
    const seqDoc = await transaction.get(seqRef);
    let nextNum = 1;

    if (seqDoc.exists) {
      nextNum = (seqDoc.data().current || 0) + 1;
    }

    transaction.set(seqRef, { current: nextNum, updatedAt: FieldValue.serverTimestamp() });
    return nextNum;
  });
};

const formatSequence = (prefix, num, padLength = 5) => {
  return `${prefix}-${String(num).padStart(padLength, '0')}`;
};

// ============================================
// VENDOR OPERATIONS
// ============================================

const createVendor = async (tenantId, vendorData, createdBy) => {
  const vendorRef = db.collection('tenants').doc(tenantId).collection('vendors').doc();

  const vendor = {
    name: vendorData.name,
    code: vendorData.code || null,
    email: vendorData.email || null,
    phone: vendorData.phone || null,
    address: vendorData.address || {},
    taxId: vendorData.taxId || null,
    taxExemptForms: vendorData.taxExemptForms || [],
    defaultPaymentTerms: vendorData.defaultPaymentTerms || 30,
    defaultPaymentMethod: vendorData.defaultPaymentMethod || null,
    notes: vendorData.notes || null,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await vendorRef.set(vendor);

  return { id: vendorRef.id, ...vendor };
};

const getVendors = async (tenantId, options = {}) => {
  const { activeOnly = true, limit = 100 } = options;

  let query = db.collection('tenants').doc(tenantId).collection('vendors');

  if (activeOnly) {
    query = query.where('isActive', '==', true);
  }

  query = query.orderBy('name').limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getVendor = async (tenantId, vendorId) => {
  const doc = await db.collection('tenants').doc(tenantId).collection('vendors').doc(vendorId).get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
};

// ============================================
// REQUISITION OPERATIONS
// ============================================

const createRequisition = async (tenantId, reqData, createdBy) => {
  const reqNum = await getNextSequence(tenantId, 'requisitions');
  const reqRef = db.collection('tenants').doc(tenantId).collection('purchaseRequisitions').doc();

  const requisition = {
    reqNumber: formatSequence('REQ', reqNum),
    siteId: reqData.siteId,
    requestedByUserId: createdBy,
    status: RequisitionStatus.DRAFT,
    source: reqData.source || RequisitionSource.MANUAL,
    sourceTaskId: reqData.sourceTaskId || null,
    neededByDate: reqData.neededByDate || null,
    notes: reqData.notes || null,
    lineItems: (reqData.lineItems || []).map((line, idx) => ({
      lineNumber: idx + 1,
      itemId: line.itemId,
      description: line.description || '',
      qty: line.qty,
      uom: line.uom,
      estimatedUnitPrice: line.estimatedUnitPrice || null,
      preferredVendorId: line.preferredVendorId || null,
    })),
    approval: {
      approvedByUserId: null,
      approvedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      rejectedReason: null,
    },
    convertedToPoId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await reqRef.set(requisition);

  // Create event
  await createP2PEvent(tenantId, {
    type: P2PEventType.REQUISITION_CREATED,
    sourceType: 'purchaseRequisition',
    sourceId: reqRef.id,
    siteId: reqData.siteId,
    payload: { reqNumber: requisition.reqNumber },
  }, createdBy);

  return { id: reqRef.id, ...requisition };
};

const submitRequisition = async (tenantId, reqId, userId) => {
  const reqRef = db.collection('tenants').doc(tenantId).collection('purchaseRequisitions').doc(reqId);

  return db.runTransaction(async (transaction) => {
    const reqDoc = await transaction.get(reqRef);
    if (!reqDoc.exists) throw new Error('Requisition not found');

    const req = reqDoc.data();
    validateTransition(RequisitionTransitions, req.status, RequisitionStatus.SUBMITTED);

    if (!req.lineItems || req.lineItems.length === 0) {
      throw new Error('Requisition must have at least one line item');
    }

    transaction.update(reqRef, {
      status: RequisitionStatus.SUBMITTED,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: reqId, status: RequisitionStatus.SUBMITTED };
  });
};

const approveRequisition = async (tenantId, reqId, userId, userRoles) => {
  if (!canApproveRequisition(userRoles)) {
    throw new Error('Insufficient permissions to approve requisitions');
  }

  const reqRef = db.collection('tenants').doc(tenantId).collection('purchaseRequisitions').doc(reqId);

  return db.runTransaction(async (transaction) => {
    const reqDoc = await transaction.get(reqRef);
    if (!reqDoc.exists) throw new Error('Requisition not found');

    const req = reqDoc.data();
    validateTransition(RequisitionTransitions, req.status, RequisitionStatus.APPROVED);

    transaction.update(reqRef, {
      status: RequisitionStatus.APPROVED,
      'approval.approvedByUserId': userId,
      'approval.approvedAt': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: reqId, status: RequisitionStatus.APPROVED };
  });
};

const rejectRequisition = async (tenantId, reqId, userId, userRoles, reason) => {
  if (!canApproveRequisition(userRoles)) {
    throw new Error('Insufficient permissions to reject requisitions');
  }

  if (!reason || reason.trim() === '') {
    throw new Error('Rejection reason is required');
  }

  const reqRef = db.collection('tenants').doc(tenantId).collection('purchaseRequisitions').doc(reqId);

  return db.runTransaction(async (transaction) => {
    const reqDoc = await transaction.get(reqRef);
    if (!reqDoc.exists) throw new Error('Requisition not found');

    const req = reqDoc.data();
    validateTransition(RequisitionTransitions, req.status, RequisitionStatus.REJECTED);

    transaction.update(reqRef, {
      status: RequisitionStatus.REJECTED,
      'approval.rejectedByUserId': userId,
      'approval.rejectedAt': FieldValue.serverTimestamp(),
      'approval.rejectedReason': reason,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: reqId, status: RequisitionStatus.REJECTED };
  });
};

const getRequisitions = async (tenantId, options = {}) => {
  const { siteId, status, limit = 50 } = options;

  let query = db.collection('tenants').doc(tenantId).collection('purchaseRequisitions');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  query = query.orderBy('createdAt', 'desc').limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getRequisition = async (tenantId, reqId) => {
  const doc = await db.collection('tenants').doc(tenantId).collection('purchaseRequisitions').doc(reqId).get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
};

// ============================================
// PURCHASE ORDER OPERATIONS
// ============================================

const createPurchaseOrder = async (tenantId, poData, createdBy) => {
  const poNum = await getNextSequence(tenantId, 'purchaseOrders');
  const poRef = db.collection('tenants').doc(tenantId).collection('purchaseOrders').doc();

  // Calculate totals
  const lineItems = (poData.lineItems || []).map((line, idx) => {
    const lineTotal = (line.qtyOrdered || 0) * (line.unitPrice || 0);
    return {
      lineNumber: idx + 1,
      itemId: line.itemId,
      description: line.description || '',
      qtyOrdered: line.qtyOrdered,
      uom: line.uom,
      unitPrice: line.unitPrice,
      qtyReceived: 0,
      qtyCancelled: 0,
      lineTotal,
      glAccountId: line.glAccountId || null,
    };
  });

  const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const tax = poData.tax || 0;
  const shipping = poData.shipping || 0;

  const purchaseOrder = {
    poNumber: formatSequence('PO', poNum),
    siteId: poData.siteId,
    vendorId: poData.vendorId,
    status: PurchaseOrderStatus.DRAFT,
    sourceRequisitionId: poData.sourceRequisitionId || null,
    orderDate: poData.orderDate || FieldValue.serverTimestamp(),
    expectedDate: poData.expectedDate || null,
    shipToSiteId: poData.shipToSiteId || poData.siteId,
    shipToAddress: poData.shipToAddress || {},
    lineItems,
    totals: {
      subtotal,
      tax,
      shipping,
      total: subtotal + tax + shipping,
    },
    terms: poData.terms || null,
    notes: poData.notes || null,
    internalNotes: poData.internalNotes || null,
    sentAt: null,
    sentByUserId: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await poRef.set(purchaseOrder);

  // If created from requisition, mark it as converted
  if (poData.sourceRequisitionId) {
    const reqRef = db.collection('tenants').doc(tenantId)
      .collection('purchaseRequisitions').doc(poData.sourceRequisitionId);

    await reqRef.update({
      status: RequisitionStatus.CONVERTED,
      convertedToPoId: poRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // Create event
  await createP2PEvent(tenantId, {
    type: P2PEventType.PO_CREATED,
    sourceType: 'purchaseOrder',
    sourceId: poRef.id,
    siteId: poData.siteId,
    payload: { poNumber: purchaseOrder.poNumber, vendorId: poData.vendorId },
  }, createdBy);

  return { id: poRef.id, ...purchaseOrder };
};

const convertRequisitionToPO = async (tenantId, reqId, vendorId, createdBy) => {
  const req = await getRequisition(tenantId, reqId);

  if (!req) throw new Error('Requisition not found');
  if (req.status !== RequisitionStatus.APPROVED) {
    throw new Error('Only approved requisitions can be converted to PO');
  }

  // Get vendor for default pricing (if any)
  const vendor = await getVendor(tenantId, vendorId);
  if (!vendor) throw new Error('Vendor not found');

  // Convert requisition lines to PO lines
  const lineItems = req.lineItems.map(line => ({
    itemId: line.itemId,
    description: line.description,
    qtyOrdered: line.qty,
    uom: line.uom,
    unitPrice: line.estimatedUnitPrice || 0,
    glAccountId: null,
  }));

  return createPurchaseOrder(tenantId, {
    siteId: req.siteId,
    vendorId,
    sourceRequisitionId: reqId,
    lineItems,
    expectedDate: req.neededByDate,
    notes: req.notes,
  }, createdBy);
};

const sendPurchaseOrder = async (tenantId, poId, userId) => {
  const poRef = db.collection('tenants').doc(tenantId).collection('purchaseOrders').doc(poId);

  return db.runTransaction(async (transaction) => {
    const poDoc = await transaction.get(poRef);
    if (!poDoc.exists) throw new Error('Purchase order not found');

    const po = poDoc.data();
    validateTransition(PurchaseOrderTransitions, po.status, PurchaseOrderStatus.SENT);

    transaction.update(poRef, {
      status: PurchaseOrderStatus.SENT,
      sentAt: FieldValue.serverTimestamp(),
      sentByUserId: userId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: poId, status: PurchaseOrderStatus.SENT };
  });
};

const getPurchaseOrders = async (tenantId, options = {}) => {
  const { siteId, vendorId, status, limit = 50 } = options;

  let query = db.collection('tenants').doc(tenantId).collection('purchaseOrders');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (vendorId) {
    query = query.where('vendorId', '==', vendorId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  query = query.orderBy('createdAt', 'desc').limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getPurchaseOrder = async (tenantId, poId) => {
  const doc = await db.collection('tenants').doc(tenantId).collection('purchaseOrders').doc(poId).get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
};

// ============================================
// RECEIPT OPERATIONS
// ============================================

const createReceipt = async (tenantId, receiptData, userId, userRoles) => {
  if (!canReceive(userRoles)) {
    throw new Error('Insufficient permissions to receive goods');
  }

  // Validate PO exists and is receivable
  const po = await getPurchaseOrder(tenantId, receiptData.poId);
  if (!po) throw new Error('Purchase order not found');

  const receivableStatuses = [
    PurchaseOrderStatus.SENT,
    PurchaseOrderStatus.OPEN,
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
  ];

  if (!receivableStatuses.includes(po.status)) {
    throw new Error(`Cannot receive against PO in status: ${po.status}`);
  }

  const rcvNum = await getNextSequence(tenantId, 'receipts');
  const receiptRef = db.collection('tenants').doc(tenantId).collection('receipts').doc();

  // Process receipt lines and validate quantities
  const lines = [];
  let totalCost = 0;

  for (const line of receiptData.lines) {
    const poLineNumber = parseInt(line.poLineNumber, 10);
    const poLine = po.lineItems.find(pl => pl.lineNumber === poLineNumber);
    if (!poLine) {
      throw new Error(`PO line ${line.poLineNumber} not found`);
    }

    // Parse numeric values to ensure proper type for posting engine
    const qtyReceived = parseFloat(line.qtyReceived);
    if (isNaN(qtyReceived) || qtyReceived <= 0) {
      throw new Error(`Invalid quantity received: ${line.qtyReceived}`);
    }

    const remainingQty = poLine.qtyOrdered - poLine.qtyReceived - poLine.qtyCancelled;
    if (qtyReceived > remainingQty) {
      throw new Error(`Cannot receive ${qtyReceived} for line ${poLineNumber}. Only ${remainingQty} remaining.`);
    }

    const unitCost = parseFloat(line.unitCost ?? poLine.unitPrice);
    const lineTotalCost = qtyReceived * unitCost;
    totalCost += lineTotalCost;

    lines.push({
      poLineNumber,
      itemId: poLine.itemId,
      description: poLine.description,
      qtyReceived,
      uom: poLine.uom,
      unitCost,
      totalCost: lineTotalCost,
      lotNumber: line.lotNumber || null,
      expirationDate: line.expirationDate || null,
      storageLocation: line.storageLocation || null,
    });
  }

  const receipt = {
    receiptNumber: formatSequence('RCV', rcvNum),
    siteId: po.siteId,
    poId: receiptData.poId,
    vendorId: po.vendorId,
    status: ReceiptStatus.DRAFT,
    receivedAt: receiptData.receivedAt || FieldValue.serverTimestamp(),
    receivedByUserId: userId,
    packingSlipNumber: receiptData.packingSlipNumber || null,
    notes: receiptData.notes || null,
    lines,
    totals: {
      totalCost,
      lineCount: lines.length,
    },
    eventId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await receiptRef.set(receipt);

  return { id: receiptRef.id, ...receipt };
};

const postReceipt = async (tenantId, receiptId, userId) => {
  const receiptRef = db.collection('tenants').doc(tenantId).collection('receipts').doc(receiptId);

  const result = await db.runTransaction(async (transaction) => {
    const receiptDoc = await transaction.get(receiptRef);
    if (!receiptDoc.exists) throw new Error('Receipt not found');

    const receipt = receiptDoc.data();

    if (receipt.status !== ReceiptStatus.DRAFT) {
      throw new Error('Receipt is already posted');
    }

    // Get PO for updates
    const poRef = db.collection('tenants').doc(tenantId).collection('purchaseOrders').doc(receipt.poId);
    const poDoc = await transaction.get(poRef);
    if (!poDoc.exists) throw new Error('Purchase order not found');

    const po = poDoc.data();

    // Update PO line quantities
    const updatedLineItems = [...po.lineItems];
    for (const rcvLine of receipt.lines) {
      const poLineIdx = updatedLineItems.findIndex(pl => pl.lineNumber === rcvLine.poLineNumber);
      if (poLineIdx >= 0) {
        updatedLineItems[poLineIdx] = {
          ...updatedLineItems[poLineIdx],
          qtyReceived: updatedLineItems[poLineIdx].qtyReceived + rcvLine.qtyReceived,
        };
      }
    }

    // Determine new PO status
    const totalOrdered = updatedLineItems.reduce((sum, l) => sum + l.qtyOrdered, 0);
    const totalReceived = updatedLineItems.reduce((sum, l) => sum + l.qtyReceived, 0);
    const totalCancelled = updatedLineItems.reduce((sum, l) => sum + l.qtyCancelled, 0);

    let newPoStatus = po.status;
    if (totalReceived >= totalOrdered - totalCancelled) {
      newPoStatus = PurchaseOrderStatus.RECEIVED;
    } else if (totalReceived > 0) {
      newPoStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED;
    }

    // Create the posting event
    const eventRef = db.collection('tenants').doc(tenantId).collection('events').doc();
    const idempotencyKey = `receipt-${receiptId}-post`;

    const event = {
      type: P2PEventType.RECEIPT_POSTED,
      occurredAt: FieldValue.serverTimestamp(),
      sourceType: 'receipt',
      sourceId: receiptId,
      siteId: receipt.siteId,
      payload: {
        receiptNumber: receipt.receiptNumber,
        poId: receipt.poId,
        vendorId: receipt.vendorId,
        lines: receipt.lines,
        totals: receipt.totals,
      },
      status: 'PENDING',
      idempotencyKey,
      postingResults: null,
      error: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: userId,
    };

    transaction.set(eventRef, event);

    // Update receipt
    transaction.update(receiptRef, {
      status: ReceiptStatus.POSTED,
      eventId: eventRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update PO
    transaction.update(poRef, {
      lineItems: updatedLineItems,
      status: newPoStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      receiptId,
      eventId: eventRef.id,
      poStatus: newPoStatus,
    };
  });

  // Process the event to update inventory and create ledger entries
  let processingResult = null;
  let processingError = null;
  try {
    const postingEngine = require('./p2p-posting-engine');
    processingResult = await postingEngine.processEvent(tenantId, result.eventId);
  } catch (processError) {
    console.error('Failed to process receipt event:', processError);
    processingError = processError.message;
    // Mark event as failed so it can be retried
    try {
      await db.collection('tenants').doc(tenantId).collection('events').doc(result.eventId).update({
        status: 'FAILED',
        error: processError.message,
        failedAt: FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error('Failed to update event status:', updateError);
    }
  }

  return {
    ...result,
    processingResult,
    processingError,
  };
};

const getReceipts = async (tenantId, options = {}) => {
  const { siteId, poId, status, limit = 50 } = options;

  let query = db.collection('tenants').doc(tenantId).collection('receipts');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (poId) {
    query = query.where('poId', '==', poId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  query = query.orderBy('createdAt', 'desc').limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getReceipt = async (tenantId, receiptId) => {
  const doc = await db.collection('tenants').doc(tenantId).collection('receipts').doc(receiptId).get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
};

// ============================================
// VENDOR BILL OPERATIONS
// ============================================

const createVendorBill = async (tenantId, billData, createdBy) => {
  const billNum = await getNextSequence(tenantId, 'vendorBills');
  const billRef = db.collection('tenants').doc(tenantId).collection('vendorBills').doc();

  // Process lines
  const lines = (billData.lines || []).map((line, idx) => ({
    lineNumber: idx + 1,
    description: line.description || '',
    itemId: line.itemId || null,
    poLineNumber: line.poLineNumber || null,
    qty: line.qty || null,
    uom: line.uom || null,
    unitPrice: line.unitPrice || null,
    amount: line.amount,
    glAccountId: line.glAccountId,
  }));

  const subtotal = lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const tax = billData.tax || 0;
  const total = subtotal + tax;

  const bill = {
    billNumber: billData.billNumber, // Vendor's invoice number
    internalNumber: formatSequence('BILL', billNum),
    siteId: billData.siteId,
    vendorId: billData.vendorId,
    status: VendorBillStatus.DRAFT,
    billDate: billData.billDate || FieldValue.serverTimestamp(),
    dueDate: billData.dueDate,
    attachments: billData.attachments || [],
    match: {
      poId: billData.poId || null,
      receiptIds: billData.receiptIds || [],
      matchStatus: billData.poId ? BillMatchStatus.PARTIAL : BillMatchStatus.UNMATCHED,
      matchedAt: null,
      matchedByUserId: null,
      varianceAmount: 0,
      varianceNotes: null,
    },
    lines,
    totals: {
      subtotal,
      tax,
      total,
      amountPaid: 0,
      amountDue: total,
    },
    approval: {
      approvedByUserId: null,
      approvedAt: null,
    },
    payments: [],
    varianceEventId: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await billRef.set(bill);

  // Create event
  await createP2PEvent(tenantId, {
    type: P2PEventType.BILL_CREATED,
    sourceType: 'vendorBill',
    sourceId: billRef.id,
    siteId: billData.siteId,
    payload: { billNumber: billData.billNumber, internalNumber: bill.internalNumber, vendorId: billData.vendorId },
  }, createdBy);

  return { id: billRef.id, ...bill };
};

const matchBillToPO = async (tenantId, billId, poId, receiptIds, userId) => {
  const billRef = db.collection('tenants').doc(tenantId).collection('vendorBills').doc(billId);

  return db.runTransaction(async (transaction) => {
    const billDoc = await transaction.get(billRef);
    if (!billDoc.exists) throw new Error('Bill not found');

    const bill = billDoc.data();

    if (bill.status !== VendorBillStatus.DRAFT) {
      throw new Error('Can only match bills in DRAFT status');
    }

    // Get PO and receipts to calculate variance
    const poRef = db.collection('tenants').doc(tenantId).collection('purchaseOrders').doc(poId);
    const poDoc = await transaction.get(poRef);
    if (!poDoc.exists) throw new Error('Purchase order not found');

    const po = poDoc.data();

    // Calculate total received cost from receipts
    let receivedTotal = 0;
    for (const receiptId of receiptIds) {
      const receiptRef = db.collection('tenants').doc(tenantId).collection('receipts').doc(receiptId);
      const receiptDoc = await transaction.get(receiptRef);
      if (receiptDoc.exists) {
        receivedTotal += receiptDoc.data().totals.totalCost;
      }
    }

    // Calculate variance
    const varianceAmount = bill.totals.total - receivedTotal;
    const matchStatus = Math.abs(varianceAmount) < 0.01
      ? BillMatchStatus.MATCHED
      : BillMatchStatus.DISCREPANCY;

    transaction.update(billRef, {
      'match.poId': poId,
      'match.receiptIds': receiptIds,
      'match.matchStatus': matchStatus,
      'match.matchedAt': FieldValue.serverTimestamp(),
      'match.matchedByUserId': userId,
      'match.varianceAmount': varianceAmount,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      billId,
      matchStatus,
      varianceAmount,
      receivedTotal,
      billTotal: bill.totals.total,
    };
  });
};

const approveBill = async (tenantId, billId, userId, userRoles) => {
  if (!canApproveBill(userRoles)) {
    throw new Error('Insufficient permissions to approve bills');
  }

  const billRef = db.collection('tenants').doc(tenantId).collection('vendorBills').doc(billId);

  return db.runTransaction(async (transaction) => {
    const billDoc = await transaction.get(billRef);
    if (!billDoc.exists) throw new Error('Bill not found');

    const bill = billDoc.data();
    validateTransition(VendorBillTransitions, bill.status, VendorBillStatus.APPROVED);

    transaction.update(billRef, {
      status: VendorBillStatus.APPROVED,
      'approval.approvedByUserId': userId,
      'approval.approvedAt': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // If there's a variance, create variance posting event
    if (bill.match.varianceAmount !== 0 && bill.match.matchStatus === BillMatchStatus.DISCREPANCY) {
      const eventRef = db.collection('tenants').doc(tenantId).collection('events').doc();
      const event = {
        type: P2PEventType.BILL_VARIANCE_POSTED,
        occurredAt: FieldValue.serverTimestamp(),
        sourceType: 'vendorBill',
        sourceId: billId,
        siteId: bill.siteId,
        payload: {
          billNumber: bill.billNumber,
          varianceAmount: bill.match.varianceAmount,
          vendorId: bill.vendorId,
        },
        status: 'PENDING',
        idempotencyKey: `bill-${billId}-variance`,
        postingResults: null,
        error: null,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: userId,
      };

      transaction.set(eventRef, event);
      transaction.update(billRef, { varianceEventId: eventRef.id });
    }

    return { billId, status: VendorBillStatus.APPROVED };
  });
};

const getVendorBills = async (tenantId, options = {}) => {
  const { siteId, vendorId, status, unpaidOnly = false, limit = 50 } = options;

  let query = db.collection('tenants').doc(tenantId).collection('vendorBills');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (vendorId) {
    query = query.where('vendorId', '==', vendorId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  if (unpaidOnly) {
    query = query.where('status', 'in', [VendorBillStatus.APPROVED, VendorBillStatus.PARTIALLY_PAID]);
  }

  query = query.orderBy('dueDate', 'asc').limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getVendorBill = async (tenantId, billId) => {
  const doc = await db.collection('tenants').doc(tenantId).collection('vendorBills').doc(billId).get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
};

// ============================================
// PAYMENT OPERATIONS
// ============================================

const createPayment = async (tenantId, paymentData, userId, userRoles) => {
  if (!canMakePayment(userRoles)) {
    throw new Error('Insufficient permissions to create payments');
  }

  // Validate allocations
  if (!paymentData.allocations || paymentData.allocations.length === 0) {
    throw new Error('Payment must be allocated to at least one bill');
  }

  const totalAllocated = paymentData.allocations.reduce((sum, a) => sum + a.amountApplied, 0);
  if (Math.abs(totalAllocated - paymentData.amount) > 0.01) {
    throw new Error('Payment amount must equal total allocations');
  }

  const payNum = await getNextSequence(tenantId, 'payments');
  const paymentRef = db.collection('tenants').doc(tenantId).collection('payments').doc();

  // Get first bill to determine vendor
  const firstBill = await getVendorBill(tenantId, paymentData.allocations[0].billId);
  if (!firstBill) throw new Error('Bill not found');

  const payment = {
    paymentNumber: paymentData.referenceNumber || formatSequence('PAY', payNum),
    siteId: paymentData.siteId || firstBill.siteId,
    vendorId: firstBill.vendorId,
    status: PaymentStatus.DRAFT,
    method: paymentData.method,
    amount: paymentData.amount,
    paidAt: paymentData.paidAt || FieldValue.serverTimestamp(),
    referenceNumber: paymentData.referenceNumber || null,
    memo: paymentData.memo || null,
    allocations: paymentData.allocations,
    bankAccountId: paymentData.bankAccountId,
    eventId: null,
    clearedAt: null,
    clearedByUserId: null,
    voidedAt: null,
    voidedByUserId: null,
    voidReason: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: userId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await paymentRef.set(payment);

  return { id: paymentRef.id, ...payment };
};

const sendPayment = async (tenantId, paymentId, userId) => {
  const paymentRef = db.collection('tenants').doc(tenantId).collection('payments').doc(paymentId);

  return db.runTransaction(async (transaction) => {
    const paymentDoc = await transaction.get(paymentRef);
    if (!paymentDoc.exists) throw new Error('Payment not found');

    const payment = paymentDoc.data();
    validateTransition(PaymentTransitions, payment.status, PaymentStatus.SENT);

    // Create the posting event
    const eventRef = db.collection('tenants').doc(tenantId).collection('events').doc();
    const idempotencyKey = `payment-${paymentId}-post`;

    const event = {
      type: P2PEventType.PAYMENT_SENT,
      occurredAt: FieldValue.serverTimestamp(),
      sourceType: 'payment',
      sourceId: paymentId,
      siteId: payment.siteId,
      payload: {
        paymentNumber: payment.paymentNumber,
        vendorId: payment.vendorId,
        amount: payment.amount,
        method: payment.method,
        allocations: payment.allocations,
        bankAccountId: payment.bankAccountId,
      },
      status: 'PENDING',
      idempotencyKey,
      postingResults: null,
      error: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: userId,
    };

    transaction.set(eventRef, event);

    // Update payment
    transaction.update(paymentRef, {
      status: PaymentStatus.SENT,
      eventId: eventRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update each allocated bill
    for (const alloc of payment.allocations) {
      const billRef = db.collection('tenants').doc(tenantId).collection('vendorBills').doc(alloc.billId);
      const billDoc = await transaction.get(billRef);

      if (billDoc.exists) {
        const bill = billDoc.data();
        const newAmountPaid = (bill.totals.amountPaid || 0) + alloc.amountApplied;
        const newAmountDue = bill.totals.total - newAmountPaid;

        let newStatus = bill.status;
        if (newAmountDue <= 0.01) {
          newStatus = VendorBillStatus.PAID;
        } else if (newAmountPaid > 0) {
          newStatus = VendorBillStatus.PARTIALLY_PAID;
        }

        transaction.update(billRef, {
          status: newStatus,
          'totals.amountPaid': newAmountPaid,
          'totals.amountDue': Math.max(0, newAmountDue),
          payments: FieldValue.arrayUnion({
            paymentId,
            amount: alloc.amountApplied,
            paidAt: new Date(),
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return { paymentId, eventId: eventRef.id, status: PaymentStatus.SENT };
  });
};

const clearPayment = async (tenantId, paymentId, userId) => {
  const paymentRef = db.collection('tenants').doc(tenantId).collection('payments').doc(paymentId);

  return db.runTransaction(async (transaction) => {
    const paymentDoc = await transaction.get(paymentRef);
    if (!paymentDoc.exists) throw new Error('Payment not found');

    const payment = paymentDoc.data();
    validateTransition(PaymentTransitions, payment.status, PaymentStatus.CLEARED);

    transaction.update(paymentRef, {
      status: PaymentStatus.CLEARED,
      clearedAt: FieldValue.serverTimestamp(),
      clearedByUserId: userId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { paymentId, status: PaymentStatus.CLEARED };
  });
};

const getPayments = async (tenantId, options = {}) => {
  const { siteId, vendorId, status, limit = 50 } = options;

  let query = db.collection('tenants').doc(tenantId).collection('payments');

  if (siteId) {
    query = query.where('siteId', '==', siteId);
  }

  if (vendorId) {
    query = query.where('vendorId', '==', vendorId);
  }

  if (status) {
    query = query.where('status', '==', status);
  }

  query = query.orderBy('createdAt', 'desc').limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const getPayment = async (tenantId, paymentId) => {
  const doc = await db.collection('tenants').doc(tenantId).collection('payments').doc(paymentId).get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
};

// ============================================
// EVENT HELPERS
// ============================================

const createP2PEvent = async (tenantId, eventData, createdBy) => {
  const eventRef = db.collection('tenants').doc(tenantId).collection('events').doc();

  const event = {
    type: eventData.type,
    occurredAt: FieldValue.serverTimestamp(),
    sourceType: eventData.sourceType,
    sourceId: eventData.sourceId,
    siteId: eventData.siteId,
    payload: eventData.payload,
    status: eventData.requiresPosting ? 'PENDING' : 'LOGGED', // Non-posting events are just logged
    idempotencyKey: eventData.idempotencyKey || `${eventData.type}-${eventData.sourceId}`,
    postingResults: null,
    error: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy,
  };

  await eventRef.set(event);

  return { id: eventRef.id, ...event };
};

// ============================================
// AP AGING REPORT
// ============================================

const getAPAging = async (tenantId, asOfDate = new Date()) => {
  const bills = await getVendorBills(tenantId, { unpaidOnly: true, limit: 500 });

  const aging = {
    current: 0,      // 0-30 days
    days31to60: 0,   // 31-60 days
    days61to90: 0,   // 61-90 days
    over90: 0,       // 90+ days
    total: 0,
    byVendor: {},
  };

  for (const bill of bills) {
    const dueDate = bill.dueDate?.toDate ? bill.dueDate.toDate() : new Date(bill.dueDate);
    const daysOverdue = Math.floor((asOfDate - dueDate) / (1000 * 60 * 60 * 24));
    const amountDue = bill.totals.amountDue || 0;

    if (daysOverdue <= 0) {
      aging.current += amountDue;
    } else if (daysOverdue <= 30) {
      aging.current += amountDue;
    } else if (daysOverdue <= 60) {
      aging.days31to60 += amountDue;
    } else if (daysOverdue <= 90) {
      aging.days61to90 += amountDue;
    } else {
      aging.over90 += amountDue;
    }

    aging.total += amountDue;

    // By vendor
    if (!aging.byVendor[bill.vendorId]) {
      aging.byVendor[bill.vendorId] = {
        current: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        total: 0,
      };
    }

    const vendorAging = aging.byVendor[bill.vendorId];
    if (daysOverdue <= 30) {
      vendorAging.current += amountDue;
    } else if (daysOverdue <= 60) {
      vendorAging.days31to60 += amountDue;
    } else if (daysOverdue <= 90) {
      vendorAging.days61to90 += amountDue;
    } else {
      vendorAging.over90 += amountDue;
    }
    vendorAging.total += amountDue;
  }

  return aging;
};

// ============================================
// AUTO-REORDER CHECK
// ============================================

const checkReorderPoints = async (tenantId, siteId) => {
  // Get all inventory items with reorder points set
  const itemsSnapshot = await db.collection('tenants').doc(tenantId)
    .collection('inventoryItems')
    .where('reorderPoint', '>', 0)
    .where('active', '==', true)
    .get();

  const requisitionsToCreate = [];

  for (const itemDoc of itemsSnapshot.docs) {
    const item = { id: itemDoc.id, ...itemDoc.data() };

    // Get current balance for this site
    const balanceDoc = await db.collection('tenants').doc(tenantId)
      .collection('sites').doc(siteId)
      .collection('inventory').doc(item.id)
      .get();

    const balance = balanceDoc.exists ? balanceDoc.data().qtyOnHand || 0 : 0;

    if (balance <= item.reorderPoint) {
      // Check if there's already a pending requisition or open PO for this item
      const existingReq = await db.collection('tenants').doc(tenantId)
        .collection('purchaseRequisitions')
        .where('siteId', '==', siteId)
        .where('status', 'in', [RequisitionStatus.DRAFT, RequisitionStatus.SUBMITTED, RequisitionStatus.APPROVED])
        .get();

      const hasExistingReq = existingReq.docs.some(doc => {
        const req = doc.data();
        return req.lineItems.some(line => line.itemId === item.id);
      });

      if (!hasExistingReq) {
        requisitionsToCreate.push({
          siteId,
          source: RequisitionSource.AUTO_REORDER,
          notes: `Auto-generated: ${item.name} below reorder point (${balance} on hand, reorder at ${item.reorderPoint})`,
          lineItems: [{
            itemId: item.id,
            description: item.name,
            qty: item.reorderQty || (item.reorderPoint * 2),
            uom: item.unit || 'units',
            estimatedUnitPrice: item.defaultCostPerUnit || null,
            preferredVendorId: item.preferredVendorId || null,
          }],
        });
      }
    }
  }

  return requisitionsToCreate;
};

// ============================================
// REPROCESSING FAILED EVENTS
// ============================================

/**
 * Reprocess failed receipt events
 * Fixes numeric type issues and retries the posting
 */
const reprocessFailedReceiptEvents = async (tenantId) => {
  const postingEngine = require('./p2p-posting-engine');

  // Find all FAILED events of type RECEIPT_POSTED
  const eventsSnapshot = await db.collection('tenants').doc(tenantId)
    .collection('events')
    .where('type', '==', P2PEventType.RECEIPT_POSTED)
    .where('status', '==', 'FAILED')
    .get();

  const results = {
    found: eventsSnapshot.size,
    reprocessed: 0,
    succeeded: 0,
    failed: 0,
    details: [],
  };

  console.log(`[Reprocess] Found ${eventsSnapshot.size} failed receipt events`);

  for (const eventDoc of eventsSnapshot.docs) {
    const eventId = eventDoc.id;
    const event = eventDoc.data();

    try {
      // Fix numeric types in the payload
      const fixedLines = event.payload.lines.map(line => ({
        ...line,
        qtyReceived: parseFloat(line.qtyReceived),
        unitCost: parseFloat(line.unitCost),
        totalCost: parseFloat(line.totalCost),
        poLineNumber: parseInt(line.poLineNumber, 10),
      }));

      const fixedPayload = {
        ...event.payload,
        lines: fixedLines,
        totals: {
          ...event.payload.totals,
          totalCost: parseFloat(event.payload.totals.totalCost),
        },
      };

      // Update the event with fixed payload and reset to PENDING
      await db.collection('tenants').doc(tenantId)
        .collection('events').doc(eventId)
        .update({
          payload: fixedPayload,
          status: 'PENDING',
          error: null,
          failedAt: null,
          retryCount: (event.retryCount || 0) + 1,
          lastRetryAt: FieldValue.serverTimestamp(),
        });

      results.reprocessed++;

      // Now process the event
      const processingResult = await postingEngine.processEvent(tenantId, eventId);

      results.succeeded++;
      results.details.push({
        eventId,
        receiptId: event.sourceId,
        status: 'SUCCESS',
        result: processingResult,
      });

      console.log(`[Reprocess] Successfully reprocessed event ${eventId}`);
    } catch (error) {
      results.failed++;
      results.details.push({
        eventId,
        receiptId: event.sourceId,
        status: 'FAILED',
        error: error.message,
      });

      console.error(`[Reprocess] Failed to reprocess event ${eventId}:`, error.message);

      // Mark as failed again
      try {
        await db.collection('tenants').doc(tenantId)
          .collection('events').doc(eventId)
          .update({
            status: 'FAILED',
            error: error.message,
            failedAt: FieldValue.serverTimestamp(),
          });
      } catch (updateError) {
        console.error(`[Reprocess] Failed to update event status:`, updateError);
      }
    }
  }

  return results;
};

module.exports = {
  // Vendors
  createVendor,
  getVendors,
  getVendor,

  // Requisitions
  createRequisition,
  submitRequisition,
  approveRequisition,
  rejectRequisition,
  getRequisitions,
  getRequisition,

  // Purchase Orders
  createPurchaseOrder,
  convertRequisitionToPO,
  sendPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,

  // Receipts
  createReceipt,
  postReceipt,
  getReceipts,
  getReceipt,

  // Vendor Bills
  createVendorBill,
  matchBillToPO,
  approveBill,
  getVendorBills,
  getVendorBill,

  // Payments
  createPayment,
  sendPayment,
  clearPayment,
  getPayments,
  getPayment,

  // Reports
  getAPAging,

  // Reprocessing
  reprocessFailedReceiptEvents,

  // Auto-reorder
  checkReorderPoints,

  // Enums (re-export for convenience)
  RequisitionStatus,
  PurchaseOrderStatus,
  ReceiptStatus,
  VendorBillStatus,
  BillMatchStatus,
  PaymentStatus,
  PaymentMethod,
  P2PEventType,
  RequisitionSource,
};
