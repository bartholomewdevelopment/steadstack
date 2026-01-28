# SteadStack User Guide

Welcome to SteadStack! This guide will help you get started with managing your farm or ranch operations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Setting Up Your Farm](#setting-up-your-farm)
3. [Managing Contacts](#managing-contacts)
4. [Managing Assets](#managing-assets)
5. [Daily Operations](#daily-operations)
6. [Inventory Management](#inventory-management)
7. [Purchasing](#purchasing)
8. [Accounting](#accounting)
9. [Reports](#reports)
10. [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

### Step 1: Create Your Account

1. Go to https://stead-stack.web.app
2. Click **Get Started** or **Sign Up**
3. Enter your email address and create a password
4. Verify your email if prompted
5. You'll be redirected to your dashboard

### Step 2: Understand the Dashboard

When you first log in, you'll see the Dashboard Home with:

- **Stats Cards** - Quick overview of livestock count, open tasks, low stock items, and recent events
- **Quick Actions** - Buttons to log events, add animals, add inventory, and view reports
- **Recent Livestock** - Your most recently added animals
- **Recent Events** - Farm activities you've logged

Look for the **?** icons throughout the app - hover over them for helpful explanations of what each feature does.

---

## Setting Up Your Farm

### Step 3: Create Your First Site

A "site" represents a physical location like a farm, ranch, pasture, or barn.

1. Look at the **sidebar** on the left
2. Find the **site selector** dropdown (usually shows "No site selected" initially)
3. Click it and select **+ Add Site**
4. Enter your site details:
   - **Name** - e.g., "Main Ranch" or "North Pasture"
   - **Address** - Physical location
   - **Description** - Optional notes
5. Click **Create Site**

You can add multiple sites if you manage multiple locations.

### Step 4: Set Up Your Chart of Accounts

Before tracking finances, set up your accounting structure:

1. Go to **Accounting** in the sidebar
2. You'll see the **Chart of Accounts** page
3. You have two options:

**Option A: Add accounts manually**
- Click **+ Add Account**
- Enter the account code (e.g., "1000"), name (e.g., "Cash"), and type (Asset, Liability, Equity, Income, Expense, or COGS)

**Option B: Import from CSV** (recommended for existing farms)
- Click **Import CSV**
- Upload a CSV file with columns: `code`, `name`, `type`, `subtype` (optional), `description` (optional)
- Preview and click **Import**

Example CSV:
```
code,name,type,subtype,description
1000,Cash,ASSET,CASH,Main operating account
1100,Accounts Receivable,ASSET,AR,Customer receivables
2000,Accounts Payable,LIABILITY,AP,Vendor payables
4000,Livestock Sales,INCOME,SALES,Revenue from animal sales
6000,Feed Expense,EXPENSE,FEED,Animal feed costs
```

---

## Managing Contacts

Go to **Contacts** in the sidebar to manage all your people and businesses.

### Contact Types

SteadStack uses a unified contact system for everyone you work with:

| Type | Description |
|------|-------------|
| **Employee** | Farm workers, managers, and the farm owner |
| **Contractor** | Outside workers hired for specific jobs |
| **Vendor** | Suppliers you purchase from |
| **Customer** | People or businesses you sell to |
| **Company** | Other businesses and organizations |

### Adding a Contact

1. Click **+ Add Contact**
2. Select the contact type
3. Fill in the basic information:
   - **Name** - First and last name (or company name)
   - **Email** - Required for vendors if you want to email POs
   - **Phone** - Primary contact number
   - **Labor Rate** - Hourly rate (useful for all contact types)
4. Add type-specific details as needed
5. Click **Save**

### Tips for Contacts

- **Vendors need email addresses** to receive purchase orders electronically
- **All contacts can have a labor rate** for tracking the value of their time
- Use the **type filter** to quickly find specific contact types

---

## Managing Assets

### Livestock (Animals)

Go to **Assets > Livestock** to manage your animals.

**Animal Groups** (herds, flocks, pens):
1. Click **+ Add Group**
2. Enter group details:
   - **Name** - e.g., "Main Herd" or "Breeding Ewes"
   - **Species** - Cattle, Sheep, Goats, Pigs, Horses, Poultry, etc.
   - **Current Count** - Number of animals in the group
3. Click **Save**

**Individual Animals**:
1. Click **+ Add Animal**
2. Fill in the details:
   - **Tag Number** - Your identification system
   - **Name** - Optional name for the animal
   - **Species** - Cattle, Sheep, Goats, Pigs, Horses, Poultry, Other
   - **Breed** - Specific breed
   - **Birth Date** - When the animal was born
   - **Status** - Active, Sold, Deceased, Transferred
   - **Group** - Assign to an existing group
3. Click **Save**

**Viewing animal details:**
- Click any animal's tag number to see full details
- View history, health records, and related events

### Vehicles

Go to **Assets > Vehicles** to track trucks, tractors, ATVs, and other vehicles.

**Adding a vehicle:**
1. Click **+ Add Vehicle**
2. Enter details like make, model, year, VIN, license plate
3. Track mileage, maintenance schedules, and fuel usage

### Land & Structures

Go to **Assets > Land** to manage your property.

**Hierarchy:**
- **Sites** - Your main locations (farms, ranches)
- **Land Tracts** - Individual parcels, pastures, or fields within sites
- **Structures** - Buildings on land tracts (barns, shops, sheds, coops)
- **Areas** - Divisions within structures (e.g., "East Wing", "Feed Storage")
- **Bins** - Storage containers with optional capacity tracking

**Adding a Structure:**
1. Go to **Assets > Land > Structures**
2. Click **+ Add Structure**
3. Select the parent land tract
4. Enter structure details:
   - **Name** - e.g., "Main Barn" or "Equipment Shop"
   - **Type** - Barn, Shop, Shed, Garage, Greenhouse, Coop, etc.
5. Click **Save**

**Adding Areas and Bins:**
1. Open a structure detail page
2. Click **+ Add Area** to create divisions
3. Click **+ Add Bin** to add storage containers with optional capacity

You can view sites on a map and track acreage, land use, and ownership details.

---

## Daily Operations

### Tasks

Go to **Tasks** in the sidebar for your daily workflow.

**Today's Tasks** shows what needs to be done today:
- Tasks are color-coded by priority (Urgent, High, Medium, Low)
- **Drag and drop** to reorder tasks
- Use quick action buttons to start, complete, or skip tasks
- Overdue tasks appear highlighted

**Task Templates** let you create reusable tasks:
1. Go to **Tasks > Templates**
2. Click **+ New Template**
3. Define the task:
   - **Name** - e.g., "Morning Feeding"
   - **Category** - Feeding, Watering, Health Check, Medication, etc.
   - **Priority** - Urgent, High, Medium, Low
   - **Location** - Select a land tract where the task will be performed
   - **Instructions** - Step-by-step directions
   - **Inventory Items** - Supplies needed (with allocation mode: Total or Per Animal)
4. Set recurrence (daily, weekly, biweekly, monthly, quarterly, annually)
5. Assign to specific sites or animals
6. Click **Save**

**Run Lists** group multiple tasks into checklists:
1. Go to **Tasks > Lists**
2. Click **+ New Run List**
3. Add task templates to the list
4. Activate the run list to generate daily tasks
- Great for morning routines, weekly inspections, or seasonal work
- Work through them step-by-step

**Completing Tasks with Inventory:**
When you complete a task that has inventory items assigned:
- The system automatically deducts the items from your site's inventory
- Costs are tracked based on your inventory's weighted average cost
- You can optionally mark the task as an "event" to post to accounting

---

## Inventory Management

Go to **Inventory** to track supplies.

### Adding Inventory Items

1. Click **+ Add Item**
2. Enter:
   - **Name** - e.g., "Cattle Feed - 50lb bag"
   - **SKU** - Optional stock keeping unit
   - **Category** - Feed, Medicine, Supplies, Equipment Parts
   - **Reorder Point** - When to buy more (triggers low stock alert)
   - **Reorder Quantity** - Default quantity to order
3. Click **Save**

### Site Inventory Balances

Each site tracks its own inventory separately:
- **Quantity on Hand** - Current count at this site
- **Average Cost** - Weighted average cost per unit
- **Total Value** - Current inventory value

Inventory is automatically updated when:
- Receipts are posted (adds inventory)
- Tasks are completed (deducts inventory)
- Manual adjustments are made

### Low Stock Alerts

Items that fall below their reorder point appear:
- On the Dashboard as "Low Stock Items"
- Highlighted in the Inventory list
- This helps you know when to reorder

---

## Purchasing

Go to **Purchasing** for the procure-to-pay workflow.

### The P2P Process

1. **Requisition** - Request items you need
2. **Purchase Order** - Formalize the order with a vendor
3. **Receipt** - Receive the goods and update inventory
4. **Vendor Bill** - Record the invoice
5. **Payment** - Pay the vendor

### Creating a Requisition

1. Go to **Purchasing > Requisitions**
2. Click **+ New Requisition**
3. Add line items:
   - Select an inventory item (quantity auto-fills from reorder quantity)
   - Or enter custom items
4. Submit for approval (or approve yourself)

### Creating a Purchase Order

1. Go to **Purchasing > Orders**
2. Click **+ New PO**
3. Select a vendor
4. Add line items with quantities and unit costs
5. Choose how to send:
   - **Email** - Send directly to vendor (requires vendor email)
   - **Phone** - Record that you called
   - **Walk-in** - In-store purchase
   - **Online** - Placed on vendor website
6. Click **Send**

### Receiving Goods

1. Open the PO
2. Click **Create Receipt**
3. Enter quantities received for each line
4. Click **Post Receipt**

When you post a receipt:
- Inventory quantities are updated automatically
- Average cost is recalculated (weighted average)
- Accounting entries are created (Debit Inventory, Credit A/P)

### A/P Aging

The **A/P Aging** report shows outstanding bills by age:
- Current
- 1-30 days
- 31-60 days
- 61-90 days
- 90+ days

This helps you prioritize payments and avoid late fees.

---

## Accounting

### Chart of Accounts

Your chart of accounts organizes all financial tracking:

| Type | What It Tracks |
|------|----------------|
| **ASSET** | Things you own (cash, equipment, livestock, inventory) |
| **LIABILITY** | What you owe (loans, accounts payable) |
| **EQUITY** | Owner's stake in the business |
| **INCOME** | Money coming in (sales, services) |
| **COGS** | Cost of goods sold (direct costs) |
| **EXPENSE** | Operating costs (feed, fuel, repairs) |

### Journal Entries

For manual accounting adjustments, use the Journal Entry feature:

1. Go to **Accounting** in the sidebar
2. Click **Journal Entry** button (next to Import CSV)
3. Fill in the entry details:
   - **Entry Date** - When the transaction occurred
   - **Reference** - Optional reference number
   - **Memo** - Description of the entry
4. Add line items:
   - Select an **Account** for each line
   - Enter either a **Debit** or **Credit** amount
   - Add a description for each line
5. The entry must be balanced (total debits = total credits)
6. Choose to **Save as Draft** or **Save & Post**

**Working with Journal Entries:**
- **Draft entries** can be edited or deleted
- **Posted entries** create ledger transactions and cannot be edited
- To correct a posted entry, use the **Reverse** action to create an offsetting entry
- View all journal entries in **Accounting > Journal Entries**

### Automatic Posting

SteadStack automatically creates accounting entries when:
- **Receipts are posted** (inventory received) - Debits inventory, credits A/P
- **Events are logged** (feeding, treatments, etc.) - Posts costs and inventory movements
- **Bills are posted** - Debits expense accounts, credits A/P
- **Checks are posted** - Debits A/P, credits cash
- **Invoices are sent** - Debits A/R, credits revenue
- **Payments are received** - Debits cash, credits A/R

Every entry includes:
- Balanced debits and credits
- Link to the source document for audit trails
- Timestamps and user tracking

### Accounts Receivable (A/R)

Go to **Accounting > A/R** to track money customers owe you:
- **Create invoices** for sales
- **Send invoices** to customers (automatically posts to the ledger)
- **Record receipts** when payments arrive (posts to reduce A/R balance)
- **Monitor aging** to follow up on overdue invoices

When you send an invoice, it automatically:
- Debits Accounts Receivable
- Credits Revenue accounts

### Accounts Payable (A/P)

Go to **Accounting > A/P** to track money you owe:
- **Enter vendor bills** (automatically posts to the ledger)
- **Write checks** to pay bills (posts to reduce A/P balance)
- **Monitor aging** to avoid late fees

When you post a bill, it automatically:
- Debits Expense/COGS accounts
- Credits Accounts Payable

### Banking

- **Checks** - Write checks to pay bills
- **Deposits** - Record bank deposits
- **Receipts** - Record cash/check receipts
- **Reconciliation** - Match your books to bank statements

### Analysis & Inquiry

- **Analysis** - View account activity and trends
- **Inquiry** - Drill into specific transactions

---

## Reports

Go to **Reports** for financial statements and analytics:

- **Income Statement** - Revenue minus expenses
- **Balance Sheet** - Assets, liabilities, and equity
- **Cash Flow** - Money in and out
- **Custom Reports** - Build your own views

---

## Tips and Best Practices

### Daily Workflow

1. **Morning:** Check Today's Tasks, complete morning chores
2. **During the day:** Log events as they happen (feedings, treatments, movements)
3. **End of day:** Review and check off completed tasks

### Keep Data Current

- Add animals when they're born or purchased
- Update status when animals are sold or transferred
- Log events promptly for accurate records
- Post receipts immediately when goods arrive

### Use Reorder Points

Set reorder points on all inventory items so you never run out of critical supplies.

### Task Templates Save Time

Create templates for recurring tasks:
- Include step-by-step instructions
- Assign inventory items that get consumed
- Set appropriate recurrence patterns
- Assign to specific locations

### Regular Reconciliation

Reconcile your bank accounts monthly to catch errors and ensure accurate books.

### Leverage Tooltips

Hover over the **?** icons throughout the app for contextual help explaining what each feature does.

### Organize with Structures

Use the Structures feature to organize your physical spaces:
- Create areas within buildings for logical organization
- Add bins with capacity tracking for storage management
- Link tasks to specific locations

---

## Need Help?

- **In-app help:** Look for ? icons for explanations
- **Support:** Contact support through the Settings page
- **Documentation:** Refer back to this guide anytime

---

Happy farming!
