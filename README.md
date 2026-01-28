# SteadStack

**Farm and Ranch Management Software (FARMS)**

Track operations, inventory, and accounting in one unified platform. Every farm activity automatically updates your books.

**Live Site:** https://stead-stack.web.app

## Features

### Assets Management
- **Livestock** - Track animals individually or in groups (herds, flocks, pens) with species, breeds, birth dates, and status
- **Vehicles** - Manage trucks, tractors, ATVs with maintenance tracking
- **Land** - Sites, tracts, pastures with mapping integration
- **Structures** - Barns, shops, sheds, greenhouses with hierarchical areas and storage bins
- **Equipment** - Buildings, infrastructure, tools, and other assets

### Operations
- **Tasks** - Daily chores, scheduled work, and reusable task templates
- **Runlists** - Checklists that group tasks for efficient workflows with drag-and-drop reordering
- **Events** - Log farm activities that automatically post to inventory and accounting
- **Task Templates** - Create reusable tasks with recurrence patterns, inventory allocation, and location assignments

### Inventory
- Track feed, supplies, medicine, and consumables by site
- Low stock alerts with reorder points
- Automatic inventory movements from task completion and receipts
- Weighted average cost tracking

### Purchasing (Procure-to-Pay)
- **Requisitions** - Request items needed for the farm
- **Purchase Orders** - Formalize orders with vendors (send via email, phone, walk-in, or online)
- **Receipts** - Receive goods and auto-update inventory balances
- **Vendor Bills** - Track what you owe with three-way matching
- **Payments** - Record payments via check, ACH, card, cash, or wire
- **A/P Aging** - Monitor outstanding payables by age

### Contacts
- **Unified contact management** - Employees, contractors, vendors, customers, and companies
- Track labor rates for all contact types
- Vendor email integration for PO distribution

### Accounting
- **Chart of Accounts** - Full double-entry accounting with CSV import
- **Journal Entries** - Manual adjustments with post/reverse workflow
- **Accounts Receivable** - Track customer invoices and payments with automatic ledger posting
- **Accounts Payable** - Manage vendor bills and payments with automatic ledger posting
- **Banking** - Checks, deposits, receipts, and reconciliation
- **Analysis & Inquiry** - Drill into account activity
- **Automatic Posting** - Bills, invoices, checks, and receipts create balanced ledger entries with audit trails

### Reports
- Financial statements
- Analytics and performance metrics
- Custom report generation

## Project Structure

```
steadstack/
├── packages/
│   ├── backend/          # Express.js API server (local dev)
│   │   ├── src/
│   │   │   ├── config/   # Firebase admin configuration
│   │   │   ├── models/   # Mongoose schemas (24 models)
│   │   │   ├── routes/   # API endpoints (21 route modules)
│   │   │   ├── services/ # Business logic
│   │   │   └── middleware/
│   │   └── package.json
│   │
│   └── frontend/         # React + Vite application
│       ├── src/
│       │   ├── components/
│       │   ├── pages/    # 65+ app pages
│       │   ├── layouts/
│       │   ├── contexts/
│       │   ├── services/
│       │   └── utils/
│       └── package.json
│
├── functions/            # Firebase Cloud Functions (production API)
├── .env.example          # Environment template
├── firebase.json         # Firebase configuration
├── package.json          # Root monorepo config
├── README.md
├── INSTRUCTIONS.md       # User guide for first-time users
└── CLAUDE.md             # Developer memory and session notes
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/steadstack.git
cd steadstack

# Install dependencies (all packages)
npm install

# Copy environment file
cp .env.example packages/backend/.env
# Edit with your configuration

# Start development servers
npm run dev
```

### Running Individual Services

```bash
# Backend only (http://localhost:4000)
npm run dev:backend

# Frontend only (http://localhost:5173)
npm run dev:frontend

# Firebase emulators
firebase emulators:start
```

### Deployment

```bash
# Build frontend
npm run build --workspace=packages/frontend

# Deploy to Firebase
firebase deploy
```

## Environment Variables

### Backend (`packages/backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `4000` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:5173` |

### Frontend (`packages/frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key (for land mapping) |

## Application Routes

