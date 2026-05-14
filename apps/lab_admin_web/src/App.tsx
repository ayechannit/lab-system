import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { useAuth } from './hooks/AuthContext'
import { AdminLayout } from './layout/AdminLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { DiscountManagementPage } from './pages/DiscountManagementPage'
import { LabTestCatalogPage } from './pages/LabTestCatalogPage'
import { LabResultManagementPage } from './pages/LabResultManagementPage'
import { LoyaltyPointsManagementPage } from './pages/LoyaltyPointsManagementPage'
import { OrderManagementPage } from './pages/OrderManagementPage'
import { RatingsFeedbackPage } from './pages/RatingsFeedbackPage'
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage'
import { SampleCollectionPage } from './pages/SampleCollectionPage'
import { StaffManagementPage } from './pages/StaffManagementPage'
import { UserManagementPage } from './pages/UserManagementPage'

function RequireAuth() {
  const { signedIn, initializing } = useAuth()
  if (initializing) {
    return (
      <div className="card-body-loading" style={{ minHeight: '40vh' }}>
        <LoadingSpinner layout="block" label="Loading session" />
      </div>
    )
  }
  if (!signedIn) return <Navigate to="/login" replace />
  return <Outlet />
}

export default function App() {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<OrderManagementPage />} />
            <Route path="lab-tests" element={<LabTestCatalogPage />} />
            <Route path="staff" element={<StaffManagementPage />} />
            <Route path="users" element={<UserManagementPage />} />
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
