# SteadStack - Claude Memory

## Project Overview
**SteadStack** is a Farm and Ranch Management Software (FARMS) that unifies operations, inventory, and accounting. It automatically posts operational events to accounting ledgers.

**Live Site:** https://stead-stack.web.app

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + Firebase Auth
- **Backend:** Express.js + MongoDB/Mongoose + Firebase Admin SDK
- **Deployment:** Firebase Hosting + Cloud Functions
- **Maps:** React Google Maps API (land mapping)

## Project Structure
```
packages/
├── backend/           # Express.js API (local dev)
│   └── src/
│       ├── models/    # Mongoose schemas
│       ├── routes/    # API endpoints
│       ├── services/  # Business logic
│       └── middleware/
└── frontend/          # React + Vite
    └── src/
        ├── pages/     # App pages
        ├── components/
        ├── contexts/  # AuthContext, SiteContext
        └── services/  # API client

functions/             # Firebase Cloud Functions (production API)
```

## Key Architecture Patterns

### Multi-Tenancy
- Every record includes `tenantId` for data isolation
- Supports both Firestore tenant IDs (strings) and MongoDB ObjectIds

### Multi-Site Support
- Most records scoped to `siteId` for location-based operations
- Site selector in UI for tenant operations

### Event-Driven Architecture
- **Events are the source of truth** for all farm activities
- Events trigger automatic postings:
  - Inventory movements (deductions/additions)
  - Ledger entries (double-entry accounting)
- Event types: feeding, treatment, purchase, sale, transfer, adjustment, maintenance, labor, breeding, birth, death, harvest, custom

### Double-Entry Accounting
- Every transaction creates balanced debit/credit pairs
- Ledger entries linked to source events for audit trails
- Account types: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE, COGS

## Main Modules
1. **Assets** - Livestock, Vehicles, Land, Equipment
2. **Operations** - Tasks, Run Lists, Events
3. **Inventory** - Feed, supplies, medicine tracking with low stock alerts
4. **Purchasing (P2P)** - Requisitions, POs, Vendor Bills, Payments
5. **Accounting** - Chart of Accounts, A/R, A/P, Bank reconciliation, Ledger

## Important Files
- `backend/src/services/firestore.js` - Main Firestore integration (largest file)
- `backend/src/services/p2p-service.js` - Procure-to-pay logic
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

## Session Notes

### P2P Receiving → Inventory → Accounting Flow (Jan 2026)

**Flow:** Receipt (DRAFT) → Post Receipt (POSTED) → RECEIPT_POSTED Event → Posting Engine

**What happens when a Receipt is posted:**
1. Receipt status changes to POSTED
2. RECEIPT_POSTED event created (status: PENDING)
3. PO line `qtyReceived` incremented
4. PO status updated (PARTIALLY_RECEIVED or RECEIVED)
5. P2P Posting Engine processes event:
   - Creates InventoryMovement record (movementType: 'RECEIPT')
   - Updates SiteInventory: qtyOnHand, avgCostPerUnit (weighted average), totalValue
   - Creates LedgerTransaction + LedgerEntries (Dr. Inventory, Cr. A/P)
6. Event status → POSTED (or FAILED if error)

**Account Mapping (DEFAULT_ACCOUNTS in p2p-posting-engine.js):**
- FEED → `feed-inventory`
- MEDICINE → `medicine-inventory`
- SUPPLIES → `supplies-inventory`
- EQUIPMENT_PARTS → `equipment-parts-inventory`
- All credits → `accounts-payable`

**Weighted Average Cost Calculation:**
```
newQty = currentQty + qtyReceived
newValue = currentValue + lineTotalCost
newAvgCost = newValue / newQty
```

**Key Files:**
- `backend/src/services/p2p-service.js` - Receipt creation/posting
- `backend/src/services/p2p-posting-engine.js` - Inventory & ledger updates
- `backend/src/services/firestore.js` - Firestore operations

### Bug Fix: Inventory Not Updating on Receipt (Jan 2026)

**Problem:** When receipts were posted, inventory `qtyOnHand` was not being updated.

**Root Cause:** `p2p-posting-engine.js` was importing `db` and `FieldValue` from `./firestore`, but `firestore.js` did NOT export these variables. They were `undefined`, causing all inventory operations to silently fail.

**Fix:** Changed the import in `p2p-posting-engine.js` to:
```javascript
const { db, admin } = require('../config/firebase-admin');
const { FieldValue } = admin.firestore;
```

**Files Fixed:**
- `packages/backend/src/services/p2p-posting-engine.js`
- `functions/services/p2p-posting-engine.js`

**Important Pattern:** Always import `db` and `FieldValue` from `../config/firebase-admin`, NOT from `./firestore`. The firestore.js service file uses these internally but does not export them.

### Contacts Module (Jan 2026)

**New unified Contacts system** replaces separate vendor/customer/employee management.

**Contact Types:**
- `employee` - Farm workers, managers, owner (use role: 'owner' for farm owner)
- `contractor` - Outside workers hired for specific jobs
- `vendor` - Suppliers you purchase from
- `customer` - People or businesses you sell to
- `company` - Businesses and organizations

**Key Features:**
- Every person has a `laborRate` field for tracking time value
- Vendors need email for PO emailing
- Old `/app/purchasing/vendors` redirects to `/app/contacts?type=vendor`

**Model:** `backend/src/models/Contact.js`
**Routes:** `backend/src/routes/contacts.js`
**Frontend:** `frontend/src/pages/app/contacts/`

### PO Send Method Options (Jan 2026)

**POs now support multiple send methods:**
- `EMAIL` - Send via email (requires vendor email)
- `PHONE` - Called the vendor
- `WALKIN` - Walk-in / In-store purchase
- `ONLINE` - Placed order on vendor website

**Stored on PO:** `sendMethod` and `sentVia` object with method, emailSentTo, and notes.

### Requisition Auto-Fill (Jan 2026)

When selecting an inventory item in the requisition form, the quantity field now auto-populates with the item's `reorderQuantity` if available.