### Marketing Site
| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/features` | Feature details |
| `/pricing` | Pricing plans |
| `/about` | About page |
| `/contact` | Contact form |

### Authentication
| Route | Description |
|-------|-------------|
| `/login` | User login |
| `/signup` | New account registration |
| `/forgot-password` | Password reset |

### Customer Portal (`/app`)
| Route | Description |
|-------|-------------|
| `/app` | Dashboard home |
| `/app/tasks` | Today's tasks with drag-and-drop |
| `/app/tasks/templates` | Task templates |
| `/app/tasks/lists` | Run lists (checklists) |
| `/app/contacts` | Unified contacts (employees, vendors, customers) |
| `/app/assets` | Assets overview |
| `/app/assets/animals` | Livestock management (individuals and groups) |
| `/app/assets/vehicles` | Vehicle management |
| `/app/assets/land` | Land, sites, and structures |
| `/app/assets/land/structures` | Structures with areas and bins |
| `/app/inventory` | Inventory tracking by site |
| `/app/purchasing` | Requisitions and P2P workflow |
| `/app/purchasing/orders` | Purchase orders |
| `/app/purchasing/bills` | Vendor bills |
| `/app/accounting` | Chart of accounts |
| `/app/accounting/journal-entries` | Journal entries |
| `/app/accounting/ar` | Accounts receivable |
| `/app/accounting/ap` | Accounts payable |
| `/app/reports` | Reports and analytics |
| `/app/settings` | User and farm settings |

### Admin Portal (`/admin`)
| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard |
| `/admin/tenants` | Tenant management |
| `/admin/users` | User management |
| `/admin/inquiries` | Contact inquiries |

## API Endpoints

| Module | Prefix | Description |
|--------|--------|-------------|
| Auth | `/api/auth` | Authentication and user management |
| Contacts | `/api/contacts` | Unified contact CRUD with type filtering |
| Tasks | `/api/tasks` | Templates, runlists, occurrences, generation |
| Animals | `/api/animals` | Individual animals and groups |
| Assets | `/api/assets` | Asset counts and recent activity |
| Structures | `/api/structures` | Structures with nested areas/bins |
| Areas | `/api/areas` | Areas within structures |
| Bins | `/api/bins` | Storage bins with capacity tracking |
| Land Tracts | `/api/land-tracts` | Land parcels with mapping |
| Vehicles | `/api/vehicles` | Vehicle CRUD |
| Sites | `/api/sites` | Site management |
| Inventory | `/api/inventory` | Items, movements, balances |
| Purchasing | `/api/purchasing` | Full P2P workflow |
| Accounting | `/api/accounting` | Accounts and transactions |
| Events | `/api/events` | Operational events |
| Posting | `/api/posting` | Event processing to ledger |

## Development Commands

```bash
npm run dev          # Start all services
npm run dev:backend  # Start backend only
npm run dev:frontend # Start frontend only
npm run build        # Build all packages
npm run lint         # Lint all packages
```

## Architecture Principles

1. **Multi-tenant** - Every record has `tenantId` for data isolation
2. **Multi-site** - Records scoped to specific sites/locations
3. **Event-driven** - Operational events are the source of truth
4. **Audit trail** - Every ledger entry links to source event
5. **Double-entry accounting** - Balanced debits and credits
6. **Weighted average costing** - Inventory valued at running average cost

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, dnd-kit
- **Backend:** Node.js, Express.js, Firebase Cloud Functions
- **Database:** Firestore (primary)
- **Auth:** Firebase Authentication
- **Hosting:** Firebase Hosting
- **Maps:** React Google Maps API
- **Email:** SendGrid/SMTP for PO distribution

## Data Models

The application uses 25 Mongoose/Firestore models:

| Model | Description |
|-------|-------------|
| Tenant | Multi-tenant isolation |
| User | Authenticated users with roles |
| Site | Farm/ranch locations |
| Contact | Unified contacts (employee, vendor, customer, etc.) |
| Event | Operational transactions |
| InventoryItem | Master inventory catalog |
| InventoryMovement | Inventory transaction log |
| SiteInventory | Per-site inventory balances |
| Account | Chart of accounts |
| JournalEntry | Manual accounting adjustments |
| LedgerTransaction | Transaction headers |
| LedgerEntry | Debit/credit line items |
| Animal | Individual livestock |
| AnimalGroup | Herds, flocks, pens |
| Bill | Vendor purchase invoices |
| Check | Check payments |
| Receipt | Bank deposits |
| Deposit | Deposit records |
| BankReconciliation | Bank statement matching |

## License

Proprietary - All rights reserved

---

Built with care for farmers and ranchers.
