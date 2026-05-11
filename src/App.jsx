import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { Customers } from './pages/Customers'

const CustomerDetail = lazy(() => import('./pages/CustomerDetail').then(m => ({ default: m.CustomerDetail })))
const NewCustomer = lazy(() => import('./pages/NewCustomer').then(m => ({ default: m.NewCustomer })))
const Jobs = lazy(() => import('./pages/Jobs').then(m => ({ default: m.Jobs })))
const JobDetail = lazy(() => import('./pages/JobDetail').then(m => ({ default: m.JobDetail })))
const NewJob = lazy(() => import('./pages/NewJob').then(m => ({ default: m.NewJob })))
const Dispatch = lazy(() => import('./pages/Dispatch').then(m => ({ default: m.Dispatch })))
const Estimates = lazy(() => import('./pages/Estimates').then(m => ({ default: m.Estimates })))
const NewEstimate = lazy(() => import('./pages/NewEstimate').then(m => ({ default: m.NewEstimate })))
const EstimateDetail = lazy(() => import('./pages/EstimateDetail').then(m => ({ default: m.EstimateDetail })))
const Invoices = lazy(() => import('./pages/Invoices').then(m => ({ default: m.Invoices })))
const NewInvoice = lazy(() => import('./pages/NewInvoice').then(m => ({ default: m.NewInvoice })))
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail').then(m => ({ default: m.InvoiceDetail })))
const Team = lazy(() => import('./pages/Team').then(m => ({ default: m.Team })))
const NewTech = lazy(() => import('./pages/NewTech').then(m => ({ default: m.NewTech })))
const TechAdminDetail = lazy(() => import('./pages/TechDetail').then(m => ({ default: m.TechDetail })))
const ServiceRequests = lazy(() => import('./pages/ServiceRequests').then(m => ({ default: m.ServiceRequests })))
const Contracts = lazy(() => import('./pages/Contracts').then(m => ({ default: m.Contracts })))
const NewContract = lazy(() => import('./pages/NewContract').then(m => ({ default: m.NewContract })))
const ContractDetail = lazy(() => import('./pages/ContractDetail').then(m => ({ default: m.ContractDetail })))
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })))
const Reviews = lazy(() => import('./pages/Reviews').then(m => ({ default: m.Reviews })))
const RoutesPage = lazy(() => import('./pages/Routes').then(m => ({ default: m.Routes })))
const CalendarConnect = lazy(() => import('./pages/CalendarConnect').then(m => ({ default: m.CalendarConnect })))
const PublicReview = lazy(() => import('./pages/PublicReview').then(m => ({ default: m.PublicReview })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))

const PortalLayout = lazy(() => import('./pages/portal/PortalLayout').then(m => ({ default: m.PortalLayout })))
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard').then(m => ({ default: m.PortalDashboard })))
const PortalJobs = lazy(() => import('./pages/portal/PortalJobs').then(m => ({ default: m.PortalJobs })))
const PortalInvoices = lazy(() => import('./pages/portal/PortalInvoices').then(m => ({ default: m.PortalInvoices })))
const PortalRequestService = lazy(() => import('./pages/portal/PortalRequestService').then(m => ({ default: m.PortalRequestService })))

const TechLayout = lazy(() => import('./pages/tech/TechLayout').then(m => ({ default: m.TechLayout })))
const TechDashboard = lazy(() => import('./pages/tech/TechDashboard').then(m => ({ default: m.TechDashboard })))
const TechJobDetail = lazy(() => import('./pages/tech/TechJobDetail').then(m => ({ default: m.TechJobDetail })))
const TechJobsList = lazy(() => import('./pages/tech/TechJobsList').then(m => ({ default: m.TechJobsList })))
const TechTimeLog = lazy(() => import('./pages/tech/TechTimeLog').then(m => ({ default: m.TechTimeLog })))

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-navy-200 border-t-ember-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  )
}

function PageSpinner() {
  return (
    <div className="py-20 text-center">
      <div className="w-8 h-8 border-2 border-navy-200 border-t-ember-600 rounded-full animate-spin mx-auto mb-2"></div>
      <p className="text-xs text-slate-400">Loading…</p>
    </div>
  )
}

function AdminProtected({ children }) {
  const { user, isAdmin, isTech, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (isTech && !isAdmin) return <Navigate to="/tech" replace />
  if (!isAdmin && !isTech) return <Navigate to="/portal" replace />
  return children
}

function TechProtected({ children }) {
  const { user, isTech, isAdmin, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isTech && !isAdmin) return <Navigate to="/portal" replace />
  return children
}

function CustomerProtected({ children }) {
  const { user, isAdmin, isTech, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/dashboard" replace />
  if (isTech) return <Navigate to="/tech" replace />
  return children
}

function PublicOnly({ children }) {
  const { user, isAdmin, isTech, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) {
    const dest = isAdmin ? '/dashboard' : isTech ? '/tech' : '/portal'
    return <Navigate to={dest} replace />
  }
  return children
}

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />

        <Route element={<AdminProtected><Layout /></AdminProtected>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<NewCustomer />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/new" element={<NewJob />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/requests" element={<ServiceRequests />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/new" element={<NewTech />} />
          <Route path="/team/:id" element={<TechAdminDetail />} />
          <Route path="/estimates" element={<Estimates />} />
          <Route path="/estimates/new" element={<NewEstimate />} />
          <Route path="/estimates/:id" element={<EstimateDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<NewInvoice />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contracts/new" element={<NewContract />} />
          <Route path="/contracts/:id" element={<ContractDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/calendar" element={<CalendarConnect />} />
        </Route>

        <Route path="/review/:token" element={<PublicReview />} />

        <Route path="/tech" element={<TechProtected><TechLayout /></TechProtected>}>
          <Route index element={<TechDashboard />} />
          <Route path="jobs" element={<TechJobsList />} />
          <Route path="jobs/:id" element={<TechJobDetail />} />
          <Route path="time" element={<TechTimeLog />} />
        </Route>

        <Route path="/portal" element={<CustomerProtected><PortalLayout /></CustomerProtected>}>
          <Route index element={<PortalDashboard />} />
          <Route path="jobs" element={<PortalJobs />} />
          <Route path="invoices" element={<PortalInvoices />} />
          <Route path="request-service" element={<PortalRequestService />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
