# SteadStack - Claude Memory

## Project Overview
**SteadStack** is a Farm and Ranch Management Software (FARMS) that unifies operations, inventory, and accounting. It automatically posts operational events to accounting ledgers.

**Live Site:** https://stead-stack.web.app

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + Firebase Auth
- **Backend:** Express.js + Firebase Admin SDK (Firestore)
- **Deployment:** Firebase Hosting + Cloud Functions
- **Maps:** React Google Maps API (land mapping)
- **Drag & Drop:** dnd-kit for task reordering

## Project Structure
```
packages/
├── backend/           # Express.js API (local dev)
│   └── src/
│       ├── config/    # Firebase admin config
│       ├── models/    # Mongoose schemas (25 models)
│       ├── routes/    # API endpoints (21 route modules)
│       ├── services/  # Business logic
│       └── middleware/
└── frontend/          # React + Vite
    └── src/
        ├── pages/     # App pages (65+ pages)
        ├── components/
        ├── contexts/  # AuthContext, SiteContext
        └── services/  # API client

functions/             # Firebase Cloud Functions (production API)
```

## Key Architecture Patterns

### Multi-Tenancy
- Every record includes `tenantId` for data isolation
- Composite indexes: (tenantId, field1, field2)
- Firestore security rules enforce tenant isolation

### Multi-Site Support
- Most records scoped to `siteId` for location-based operations
- Site selector in UI via `useSite()` hook
- Per-site inventory balances in SiteInventory collection

### Event-Driven Architecture
- **Events are the source of truth** for all farm activities
- Events trigger automatic postings:
  - Inventory movements (deductions/additions)
  - Ledger entries (double-entry accounting)
- Event types: feeding, treatment, purchase, sale, transfer, adjustment, maintenance, labor, breeding, birth, death, harvest, custom
- Event statuses: PENDING, POSTED, FAILED

### Double-Entry Accounting
- Every transaction creates balanced debit/credit pairs
- Ledger entries linked to source events for audit trails
- Account types: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE, COGS

## Main Modules
1. **Assets** - Livestock, Vehicles, Land (Tracts, Structures, Areas, Bins), Equipment
2. **Operations** - Tasks (Templates, Runlists, Occurrences), Events
3. **Inventory** - Feed, supplies, medicine tracking with low stock alerts
4. **Purchasing (P2P)** - Requisitions, POs, Receipts, Vendor Bills, Payments
5. **Accounting** - Chart of Accounts, Journal Entries, A/R, A/P, Bank reconciliation, Ledger
6. **Contacts** - Unified employees, contractors, vendors, customers, companies

## Important Files
- `backend/src/services/firestore.js` - Main Firestore integration (4,346 lines)
- `backend/src/services/p2p-service.js` - Procure-to-pay logic
- `backend/src/services/p2p-posting-engine.js` - Receipt posting, inventory & ledger updates
- `backend/src/services/task-inventory-service.js` - Task inventory consumption
- `frontend/src/App.jsx` - Main routing
- `frontend/src/contexts/AuthContext.jsx` - Auth state management
- `frontend/src/services/api.js` - HTTP client with auth

## Dev Commands
```bash
npm run dev           # Start both frontend (5173) and backend (4000)
npm run dev:frontend  # Frontend only
npm run dev:backend   # Backend only
```

---

## Critical Implementation Patterns

### Firebase Imports Pattern
**ALWAYS** import `db` and `FieldValue` from firebase-admin config, NOT from firestore.js:
```javascript
// CORRECT
const { db, admin } = require('../config/firebase-admin');
const { FieldValue } = admin.firestore;

// WRONG - will cause silent failures
const { db, FieldValue } = require('./firestore');
```
The firestore.js service uses these internally but does NOT export them.

### Weighted Average Cost Calculation
```javascript
newQty = currentQty + qtyReceived
newValue = currentValue + lineTotalCost
newAvgCost = newValue / newQty
```

### Task Inventory Allocation Modes
- **TOTAL**: Entire item quantity deducted once per task
- **PER_ANIMAL**: Item quantity × animal count deducted

### Event Idempotency
Use `accountingService.generateIdempotencyKey(tenantId, sourceId, payload)` to prevent duplicate ledger postings.

---

## Module Details

### Contacts Module (Jan 2026)
Unified contact management replacing separate vendor/customer/employee systems.

**Contact Types:**
- `employee` - Farm workers, managers, owner (use role: 'owner' for farm owner)
- `contractor` - Outside workers hired for specific jobs
- `vendor` - Suppliers you purchase from
- `customer` - People or businesses you sell to
- `company` - Businesses and organizations

