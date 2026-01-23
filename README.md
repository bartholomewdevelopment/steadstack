# SteadStack

**Farm and Ranch Management Software (FARMS)**

Track operations, inventory, and accounting in one unified platform. Every farm activity automatically updates your books.

## Project Structure

```
steadstack/
├── packages/
│   ├── backend/          # Express.js API server
│   │   ├── src/
│   │   │   ├── config/   # Configuration
│   │   │   ├── models/   # Mongoose schemas
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── middleware/
│   │   │   └── scripts/  # Seed data, migrations
│   │   └── package.json
│   │
│   └── frontend/         # React + Vite application
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── layouts/
│       │   ├── hooks/
│       │   └── utils/
│       └── package.json
│
├── .env.example          # Environment template
├── package.json          # Root monorepo config
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/steadstack.git
cd steadstack

# Install dependencies (all packages)
npm install

# Copy environment file
cp .env.example packages/backend/.env
# Edit packages/backend/.env with your MongoDB URI

# Seed the database (optional)
npm run seed

# Start development servers
npm run dev
```

### Running Individual Services

```bash
# Backend only (http://localhost:4000)
npm run dev:backend

# Frontend only (http://localhost:5173)
npm run dev:frontend
```

## Environment Variables

### Backend (`packages/backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `4000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/steadstack` |
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
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase analytics measurement ID |

## API Endpoints

### Segment 1: Marketing Site

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with DB status |
| `POST` | `/api/contact` | Submit contact inquiry |
| `GET` | `/api/pricing` | Get pricing tiers |

### Example: Submit Contact Form

```bash
curl -X POST http://localhost:4000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Interested in a demo"
  }'
```

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/features` | Feature details |
| `/pricing` | Pricing plans |
| `/about` | About page |
| `/contact` | Contact form |

## Development

### Project Commands

```bash
npm run dev          # Start all services
npm run dev:backend  # Start backend only
npm run dev:frontend # Start frontend only
npm run build        # Build all packages
npm run seed         # Seed database with demo data
npm run lint         # Lint all packages
```

### Code Style

- ES6+ JavaScript
- Functional components with hooks (React)
- Mongoose for MongoDB schemas
- Express Router for API routes
- Tailwind CSS for styling

## Segment Roadmap

### Segment 1: Marketing Site (Current)
- [x] Project structure
- [x] Landing page
- [x] Pricing page
- [x] Features page
- [x] About page
- [x] Contact form (with API)
- [x] Responsive design

### Segment 2: Authentication (Complete)
- [x] Firebase integration
- [x] Auth context with hooks
- [x] Login page UI
- [x] Signup page UI
- [x] Password reset flow UI
- [x] Protected routes
- [x] User/Tenant sync to MongoDB
- [x] RBAC middleware foundation

### Segment 3: Customer Portal Shell (Complete)
- [x] Dashboard layout with sidebar
- [x] Site model and API
- [x] Site selector/switcher
- [x] Navigation structure
- [x] Settings page
- [x] Placeholder module pages

### Segment 4: Admin Portal Shell
- [ ] Admin dashboard
- [ ] Tenant management
- [ ] User management
- [ ] Contact inquiry management

### Future Segments
- Events module
- Inventory module
- Animals module
- Accounting module
- Reporting module

## Architecture Principles

1. **Multi-tenant**: Every record has `tenantId`
2. **Multi-site**: Most records have `siteId` (nullable for global)
3. **Event-driven**: Operational events are source of truth
4. **Audit trail**: Every ledger entry links to source event
5. **Double-entry accounting**: Balanced debits/credits

## License

Proprietary - All rights reserved

---

Built with care for farmers and ranchers.
