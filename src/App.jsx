import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { Customers } from './pages/Customers'
import { CustomerDetail } from './pages/CustomerDetail'
import { NewCustomer } from './pages/NewCustomer'
import { Jobs } from './pages/Jobs'
import { JobDetail } from './pages/JobDetail'
import { NewJob } from './pages/NewJob'
import { Dispatch } from './pages/Dispatch'
import { Estimates } from './pages/Estimates'
import { NewEstimate } from './pages/NewEstimate'
import { EstimateDetail } from './pages/EstimateDetail'
import { Invoices } from './pages/Invoices'
import { NewInvoice } from './pages/NewInvoice'
import { InvoiceDetail } from './pages/InvoiceDetail'
import { Team } from './pages/Team'
import { NewTech } from './pages/NewTech'
import { TechDetail } from './pages/TechDetail'
import { ServiceRequests } from './pages/ServiceRequests'
import { Reports } from './pages/Reports'

import { PortalLayout } from './pages/portal/PortalLayout'
import { PortalDashboard } from './pages/portal/PortalDashboard'
import { PortalJobs } from './pages/portal/PortalJobs'
import { PortalInvoices } from './pages/portal/PortalInvoices'
import { PortalRequestService } from './pages/portal/PortalRequestService'

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

function AdminProtected({ children }) {
  const { user, isAdmin, isTech, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin && !isTech) return <Navigate to="/portal" replace />
  return children
}

function CustomerProtected({ children }) {
  const { user, isCustomer, isAdmin, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function PublicOnly({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to={isAdmin ? '/dashboard' : '/portal'} replace />
  return children
}

export default function App() {
  return (
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
        <Route path="/team/:id" element={<TechDetail />} />
        <Route path="/estimates" element={<Estimates />} />
        <Route path="/estimates/new" element={<NewEstimate />} />
        <Route path="/estimates/:id" element={<EstimateDetail />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<NewInvoice />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/reports" element={<Reports />} />
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
  )
}
