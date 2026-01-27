# SteadStack

**Farm and Ranch Management Software (FARMS)**

Track operations, inventory, and accounting in one unified platform. Every farm activity automatically updates your books.

**Live Site:** https://stead-stack.web.app

## Features

### Assets Management
- **Livestock** - Track animals with tags, species, breeds, birth dates, and status
- **Vehicles** - Manage trucks, tractors, ATVs with maintenance tracking
- **Land** - Sites, tracts, pastures with mapping integration
- **Equipment** - Buildings, infrastructure, tools, and other assets

### Operations
- **Tasks** - Daily chores, scheduled work, and reusable task templates
- **Run Lists** - Checklists that group tasks for efficient workflows
- **Events** - Log farm activities that can post to accounting

### Inventory
- Track feed, supplies, medicine, and consumables
- Low stock alerts with reorder points
- Inventory movements and adjustments

### Purchasing (Procure-to-Pay)
- **Requisitions** - Request items needed for the farm
- **Purchase Orders** - Formalize orders with vendors
- **Vendor Bills** - Track what you owe
- **Payments** - Record payments to vendors
- **A/P Aging** - Monitor outstanding payables

### Accounting
- **Chart of Accounts** - Full double-entry accounting with CSV import
- **Accounts Receivable** - Track customer invoices and payments
- **Accounts Payable** - Manage vendor bills and payments
- **Banking** - Checks, deposits, receipts, and reconciliation
- **Analysis & Inquiry** - Drill into account activity

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
│   │   │   ├── config/   # Configuration
│   │   │   ├── models/   # Mongoose schemas
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── services/ # Business logic
│   │   │   └── middleware/
│   │   └── package.json
│   │
│   └── frontend/         # React + Vite application
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
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
└── INSTRUCTIONS.md       # User guide for first-time users
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Firebase CLI (`npm install -g firebase-tools`)
- MongoDB (local or Atlas) for local development

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
| `MONGODB_URI` | MongoDB connection string | Required |
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
| `/app/tasks` | Today's tasks |
| `/app/tasks/templates` | Task templates |
| `/app/tasks/lists` | Run lists (checklists) |
| `/app/assets` | Assets overview |
| `/app/assets/animals` | Livestock management |
| `/app/assets/vehicles` | Vehicle management |
| `/app/assets/land` | Land and sites |
| `/app/inventory` | Inventory tracking |
| `/app/purchasing` | Requisitions and P2P |
| `/app/accounting` | Chart of accounts |
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
2. **Multi-site** - Records can be scoped to specific sites/locations
3. **Event-driven** - Operational events are the source of truth
4. **Audit trail** - Every ledger entry links to source event
5. **Double-entry accounting** - Balanced debits and credits

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express.js, Firebase Cloud Functions
- **Database:** MongoDB (Firestore for some features)
- **Auth:** Firebase Authentication
- **Hosting:** Firebase Hosting
- **Maps:** Leaflet with OpenStreetMap

## License

Proprietary - All rights reserved

---

Built with care for farmers and ranchers.
