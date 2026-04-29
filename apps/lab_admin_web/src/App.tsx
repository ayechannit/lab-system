import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { OrderLabProvider } from './context/OrderLabContext'
import { useMockAuth } from './hooks/MockAuthContext'
import { AdminLayout } from './layout/AdminLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { SignUpPage } from './pages/auth/SignUpPage'
import { DiscountManagementPage } from './pages/DiscountManagementPage'
import { LabResultManagementPage } from './pages/LabResultManagementPage'
import { LoyaltyPointsManagementPage } from './pages/LoyaltyPointsManagementPage'
import { OrderManagementPage } from './pages/OrderManagementPage'
import { RatingsFeedbackPage } from './pages/RatingsFeedbackPage'
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage'
import { SampleCollectionPage } from './pages/SampleCollectionPage'

function RequireAuth() {
  const { signedIn } = useMockAuth()
  if (!signedIn) return <Navigate to="/login" replace />
  return <Outlet />
}

function AdminShell() {
  return (
    <OrderLabProvider>
      <AdminLayout />
    </OrderLabProvider>
  )
}

export default function App() {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<AdminShell />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<OrderManagementPage />} />
            <Route path="collections" element={<SampleCollectionPage />} />
            <Route path="results" element={<LabResultManagementPage />} />
            <Route path="ratings" element={<RatingsFeedbackPage />} />
            <Route path="discounts" element={<DiscountManagementPage />} />
            <Route path="loyalty" element={<LoyaltyPointsManagementPage />} />
            <Route path="reports" element={<ReportsAnalyticsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
