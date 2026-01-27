# SteadStack User Guide

Welcome to SteadStack! This guide will help you get started with managing your farm or ranch operations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Setting Up Your Farm](#setting-up-your-farm)
3. [Managing Assets](#managing-assets)
4. [Daily Operations](#daily-operations)
5. [Inventory Management](#inventory-management)
6. [Purchasing](#purchasing)
7. [Accounting](#accounting)
8. [Reports](#reports)
9. [Tips and Best Practices](#tips-and-best-practices)

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

## Managing Assets

### Livestock (Animals)

Go to **Assets > Livestock** to manage your animals.

**Adding a new animal:**
1. Click **+ Add Animal**
2. Fill in the details:
   - **Tag Number** - Your identification system
   - **Name** - Optional name for the animal
   - **Species** - Cattle, Sheep, Goats, Pigs, Horses, Poultry, Other
   - **Breed** - Specific breed
   - **Birth Date** - When the animal was born
   - **Status** - Active, Sold, Deceased, Transferred
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

### Land & Sites

Go to **Assets > Land** to manage your property.

- **Sites** - Your main locations (farms, ranches)
- **Land Tracts** - Individual parcels, pastures, or fields within sites

You can view sites on a map and track acreage, land use, and ownership details.

---

## Daily Operations

### Tasks

Go to **Tasks** in the sidebar for your daily workflow.

**Today's Tasks** shows what needs to be done today:
- Tasks are color-coded by priority
- Check off tasks as you complete them
- Overdue tasks appear highlighted

**Task Templates** let you create reusable tasks:
1. Go to **Tasks > Templates**
2. Click **+ New Template**
3. Define the task (e.g., "Morning Feeding")
4. Optionally select a **Location (Land Tract)** - the pasture, field, or barn where the task will be performed. Leave blank for off-site tasks like store runs.
5. Add step-by-step instructions and required equipment
6. Set recurrence (daily, weekly, monthly)
7. Assign to specific sites or animals

**Run Lists** group multiple tasks into checklists:
- Great for morning routines, weekly inspections, or seasonal work
- Work through them step-by-step

---

## Inventory Management

Go to **Inventory** to track supplies.

### Adding Inventory Items

1. Click **+ Add Item**
2. Enter:
   - **Name** - e.g., "Cattle Feed - 50lb bag"
   - **Category** - Feed, Medicine, Supplies, Equipment, Fuel, Seed, Fertilizer, Other
   - **Quantity** - Current count
   - **Unit** - bags, gallons, pounds, etc.
   - **Reorder Point** - When to buy more (triggers low stock alert)
   - **Location** - Where it's stored

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
3. **Vendor Bill** - Record the invoice when goods arrive
4. **Payment** - Pay the vendor

### Creating a Requisition

1. Go to **Purchasing > Requisitions**
2. Click **+ New Requisition**
3. Add line items with quantities and estimated costs
4. Submit for approval (or approve yourself)

### Managing Vendors

Go to **Purchasing > Vendors** to:
- Add new vendors with contact information
- View purchase history
- Track what you owe each vendor

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
| **ASSET** | Things you own (cash, equipment, livestock) |
| **LIABILITY** | What you owe (loans, accounts payable) |
| **EQUITY** | Owner's stake in the business |
| **INCOME** | Money coming in (sales, services) |
| **COGS** | Cost of goods sold (direct costs) |
| **EXPENSE** | Operating costs (feed, fuel, repairs) |

### Accounts Receivable (A/R)

Go to **Accounting > A/R** to track money customers owe you:
- Create invoices for sales
- Record payments received
- Monitor aging to follow up on overdue invoices

### Accounts Payable (A/P)

Go to **Accounting > A/P** to track money you owe:
- Enter vendor bills
- Schedule payments
- Monitor aging to avoid late fees

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

### Use Reorder Points

Set reorder points on all inventory items so you never run out of critical supplies.

### Regular Reconciliation

Reconcile your bank accounts monthly to catch errors and ensure accurate books.

### Leverage Tooltips

Hover over the **?** icons throughout the app for contextual help explaining what each feature does.

---

## Need Help?

- **In-app help:** Look for ? icons for explanations
- **Support:** Contact support through the Settings page
- **Documentation:** Refer back to this guide anytime

---

Happy farming!
