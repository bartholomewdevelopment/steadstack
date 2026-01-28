/**
 * API Client for SteadStack
 *
 * Handles all HTTP requests to the backend API with authentication.
 */

import { auth } from '../config/firebase';

// In production, use relative URL which works with Firebase Hosting rewrites
// In development, use the local backend server
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

class ApiClient {
  async getAuthHeaders() {
    const user = auth.currentUser;
    if (!user) {
      return {};
    }
    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async request(endpoint, options = {}) {
    const authHeaders = await this.getAuthHeaders();

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));

      // Handle plan limit errors - emit event for UpgradeModal
      if (errorData.code === 'PLAN_LIMIT_EXCEEDED' || errorData.code === 'FEATURE_NOT_AVAILABLE') {
        window.dispatchEvent(new CustomEvent('plan-limit-error', { detail: errorData }));
      }

      // Handle validation errors (array of errors from express-validator)
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const messages = errorData.errors.map((e) => e.msg || e.message).join(', ');
        throw new Error(messages || 'Validation failed');
      }
      throw new Error(errorData.error || errorData.message || 'Request failed');
    }

    return response.json();
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Events API
export const eventsApi = {
  list: (params) => api.get('/events', params),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.patch(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  post: (id) => api.post(`/events/${id}/post`),
  void: (id) => api.post(`/events/${id}/void`),
  getTypes: () => api.get('/events/meta/types'),
};

// Inventory API
export const inventoryApi = {
  // Inventory items (master catalog)
  list: (params) => api.get('/inventory/items', params),
  get: (id) => api.get(`/inventory/items/${id}`),
  create: (data) => api.post('/inventory/items', data),
  update: (id, data) => api.patch(`/inventory/items/${id}`, data),
  delete: (id) => api.delete(`/inventory/items/${id}`),

  // Site inventory (balances)
  getSiteInventory: (siteId, params) => api.get(`/inventory/sites/${siteId}`, params),
  getSiteItemBalance: (siteId, itemId) => api.get(`/inventory/sites/${siteId}/items/${itemId}`),

  // Inventory movements
  getMovements: (params) => api.get('/inventory/movements', params),

  // Inventory operations
  adjust: (data) => api.post('/inventory/adjust', data),
  transfer: (data) => api.post('/inventory/transfer', data),
  receive: (data) => api.post('/inventory/receive', data),

  // Purchase requisitions
  getRequisitions: (params) => api.get('/inventory/requisitions', params),
  approveRequisition: (id) => api.post(`/inventory/requisitions/${id}/approve`),
  rejectRequisition: (id, reason) => api.post(`/inventory/requisitions/${id}/reject`, { reason }),

  // Totals/stats
  getTotals: () => api.get('/inventory/totals'),

  // Metadata
  getCategories: () => api.get('/inventory/categories'),
  getMovementTypes: () => api.get('/inventory/movement-types'),
  getUnits: () => api.get('/inventory/units'),
};

// Sites API
export const sitesApi = {
  list: () => api.get('/sites'),
  get: (id) => api.get(`/sites/${id}`),
  create: (data) => api.post('/sites', data),
  update: (id, data) => api.patch(`/sites/${id}`, data),
  delete: (id) => api.delete(`/sites/${id}`),
  // Boundary operations
  updateBoundary: (id, boundaryData) => api.patch(`/sites/${id}`, boundaryData),
};

// Land Tracts API
export const landTractsApi = {
  list: (params) => api.get('/land-tracts', params),
  get: (id) => api.get(`/land-tracts/${id}`),
  create: (data) => api.post('/land-tracts', data),
  update: (id, data) => api.patch(`/land-tracts/${id}`, data),
  updateStatus: (id, data) => api.post(`/land-tracts/${id}/status`, data),
  getStats: (params) => api.get('/land-tracts/stats', params),
};

// Structures API
export const structuresApi = {
  list: (params) => api.get('/structures', params),
  get: (id) => api.get(`/structures/${id}`),
  create: (data) => api.post('/structures', data),
  update: (id, data) => api.patch(`/structures/${id}`, data),
  delete: (id) => api.delete(`/structures/${id}`),
  // Areas nested under structures
  listAreas: (structureId, params) => api.get(`/structures/${structureId}/areas`, params),
  createArea: (structureId, data) => api.post(`/structures/${structureId}/areas`, data),
};

// Areas API (standalone endpoints)
export const areasApi = {
  list: (params) => api.get('/areas', params),
  get: (id) => api.get(`/areas/${id}`),
  update: (id, data) => api.patch(`/areas/${id}`, data),
  delete: (id) => api.delete(`/areas/${id}`),
};

// Bins API
export const binsApi = {
  list: (params) => api.get('/bins', params),
  get: (id) => api.get(`/bins/${id}`),
  update: (id, data) => api.patch(`/bins/${id}`, data),
  delete: (id) => api.delete(`/bins/${id}`),
  getTypes: () => api.get('/bins/types'),
  checkCode: (params) => api.get('/bins/check-code', params),
  // Bins nested under structures
  listByStructure: (structureId, params) => api.get(`/structures/${structureId}/bins`, params),
  create: (structureId, data) => api.post(`/structures/${structureId}/bins`, data),
};

// Animals API
export const animalsApi = {
  // Animals
  list: (params) => api.get('/animals', params),
  get: (id) => api.get(`/animals/${id}`),
  create: (data) => api.post('/animals', data),
  update: (id, data) => api.patch(`/animals/${id}`, data),
  delete: (id) => api.delete(`/animals/${id}`),
  updateStatus: (id, data) => api.post(`/animals/${id}/status`, data),
  bulkMove: (data) => api.post('/animals/bulk/move', data),
  getStats: (params) => api.get('/animals/stats', params),

  // Animal Groups
  listGroups: (params) => api.get('/animals/groups', params),
  getGroup: (id) => api.get(`/animals/groups/${id}`),
  createGroup: (data) => api.post('/animals/groups', data),
  updateGroup: (id, data) => api.patch(`/animals/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/animals/groups/${id}`),

  // Livestock events
  feed: (data) => api.post('/animals/feed', data),
  sell: (data) => api.post('/animals/sell', data),

  // Metadata
  getSpecies: () => api.get('/animals/meta/species'),
  getGroupTypes: () => api.get('/animals/meta/group-types'),
  getStatuses: () => api.get('/animals/meta/statuses'),
};

// Tasks API
export const tasksApi = {
  // Generic list (alias for listOccurrences for Dashboard compatibility)
  list: (params) => api.get('/tasks/occurrences', params),

  // Task Templates
  listTemplates: (params) => api.get('/tasks/templates', params),
  getTemplate: (id) => api.get(`/tasks/templates/${id}`),
  createTemplate: (data) => api.post('/tasks/templates', data),
  updateTemplate: (id, data) => api.patch(`/tasks/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/tasks/templates/${id}`),

  // Runlists
  listRunlists: (params) => api.get('/tasks/runlists', params),
  getRunlist: (id) => api.get(`/tasks/runlists/${id}`),
  createRunlist: (data) => api.post('/tasks/runlists', data),
  updateRunlist: (id, data) => api.patch(`/tasks/runlists/${id}`, data),
  activateRunlist: (id) => api.post(`/tasks/runlists/${id}/activate`),
  pauseRunlist: (id) => api.post(`/tasks/runlists/${id}/pause`),
  archiveRunlist: (id) => api.post(`/tasks/runlists/${id}/archive`),
  addTemplatesToRunlist: (id, templateIds) =>
    api.post(`/tasks/runlists/${id}/templates`, { templateIds }),
  removeTemplatesFromRunlist: (id, templateIds) =>
    api.delete(`/tasks/runlists/${id}/templates`, { templateIds }),

  // Task Occurrences
  listOccurrences: (params) => api.get('/tasks/occurrences', params),
  getMyTasks: () => api.get('/tasks/occurrences/my-tasks'),
  getTodaysTasks: () => api.get('/tasks/occurrences/today'),
  getOccurrence: (id) => api.get(`/tasks/occurrences/${id}`),
  createOccurrence: (data) => api.post('/tasks/occurrences', data),
  startOccurrence: (id) => api.post(`/tasks/occurrences/${id}/start`),
  completeOccurrence: (id, data) => api.post(`/tasks/occurrences/${id}/complete`, data),
  skipOccurrence: (id, reason) => api.post(`/tasks/occurrences/${id}/skip`, { reason }),
  cancelOccurrence: (id, reason) => api.post(`/tasks/occurrences/${id}/cancel`, { reason }),
  reassignOccurrence: (id, assigneeId) =>
    api.post(`/tasks/occurrences/${id}/reassign`, { assigneeId }),
  reorderOccurrences: (scheduledDate, orderedTasks) =>
    api.post('/tasks/occurrences/reorder', { scheduledDate, orderedTasks }),

  // Task generation
  generateTasks: (targetDate) => api.post('/tasks/generate', { targetDate }),

  // Statistics
  getStats: (params) => api.get('/tasks/stats', params),

  // Metadata
  getCategories: () => api.get('/tasks/categories'),
  getPriorities: () => api.get('/tasks/priorities'),
  getRecurrencePatterns: () => api.get('/tasks/recurrence-patterns'),
  getStatuses: () => api.get('/tasks/statuses'),
};

// Accounting API
export const accountingApi = {
  // Chart of Accounts
  getAccounts: (params) => api.get('/accounting/accounts', params),
  getAccount: (id) => api.get(`/accounting/accounts/${id}`),
  createAccount: (data) => api.post('/accounting/accounts', data),
  updateAccount: (id, data) => api.put(`/accounting/accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/accounting/accounts/${id}`),
  getAccountBalance: (id, params) => api.get(`/accounting/accounts/${id}/balance`, params),
  importAccounts: (accounts, skipDuplicates = true) => api.post('/accounting/accounts/import', { accounts, skipDuplicates }),

  // Transactions / Inquiry
  getTransactions: (params) => api.get('/accounting/transactions', params),

  // Customers (A/R)
  getCustomers: (params) => api.get('/accounting/customers', params),
  getCustomer: (id) => api.get(`/accounting/customers/${id}`),
  createCustomer: (data) => api.post('/accounting/customers', data),
  updateCustomer: (id, data) => api.put(`/accounting/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/accounting/customers/${id}`),

  // Invoices
  getInvoices: (params) => api.get('/accounting/invoices', params),
  getInvoice: (id) => api.get(`/accounting/invoices/${id}`),
  createInvoice: (data) => api.post('/accounting/invoices', data),
  updateInvoice: (id, data) => api.put(`/accounting/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/accounting/invoices/${id}`),
  sendInvoice: (id) => api.post(`/accounting/invoices/${id}/send`),

  // A/R Aging
  getARaging: () => api.get('/accounting/ar/aging'),

  // Vendors (A/P)
  getVendors: (params) => api.get('/accounting/vendors', params),
  getVendor: (id) => api.get(`/accounting/vendors/${id}`),
  createVendor: (data) => api.post('/accounting/vendors', data),
  updateVendor: (id, data) => api.put(`/accounting/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/accounting/vendors/${id}`),

  // Bills
  getBills: (params) => api.get('/accounting/bills', params),
  getBill: (id) => api.get(`/accounting/bills/${id}`),
  createBill: (data) => api.post('/accounting/bills', data),
  updateBill: (id, data) => api.put(`/accounting/bills/${id}`, data),
  deleteBill: (id) => api.delete(`/accounting/bills/${id}`),
  postBill: (id) => api.post(`/accounting/bills/${id}/post`),

  // A/P Aging
  getAPaging: () => api.get('/accounting/ap/aging'),

  // Checks
  getChecks: (params) => api.get('/accounting/checks', params),
  getCheck: (id) => api.get(`/accounting/checks/${id}`),
  writeCheck: (data) => api.post('/accounting/checks', data),
  updateCheck: (id, data) => api.put(`/accounting/checks/${id}`, data),
  voidCheck: (id) => api.post(`/accounting/checks/${id}/void`),
  postCheck: (id) => api.post(`/accounting/checks/${id}/post`),

  // Receipts
  getReceipts: (params) => api.get('/accounting/receipts', params),
  getReceipt: (id) => api.get(`/accounting/receipts/${id}`),
  createReceipt: (data) => api.post('/accounting/receipts', data),
  updateReceipt: (id, data) => api.put(`/accounting/receipts/${id}`, data),
  postReceipt: (id) => api.post(`/accounting/receipts/${id}/post`),

  // Bank Accounts (filter accounts by type=BANK)
  getBankAccounts: () => api.get('/accounting/accounts', { type: 'ASSET', subtype: 'BANK' }),

  // Deposits
  getDeposits: (params) => api.get('/accounting/deposits', params),
  getDeposit: (id) => api.get(`/accounting/deposits/${id}`),
  createDeposit: (data) => api.post('/accounting/deposits', data),
  updateDeposit: (id, data) => api.put(`/accounting/deposits/${id}`, data),

  // Bank Reconciliation
  getReconciliations: (params) => api.get('/accounting/reconciliations', params),
  getReconciliation: (id) => api.get(`/accounting/reconciliations/${id}`),
  startReconciliation: (data) => api.post('/accounting/reconciliations', data),
  updateReconciliation: (id, data) => api.put(`/accounting/reconciliations/${id}`, data),
  completeReconciliation: (id) => api.post(`/accounting/reconciliations/${id}/complete`),

  // Reports
  getTrialBalance: (params) => api.get('/accounting/reports/trial-balance', params),
  getIncomeStatement: (params) => api.get('/accounting/reports/income-statement', params),
  getBalanceSheet: (params) => api.get('/accounting/reports/balance-sheet', params),

  // Journal Entries
  getJournalEntries: (params) => api.get('/accounting/journal-entries', params),
  getJournalEntry: (id) => api.get(`/accounting/journal-entries/${id}`),
  createJournalEntry: (data) => api.post('/accounting/journal-entries', data),
  updateJournalEntry: (id, data) => api.put(`/accounting/journal-entries/${id}`, data),
  deleteJournalEntry: (id) => api.delete(`/accounting/journal-entries/${id}`),
  postJournalEntry: (id) => api.post(`/accounting/journal-entries/${id}/post`),
  reverseJournalEntry: (id, reason) => api.post(`/accounting/journal-entries/${id}/reverse`, { reason }),

  // Accounting Settings
  getAccountingSettings: () => api.get('/accounting/settings'),
};

// Purchasing (P2P) API
export const purchasingApi = {
  // Vendors
  getVendors: (params) => api.get('/purchasing/vendors', params),
  getVendor: (id) => api.get(`/purchasing/vendors/${id}`),
  createVendor: (data) => api.post('/purchasing/vendors', data),

  // Requisitions
  getRequisitions: (params) => api.get('/purchasing/requisitions', params),
  getRequisition: (id) => api.get(`/purchasing/requisitions/${id}`),
  createRequisition: (data) => api.post('/purchasing/requisitions', data),
  submitRequisition: (id) => api.post(`/purchasing/requisitions/${id}/submit`),
  approveRequisition: (id) => api.post(`/purchasing/requisitions/${id}/approve`),
  rejectRequisition: (id, reason) => api.post(`/purchasing/requisitions/${id}/reject`, { reason }),
  convertRequisition: (id, vendorId) => api.post(`/purchasing/requisitions/${id}/convert`, { vendorId }),

  // Purchase Orders
  getPurchaseOrders: (params) => api.get('/purchasing/purchase-orders', params),
  getPurchaseOrder: (id) => api.get(`/purchasing/purchase-orders/${id}`),
  createPurchaseOrder: (data) => api.post('/purchasing/purchase-orders', data),
  sendPurchaseOrder: (id, method, notes) => api.post(`/purchasing/purchase-orders/${id}/send`, { method, notes }),

  // Receipts (Goods Receipts)
  getReceipts: (params) => api.get('/purchasing/receipts', params),
  getReceipt: (id) => api.get(`/purchasing/receipts/${id}`),
  createReceipt: (data) => api.post('/purchasing/receipts', data),
  postReceipt: (id) => api.post(`/purchasing/receipts/${id}/post`),
  reprocessFailedReceipts: () => api.post('/purchasing/reprocess-failed-receipts'),

  // Vendor Bills
  getBills: (params) => api.get('/purchasing/bills', params),
  getBill: (id) => api.get(`/purchasing/bills/${id}`),
  createBill: (data) => api.post('/purchasing/bills', data),
  matchBill: (id, poId, receiptIds) => api.post(`/purchasing/bills/${id}/match`, { poId, receiptIds }),
  approveBill: (id) => api.post(`/purchasing/bills/${id}/approve`),

  // Payments
  getPayments: (params) => api.get('/purchasing/payments', params),
  getPayment: (id) => api.get(`/purchasing/payments/${id}`),
  createPayment: (data) => api.post('/purchasing/payments', data),
  sendPayment: (id) => api.post(`/purchasing/payments/${id}/send`),
  clearPayment: (id) => api.post(`/purchasing/payments/${id}/clear`),

  // Reports
  getAPAging: (asOfDate) => api.get('/purchasing/reports/ap-aging', { asOfDate }),

  // Auto-reorder
  checkReorder: (siteId) => api.post('/purchasing/check-reorder', { siteId }),
};

// Contacts API
export const contactsApi = {
  list: (params) => api.get('/contacts', params),
  get: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.patch(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
};

// Assets API (Base Registry)
export const assetsApi = {
  // Overview & counts
  getCounts: (params) => api.get('/assets/counts', params),
  getRecent: (params) => api.get('/assets/recent', params),
  search: (params) => api.get('/assets/search', params),

  // CRUD
  list: (params) => api.get('/assets', params),
  get: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.patch(`/assets/${id}`, data),

  // Status change (dispose/archive)
  updateStatus: (id, data) => api.post(`/assets/${id}/status`, data),
};

// Vehicles API
export const vehiclesApi = {
  list: (params) => api.get('/vehicles', params),
  get: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.patch(`/vehicles/${id}`, data),
  updateStatus: (id, data) => api.post(`/vehicles/${id}/status`, data),
};

// Billing API
export const billingApi = {
  createCheckoutSession: (data) => api.post('/billing/create-checkout-session', data),
  getSubscription: (tenantId) => api.get(`/billing/subscription/${tenantId}`),
  createPortalSession: (data) => api.post('/billing/create-portal-session', data),
};

// Usage API
export const usageApi = {
  getUsage: () => api.get('/usage'),
  getPlans: () => api.get('/usage/plans'),
  checkLimit: (resourceType, increment = 1) =>
    api.get(`/usage/check/${resourceType}`, { increment }),
};

// Admin API (superadmin only)
export const adminApi = {
  // Dashboard stats
  getStats: () => api.get('/admin/stats'),

  // Tenants
  listTenants: (params) => api.get('/admin/tenants', params),
  getTenant: (id) => api.get(`/admin/tenants/${id}`),
  updateTenant: (id, data) => api.patch(`/admin/tenants/${id}`, data),
  suspendTenant: (id) => api.post(`/admin/tenants/${id}/suspend`),
  activateTenant: (id) => api.post(`/admin/tenants/${id}/activate`),

  // Users
  listUsers: (params) => api.get('/admin/users', params),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),

  // Contact Inquiries
  listInquiries: (params) => api.get('/admin/inquiries', params),
  updateInquiry: (id, data) => api.patch(`/admin/inquiries/${id}`, data),
  deleteInquiry: (id) => api.delete(`/admin/inquiries/${id}`),

  // System
  getHealth: () => api.get('/admin/system/health'),
};

export default api;