**Key Features:**
- Every contact has a `laborRate` field for tracking time value
- Vendors need email for PO emailing
- Old `/app/purchasing/vendors` redirects to `/app/contacts?type=vendor`

**Files:**
- Model: `backend/src/models/Contact.js`
- Routes: `backend/src/routes/contacts.js`
- Frontend: `frontend/src/pages/app/contacts/`

### Structures, Areas & Bins (Jan 2026)
Hierarchical land management: **Land Tract → Structures → Areas → Bins**

**Structure Types:** BARN, SHOP, SHED, GARAGE, GREENHOUSE, COOP, HOUSE, CONTAINER, OTHER

**Bin Types:** DRY_STORAGE, REFRIGERATED, FREEZER, PALLET_RACK, SHELF, BIN, SILO, TANK, OTHER

**Files:**
- Routes: `backend/src/routes/structures.js`, `areas.js`, `bins.js`
- Frontend: `frontend/src/pages/app/assets/land/structures/`

### Tasks System
**Three-level hierarchy:**
1. **Task Templates** - Reusable task definitions with categories, priorities, recurrence
2. **Runlists** - Scheduled collections of templates (can be activated/paused)
3. **Task Occurrences** - Actual tasks for specific dates

**Task Categories:** FEEDING, WATERING, HEALTH_CHECK, MEDICATION, BREEDING, MAINTENANCE, CLEANING, HARVESTING, PLANTING, WEEDING, IRRIGATION, PEST_CONTROL, EQUIPMENT, ADMINISTRATIVE, OTHER

**Task Priorities:** URGENT, HIGH, MEDIUM, LOW

**Recurrence Patterns:** DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, ANNUALLY

**Occurrence Statuses:** PENDING, IN_PROGRESS, COMPLETED, SKIPPED, CANCELLED

**Key Features:**
- Tasks can link to land tracts (location field)
- Tasks can specify inventoryItems with allocationMode
- Tasks can be event-like with financial tracking (totalCost, totalRevenue, labor)
- Drag-and-drop reordering via dnd-kit
- Auto-consumption of inventory on completion

### P2P (Procure-to-Pay) Flow

**Flow:** Requisition → PO → Receipt → Vendor Bill → Payment

**PO Send Methods:** EMAIL, PHONE, WALKIN, ONLINE

**Receipt Posting Flow:**
1. Receipt status → POSTED
2. RECEIPT_POSTED event created (PENDING)
3. PO line `qtyReceived` incremented
4. PO status updated (PARTIALLY_RECEIVED or RECEIVED)
5. P2P Posting Engine processes:
   - Creates InventoryMovement (RECEIPT)
   - Updates SiteInventory with weighted average cost
   - Creates LedgerTransaction (Dr. Inventory, Cr. A/P)
6. Event status → POSTED

**Account Mapping:**
- FEED → `feed-inventory`
- MEDICINE → `medicine-inventory`
- SUPPLIES → `supplies-inventory`
- EQUIPMENT_PARTS → `equipment-parts-inventory`
- All credits → `accounts-payable`

### Inventory System

**Categories:** FEED, MEDICINE, SUPPLIES, EQUIPMENT_PARTS

**Movement Types:** RECEIPT, CONSUMPTION, ADJUSTMENT, TRANSFER

**Key Collections:**
- `tenants/{tenantId}/inventoryItems` - Master catalog
- `tenants/{tenantId}/sites/{siteId}/inventory` - Per-site balances
- `tenants/{tenantId}/inventoryMovements` - Transaction log

---

## Enumeration Reference

### Event Types
feeding, treatment, purchase, sale, transfer, adjustment, maintenance, labor, breeding, birth, death, harvest, custom

### Asset Types
ANIMAL, LAND, BUILDING, VEHICLE, EQUIPMENT, INFRASTRUCTURE, TOOL, OTHER

### Asset Statuses
ACTIVE, SOLD, RETIRED, LOST, ARCHIVED, DECEASED

### User Roles
owner, admin, manager, worker

### Requisition Statuses
DRAFT, SUBMITTED, APPROVED, REJECTED, CONVERTED

### PO Statuses
DRAFT, SENT, OPEN, PARTIALLY_RECEIVED, RECEIVED, CLOSED, CANCELLED

### Vendor Bill Statuses
DRAFT, APPROVED, PARTIALLY_PAID, PAID, VOID

### Payment Methods
CHECK, ACH, CARD, CASH, WIRE

---

## API Routes Reference

