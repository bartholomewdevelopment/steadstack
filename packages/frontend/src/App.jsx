import { Routes, Route, Navigate } from 'react-router-dom';
import MarketingLayout from './layouts/MarketingLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Features from './pages/Features';
import About from './pages/About';
import Contact from './pages/Contact';
import { Login, Signup, ForgotPassword } from './pages/auth';
import { DashboardHome, Settings, ComingSoon } from './pages/app';
import { EventsList, EventForm, EventDetail } from './pages/app/events';
import { AnimalsList, AnimalForm, AnimalDetail } from './pages/app/animals';
import { InventoryList, InventoryForm, InventoryDetail } from './pages/app/inventory';
import {
  TodaysTasks,
  TasksList,
  TaskForm,
  TaskDetail,
  RunlistsList,
  RunlistForm,
  RunlistDetail,
} from './pages/app/tasks';
import {
  ChartOfAccounts,
  AccountsReceivable,
  AccountsPayable,
  AccountDetail,
  Invoices,
  CheckWriter,
  Receipts,
  BankDeposit,
  BankReconciliation,
  AccountAnalysis,
  Inquiry,
} from './pages/app/accounting';
import {
  RequisitionsList,
  RequisitionForm,
  RequisitionDetail,
  PurchaseOrdersList,
  PurchaseOrderDetail,
  VendorBillsList,
  VendorBillForm,
  VendorBillDetail,
  PaymentForm,
  APAging,
  VendorsList,
} from './pages/app/purchasing';
import {
  AdminDashboard,
  TenantsList,
  TenantDetail,
  UsersList,
  InquiriesList,
} from './pages/admin';

function App() {
  return (
    <Routes>
      {/* Marketing pages with shared layout */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Auth pages (use marketing layout for consistent header/footer) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Legacy dashboard redirect */}
      <Route path="/dashboard" element={<Navigate to="/app" replace />} />

      {/* Customer Portal - Protected routes with dashboard layout */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        {/* Events Module */}
        <Route path="events" element={<EventsList />} />
        <Route path="events/new" element={<EventForm />} />
        <Route path="events/:id" element={<EventDetail />} />
        {/* Animals Module */}
        <Route path="animals" element={<AnimalsList />} />
        <Route path="animals/new" element={<AnimalForm />} />
        <Route path="animals/:id" element={<AnimalDetail />} />
        <Route path="animals/:id/edit" element={<AnimalForm />} />
        {/* Inventory Module */}
        <Route path="inventory" element={<InventoryList />} />
        <Route path="inventory/new" element={<InventoryForm />} />
        <Route path="inventory/:id" element={<InventoryDetail />} />
        <Route path="inventory/:id/edit" element={<InventoryForm />} />
        {/* Tasks Module */}
        <Route path="tasks" element={<TodaysTasks />} />
        <Route path="tasks/templates" element={<TasksList />} />
        <Route path="tasks/templates/new" element={<TaskForm />} />
        <Route path="tasks/templates/:id" element={<TaskDetail />} />
        <Route path="tasks/templates/:id/edit" element={<TaskForm />} />
        <Route path="tasks/lists" element={<RunlistsList />} />
        <Route path="tasks/lists/new" element={<RunlistForm />} />
        <Route path="tasks/lists/:id" element={<RunlistDetail />} />
        <Route path="tasks/lists/:id/edit" element={<RunlistForm />} />
        {/* Accounting Module */}
        <Route path="accounting" element={<ChartOfAccounts />} />
        <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} />
        <Route path="accounting/accounts/:id" element={<AccountDetail />} />
        <Route path="accounting/ar" element={<AccountsReceivable />} />
        <Route path="accounting/ap" element={<AccountsPayable />} />
        <Route path="accounting/invoices" element={<Invoices />} />
        <Route path="accounting/checks" element={<CheckWriter />} />
        <Route path="accounting/receipts" element={<Receipts />} />
        <Route path="accounting/deposits" element={<BankDeposit />} />
        <Route path="accounting/reconciliation" element={<BankReconciliation />} />
        <Route path="accounting/analysis" element={<AccountAnalysis />} />
        <Route path="accounting/inquiry" element={<Inquiry />} />
        {/* Purchasing Module (P2P) */}
        <Route path="purchasing" element={<RequisitionsList />} />
        <Route path="purchasing/requisitions" element={<RequisitionsList />} />
        <Route path="purchasing/requisitions/new" element={<RequisitionForm />} />
        <Route path="purchasing/requisitions/:id" element={<RequisitionDetail />} />
        <Route path="purchasing/purchase-orders" element={<PurchaseOrdersList />} />
        <Route path="purchasing/purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="purchasing/bills" element={<VendorBillsList />} />
        <Route path="purchasing/bills/new" element={<VendorBillForm />} />
        <Route path="purchasing/bills/:id" element={<VendorBillDetail />} />
        <Route path="purchasing/payments/new" element={<PaymentForm />} />
        <Route path="purchasing/ap-aging" element={<APAging />} />
        <Route path="purchasing/vendors" element={<VendorsList />} />
        {/* Reports (Coming Soon) */}
        <Route path="reports" element={<ComingSoon module="reports" />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Admin Portal - Superadmin only */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="tenants" element={<TenantsList />} />
        <Route path="tenants/:id" element={<TenantDetail />} />
        <Route path="users" element={<UsersList />} />
        <Route path="inquiries" element={<InquiriesList />} />
      </Route>
    </Routes>
  );
}

export default App;
