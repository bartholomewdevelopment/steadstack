# SteadStack User Guide

Farm & Ranch Management Software (FARMS)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Sites Management](#sites-management)
3. [Inventory Management](#inventory-management)
4. [Livestock Management](#livestock-management)
5. [Tasks & Runlists](#tasks--runlists)
6. [Events & Accounting](#events--accounting)
7. [User Roles & Permissions](#user-roles--permissions)

---

## Getting Started

### Creating Your Account

1. Navigate to the SteadStack login page
2. Sign in with Google or create an account with email/password
3. On first login, you'll be prompted to create your **Tenant** (your farm/ranch organization)
4. Set your timezone (defaults to America/New_York)
5. Configure your initial settings

### Understanding the Tenant Structure

SteadStack uses a multi-tenant architecture:

```
Tenant (Your Farm/Ranch)
├── Users (team members)
├── Sites (physical locations)
├── Inventory Items (master catalog)
├── Animal Groups & Animals
├── Task Templates & Runlists
└── Events (all recorded activities)
```

---

## Sites Management

Sites represent physical locations on your farm or ranch (barns, pastures, fields, etc.).

### Creating a Site

**Endpoint:** `POST /api/sites`

```json
{
  "name": "North Pasture",
  "code": "NP",
  "type": "pasture",
  "address": "123 Farm Road",
  "acreage": 50
}
```

### Site Types

- `farm` - Main farm location
- `pasture` - Grazing areas
- `barn` - Animal housing
- `field` - Crop fields
- `storage` - Equipment/supply storage

### Viewing Sites

**Endpoint:** `GET /api/sites`

Returns all active sites for your tenant with their details.

---

## Inventory Management

Track feed, supplies, equipment parts, and other materials across your sites.

### Setting Up Inventory Items (Master Catalog)

First, create items in your master catalog:

**Endpoint:** `POST /api/inventory/items`

```json
{
  "sku": "FEED-CORN-50",
  "name": "Corn Feed 50lb Bag",
  "category": "FEED",
  "unit": "BAG",
  "defaultCostPerUnit": 15.99,
  "reorderPoint": 10,
  "reorderQty": 50,
  "preferredVendor": "Farm Supply Co"
}
```

### Inventory Categories

| Category | Description |
|----------|-------------|
| `FEED` | Animal feed products |
| `SEED` | Planting seeds |
| `FERTILIZER` | Soil amendments |
| `CHEMICAL` | Pesticides, herbicides |
| `FUEL` | Diesel, gasoline |
| `SUPPLIES` | General supplies |
| `EQUIPMENT_PARTS` | Replacement parts |
| `OTHER` | Miscellaneous items |

### Checking Site Inventory

View what's in stock at a specific site:

**Endpoint:** `GET /api/inventory/sites/{siteId}`

### Recording Inventory Receipts

When you receive a purchase order:

**Endpoint:** `POST /api/inventory/receive`

```json
{
  "siteId": "site123",
  "items": [
    { "itemId": "item456", "qty": 100, "costPerUnit": 15.50 },
    { "itemId": "item789", "qty": 25, "costPerUnit": 42.00 }
  ],
  "poNumber": "PO-2024-001",
  "vendor": "Farm Supply Co",
  "paymentMethod": "CREDIT"
}
```

### Transferring Between Sites

Move inventory from one site to another:

**Endpoint:** `POST /api/inventory/transfer`

```json
{
  "fromSiteId": "site123",
  "toSiteId": "site456",
  "itemId": "item789",
  "qty": 25
}
```

### Inventory Adjustments

For corrections, breakage, or manual counts:

**Endpoint:** `POST /api/inventory/adjust`

```json
{
  "siteId": "site123",
  "itemId": "item456",
  "qtyDelta": -5,
  "reason": "Damaged in storage"
}
```

### Auto-Reorder

Enable automatic purchase requisitions when stock drops below the reorder point:

1. Set `reorderPoint` and `reorderQty` on inventory items
2. Enable in tenant settings: `autoReorderEnabled: true`
3. Optionally require approval: `autoReorderApprovalRequired: true`

When inventory drops below the reorder point, a purchase requisition is automatically created.

**View Requisitions:** `GET /api/inventory/requisitions`

**Approve:** `POST /api/inventory/requisitions/{id}/approve`

**Reject:** `POST /api/inventory/requisitions/{id}/reject`

---

## Livestock Management

Track individual animals and animal groups with full lineage and status management.

### Creating Animal Groups

Groups organize animals (herds, flocks, pens):

**Endpoint:** `POST /api/animals/groups`

```json
{
  "siteId": "site123",
  "name": "Spring 2024 Calves",
  "type": "HERD",
  "species": "CATTLE",
  "description": "Calves born Spring 2024",
  "capacity": 50
}
```

### Group Types

- `HERD` - Cattle groups
- `FLOCK` - Sheep/poultry groups
- `PEN` - Confined housing
- `PASTURE` - Grazing groups
- `BARN` - Indoor housing
- `COOP` - Poultry housing

### Adding Individual Animals

**Endpoint:** `POST /api/animals`

```json
{
  "siteId": "site123",
  "groupId": "group456",
  "tagNumber": "A-2024-001",
  "name": "Bessie",
  "species": "CATTLE",
  "breed": "Angus",
  "gender": "female",
  "dateOfBirth": "2024-03-15",
  "color": "Black",
  "sireId": "animal_sire_id",
  "damId": "animal_dam_id",
  "acquisition": {
    "method": "born",
    "notes": "Normal birth, healthy"
  }
}
```

### Animal Statuses

| Status | Description |
|--------|-------------|
| `ACTIVE` | Currently on farm |
| `SOLD` | Sold and removed |
| `DECEASED` | Died on farm |
| `TRANSFERRED` | Moved to another operation |
| `CULLED` | Removed from herd |

### Recording Feed Events

Track feed consumption and costs:

**Endpoint:** `POST /api/animals/feed`

```json
{
  "siteId": "site123",
  "groupId": "group456",
  "feedItemId": "feed_item_id",
  "qty": 10,
  "notes": "Morning feeding"
}
```

### Livestock Costing Modes

Configure in tenant settings:

- **EXPENSE** (default): Feed costs go directly to expense accounts
- **CAPITALIZE**: Feed costs are added to the animal group's cost basis (tracked as inventory value)

### Selling Livestock

**Endpoint:** `POST /api/animals/sell`

```json
{
  "siteId": "site123",
  "groupId": "group456",
  "animalIds": ["animal1", "animal2"],
  "saleAmount": 2500.00,
  "costAmount": 1800.00,
  "buyer": "ABC Cattle Co",
  "paymentMethod": "CREDIT"
}
```

### Purchasing Livestock

**Endpoint:** `POST /api/animals/purchase`

```json
{
  "siteId": "site123",
  "groupId": "group456",
  "animals": [
    {
      "tagNumber": "NEW-001",
      "species": "CATTLE",
      "breed": "Hereford",
      "gender": "male",
      "dateOfBirth": "2023-06-01"
    }
  ],
  "totalCost": 1500.00,
  "vendor": "Smith Ranch",
  "paymentMethod": "CREDIT"
}
```

### Bulk Operations

Move multiple animals between groups/sites:

**Endpoint:** `POST /api/animals/bulk/move`

```json
{
  "animalIds": ["animal1", "animal2", "animal3"],
  "targetGroupId": "new_group_id",
  "targetSiteId": "new_site_id"
}
```

---

## Tasks & Runlists

Automate daily operations with scheduled task lists.

### Creating Task Templates

Templates define reusable task definitions:

**Endpoint:** `POST /api/tasks/templates`

```json
{
  "name": "Morning Cattle Feeding",
  "description": "Feed all cattle groups in the morning",
  "category": "FEEDING",
  "priority": "HIGH",
  "estimatedDurationMinutes": 45,
  "instructions": "1. Check water first\n2. Distribute feed evenly\n3. Note any sick animals",
  "inventoryItemsNeeded": [
    { "itemId": "feed_item_id", "qty": 5 }
  ],
  "animalGroupIds": ["group1", "group2"],
  "recurrence": {
    "pattern": "DAILY",
    "interval": 1
  },
  "linkedEventType": "FEED_LIVESTOCK"
}
```

### Task Categories

| Category | Description |
|----------|-------------|
| `FEEDING` | Animal feeding |
| `WATERING` | Water management |
| `HEALTH_CHECK` | Animal health inspections |
| `MEDICATION` | Administering treatments |
| `BREEDING` | Breeding activities |
| `MAINTENANCE` | Equipment/facility upkeep |
| `CLEANING` | Cleaning tasks |
| `HARVESTING` | Crop harvesting |
| `PLANTING` | Planting activities |
| `IRRIGATION` | Watering crops |
| `PEST_CONTROL` | Pest management |
| `EQUIPMENT` | Equipment-related tasks |
| `ADMINISTRATIVE` | Office/admin work |

### Recurrence Patterns

| Pattern | Description |
|---------|-------------|
| `ONCE` | Single occurrence |
| `DAILY` | Every day (or every N days) |
| `WEEKLY` | Specific days of week |
| `BIWEEKLY` | Every two weeks |
| `MONTHLY` | Specific day of month |
| `QUARTERLY` | Every 3 months |
| `YEARLY` | Annual tasks |

### Creating Runlists

Runlists are scheduled collections of task templates:

**Endpoint:** `POST /api/tasks/runlists`

```json
{
  "name": "Daily Morning Chores",
  "description": "All morning tasks for the main farm",
  "siteId": "site123",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "templateIds": ["template1", "template2", "template3"],
  "scheduleTime": "06:00",
  "defaultAssigneeId": "user123"
}
```

### Runlist Lifecycle

1. **DRAFT** - Initial state, configure templates
2. **ACTIVE** - Generating task occurrences daily
3. **PAUSED** - Temporarily stopped
4. **COMPLETED** - End date reached
5. **ARCHIVED** - No longer needed

**Activate:** `POST /api/tasks/runlists/{id}/activate`

**Pause:** `POST /api/tasks/runlists/{id}/pause`

### Working with Task Occurrences

Generated tasks appear as occurrences that workers complete:

**Get Today's Tasks:** `GET /api/tasks/occurrences/today`

**Get My Tasks:** `GET /api/tasks/occurrences/my-tasks`

**Start a Task:** `POST /api/tasks/occurrences/{id}/start`

**Complete a Task:** `POST /api/tasks/occurrences/{id}/complete`

```json
{
  "notes": "Fed all cattle, noticed #A-2024-003 limping",
  "actualDurationMinutes": 50,
  "inventoryConsumed": [
    { "itemId": "feed_item_id", "qty": 6 }
  ],
  "createLinkedEvent": true
}
```

**Skip a Task:** `POST /api/tasks/occurrences/{id}/skip`

```json
{
  "reason": "Rained out - moved to afternoon"
}
```

### Task Statistics

View completion rates and metrics:

**Endpoint:** `GET /api/tasks/stats`

Returns:
- Total tasks
- Tasks by status
- Tasks by category
- Average completion time
- Overdue count
- On-time completion rate

---

## Events & Accounting

All operations in SteadStack create **Events** that flow through the posting engine to create accounting entries.

### How Events Work

```
User Action → Event Created (PENDING)
           → Posting Engine Processes
           → Ledger Entries Created
           → Inventory Updated
           → Event Marked POSTED
```

### Event Types

| Event Type | Description |
|------------|-------------|
| `INVENTORY_ADJUSTMENT` | Stock corrections |
| `INVENTORY_TRANSFER` | Site-to-site moves |
| `RECEIVE_PURCHASE_ORDER` | Inventory receipts |
| `FEED_LIVESTOCK` | Animal feeding |
| `SELL_LIVESTOCK` | Animal sales |
| `PURCHASE_LIVESTOCK` | Animal purchases |
| `SALE` | General sales |

### Viewing Events

**Endpoint:** `GET /api/events`

Query parameters:
- `siteId` - Filter by site
- `type` - Filter by event type
- `status` - Filter by status (PENDING, POSTED, FAILED)
- `startDate`, `endDate` - Date range

### Event Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting processing |
| `PROCESSING` | Currently being posted |
| `POSTED` | Successfully recorded |
| `FAILED` | Error during posting |
| `REVERSED` | Reversed/voided |

### Double-Entry Accounting

Every event creates balanced ledger entries (debits = credits).

Example: Receiving inventory creates:
- **Debit** Inventory Asset account
- **Credit** Accounts Payable (or Cash)

### Chart of Accounts

Default account codes:

| Code | Account |
|------|---------|
| 1000 | Cash |
| 1100 | Accounts Receivable |
| 1200 | Feed Inventory |
| 1300 | Supplies Inventory |
| 1400 | Livestock |
| 2000 | Accounts Payable |
| 4000 | Sales Revenue |
| 5000 | Cost of Goods Sold |
| 6000 | Feed Expense |
| 6100 | Supplies Expense |

---

## User Roles & Permissions

### Role Hierarchy

| Role | Permissions |
|------|-------------|
| `owner` | Full access, manage tenant settings |
| `admin` | Manage users, sites, templates |
| `manager` | Create tasks, approve requisitions, manage livestock |
| `worker` | Complete assigned tasks, record events |

### Permission Matrix

| Action | Owner | Admin | Manager | Worker |
|--------|-------|-------|---------|--------|
| Manage tenant settings | ✓ | ✓ | | |
| Manage users | ✓ | ✓ | | |
| Create/edit sites | ✓ | ✓ | | |
| Create task templates | ✓ | ✓ | | |
| Manage runlists | ✓ | ✓ | ✓ | |
| Approve requisitions | ✓ | ✓ | ✓ | |
| Create events | ✓ | ✓ | ✓ | ✓ |
| Complete tasks | ✓ | ✓ | ✓ | ✓ |
| View data | ✓ | ✓ | ✓ | ✓ |

### Site-Level Permissions

Users can be restricted to specific sites via `sitePermissions` array:
- Empty array = access to all sites
- Specific site IDs = access only to those sites

---

## API Quick Reference

### Authentication

All API requests require a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

### Base URL

```
https://api.steadstack.com/api
```

### Common Response Format

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [...]
}
```

### Rate Limiting

- 100 requests per minute per user
- 1000 requests per minute per tenant

---

## Support

For questions or issues:
- Documentation: https://docs.steadstack.com
- Support: support@steadstack.com
- GitHub Issues: https://github.com/steadstack/steadstack/issues