| Module | Route Prefix | Key Endpoints |
|--------|--------------|---------------|
| Auth | `/auth` | login, signup, verify |
| Contacts | `/contacts` | CRUD with type filter |
| Tasks | `/tasks` | templates, runlists, occurrences, generate, reorder |
| Animals | `/animals` | groups, individual animals, bulk move |
| Assets | `/assets` | counts, recent |
| Structures | `/structures` | CRUD + nested areas/bins |
| Areas | `/areas` | CRUD |
| Bins | `/bins` | CRUD + types, check-code |
| Land Tracts | `/land-tracts` | CRUD with mapping |
| Vehicles | `/vehicles` | CRUD |
| Sites | `/sites` | CRUD |
| Inventory | `/inventory` | items, movements, balances |
| Purchasing | `/purchasing` | vendors, requisitions, orders, receipts, bills, payments |
| Accounting | `/accounting` | accounts, transactions |
| Events | `/events` | CRUD |
| Posting | `/posting` | process events |

---

## Accounting Module (Jan 2026)

### Manual Journal Entries
Allow users to create, post, and reverse journal entries for adjustments and corrections.

**Model:** `backend/src/models/JournalEntry.js`

**Status Flow:** DRAFT → POSTED → REVERSED

**Key Fields:**
- `entryNumber` - Auto-generated (JE-00001)
- `entryDate` - Transaction date
- `lines[]` - Array of line items with accountId, debit, credit
- `totalDebits`, `totalCredits`, `isBalanced` - Auto-calculated
- `ledgerTransactionId` - Reference to posted ledger transaction
- `reversedByEntryId`, `reversesEntryId` - Reversal tracking

**Routes:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounting/journal-entries` | List with status filter |
| GET | `/accounting/journal-entries/:id` | Get single entry |
| POST | `/accounting/journal-entries` | Create entry |
| PUT | `/accounting/journal-entries/:id` | Update draft |
| DELETE | `/accounting/journal-entries/:id` | Delete draft |
| POST | `/accounting/journal-entries/:id/post` | Post to ledger |
| POST | `/accounting/journal-entries/:id/reverse` | Reverse posted entry |

**Frontend:**
- `frontend/src/pages/app/accounting/JournalEntries.jsx` - List view
- `frontend/src/pages/app/accounting/JournalEntryForm.jsx` - Create/edit form
- `frontend/src/pages/app/accounting/JournalEntryDetail.jsx` - Detail view
- "Journal Entry" button on Chart of Accounts page

### A/P Posting (Bills & Checks)

**Bill Posting:** `POST /accounting/bills/:id/post`
- Debits: Expense accounts (from line items, auto-detected by EXPENSE or COGS type)
- Credits: Accounts Payable (auto-detected by AP subtype)

**Check Posting:** `POST /accounting/checks/:id/post`
- Debits: Accounts Payable (for bill payments)
- Credits: Cash/Bank account (auto-detected by CASH/BANK subtype)

### A/R Posting (Invoices & Receipts)

**Invoice Send/Post:** `POST /accounting/invoices/:id/send`
- Debits: Accounts Receivable (auto-detected by AR subtype)
- Credits: Revenue accounts (from line items, auto-detected by INCOME type)
- Updates invoice status to SENT

**Receipt Posting:** `POST /accounting/receipts/:id/post`
- Debits: Cash/Bank account (auto-detected by CASH/BANK subtype)
- Credits: Accounts Receivable (auto-detected by AR subtype)

### Control Account Detection
The system automatically finds control accounts by subtype:
- **A/P Account:** Account with subtype containing "AP" or "PAYABLE"
- **A/R Account:** Account with subtype containing "AR" or "RECEIVABLE"
- **Cash Account:** Account with subtype containing "CASH" or "BANK"
- **Default Revenue:** First INCOME type account
- **Default Expense:** First EXPENSE type account

### Idempotency
All posting functions use idempotency keys to prevent duplicate ledger transactions:
```javascript
const idempotencyKey = `bill-post-${billId}`;
// Check for existing transaction before creating
```

---

## Session Notes

### Requisition Auto-Fill (Jan 2026)
When selecting an inventory item in the requisition form, the quantity field auto-populates with the item's `reorderQuantity` if available.

### Bug Fix: Inventory Not Updating on Receipt (Jan 2026)
**Problem:** When receipts were posted, inventory `qtyOnHand` was not being updated.

**Root Cause:** `p2p-posting-engine.js` was importing `db` and `FieldValue` from `./firestore`, but `firestore.js` did NOT export these variables.

**Fix:** Changed import to `../config/firebase-admin` (see Critical Implementation Patterns above).

**Files Fixed:**
- `packages/backend/src/services/p2p-posting-engine.js`
- `functions/services/p2p-posting-engine.js`

