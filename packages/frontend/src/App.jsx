import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// Redirect components for legacy animal routes
function AnimalDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/assets/animals/${id}`} replace />;
}
function AnimalEditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/assets/animals/${id}/edit`} replace />;
}
import MarketingLayout from './layouts/MarketingLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
import AssetsLayout from './layouts/AssetsLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Features from './pages/Features';
import About from './pages/About';
import Contact from './pages/Contact';
import { Login, Signup, ForgotPassword } from './pages/auth';
import { DashboardHome, Settings } from './pages/app';
// Events removed - now part of Tasks
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
  AccountingOverview,
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
  JournalEntries,
  JournalEntryForm,
  JournalEntryDetail,
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
} from './pages/app/purchasing';
import ContactsList from './pages/app/contacts/ContactsList';
import ContactForm from './pages/app/contacts/ContactForm';
import ContactDetail from './pages/app/contacts/ContactDetail';
import {
  AdminDashboard,
  TenantsList,
  TenantDetail,
  UsersList,
  InquiriesList,
} from './pages/admin';
import { Reports } from './pages/app/reports';
import {
  AssetsOverview,
  VehiclesList,
  VehicleForm,
  VehicleDetail,
  EquipmentPlaceholder,
  InfrastructurePlaceholder,
  ToolsPlaceholder,
  OtherAssetsPlaceholder,
} from './pages/app/assets';
import {
  LandOverview,
  SitesList,
  SiteWizard,
  SiteDetail,
  LandTractsList,
  LandTractForm,
  LandTractDetail,
  StructuresList,
  StructureDetail,
} from './pages/app/assets/land';

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
        {/* Events removed - redirects to Tasks (events are now part of tasks) */}
        <Route path="events/*" element={<Navigate to="/app/tasks" replace />} />
        {/* Assets Module - All wrapped with AssetsLayout for shared nav */}
        <Route path="assets" element={<AssetsLayout />}>
          <Route index element={<AssetsOverview />} />
          <Route path="animals" element={<AnimalsList />} />
          <Route path="animals/new" element={<AnimalForm />} />
          <Route path="animals/:id" element={<AnimalDetail />} />
          <Route path="animals/:id/edit" element={<AnimalForm />} />
          <Route path="vehicles" element={<VehiclesList />} />
          <Route path="vehicles/new" element={<VehicleForm />} />
          <Route path="vehicles/:id" element={<VehicleDetail />} />
          <Route path="vehicles/:id/edit" element={<VehicleForm />} />
          {/* Land Module */}
          <Route path="land" element={<LandOverview />} />
          <Route path="land/sites" element={<SitesList />} />
          <Route path="land/sites/new" element={<SiteWizard />} />
          <Route path="land/sites/:siteId" element={<SiteDetail />} />
          <Route path="land/tracts" element={<LandTractsList />} />
          <Route path="land/tracts/new" element={<LandTractForm />} />
          <Route path="land/tracts/:tractId" element={<LandTractDetail />} />
          <Route path="land/tracts/:tractId/edit" element={<LandTractForm />} />
          <Route path="land/structures/:structureId" element={<StructureDetail />} />
          <Route path="structures" element={<StructuresList />} />
          <Route path="buildings" element={<Navigate to="/app/assets/structures" replace />} />
          <Route path="equipment" element={<EquipmentPlaceholder />} />
          <Route path="infrastructure" element={<InfrastructurePlaceholder />} />
          <Route path="tools" element={<ToolsPlaceholder />} />
          <Route path="other" element={<OtherAssetsPlaceholder />} />
        </Route>
        {/* Legacy Animals Routes - Redirect to Assets */}
        <Route path="animals" element={<Navigate to="/app/assets/animals" replace />} />
        <Route path="animals/new" element={<Navigate to="/app/assets/animals/new" replace />} />
        <Route path="animals/:id" element={<AnimalDetailRedirect />} />
        <Route path="animals/:id/edit" element={<AnimalEditRedirect />} />
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
        <Route path="accounting" element={<AccountingOverview />} />
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
        <Route path="accounting/journal-entries" element={<JournalEntries />} />
        <Route path="accounting/journal-entries/new" element={<JournalEntryForm />} />
        <Route path="accounting/journal-entries/:id" element={<JournalEntryDetail />} />
        <Route path="accounting/journal-entries/:id/edit" element={<JournalEntryForm />} />
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
        <Route path="purchasing/vendors" element={<Navigate to="/app/contacts?type=vendor" replace />} />
        {/* Contacts Module */}
        <Route path="contacts" element={<ContactsList />} />
        <Route path="contacts/new" element={<ContactForm />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
        <Route path="contacts/:id/edit" element={<ContactForm />} />
        {/* Reports Module */}
        <Route path="reports" element={<Reports />} />
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
