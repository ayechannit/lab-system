import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { useAuth } from './hooks/AuthContext'
import { useAppLocaleSync } from './hooks/useAppLocaleSync'
import { AdminLayout } from './layout/AdminLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { AdvertisementsManagementPage } from './pages/AdvertisementsManagementPage'
import { DiscountManagementPage } from './pages/DiscountManagementPage'
import { ReferralFeesManagementPage } from './pages/ReferralFeesManagementPage'
import { ServiceGeofencesManagementPage } from './pages/ServiceGeofencesManagementPage'
import { LabTestCatalogPage } from './pages/LabTestCatalogPage'
import { LabResultManagementPage } from './pages/LabResultManagementPage'
import { LoyaltyPointsManagementPage } from './pages/LoyaltyPointsManagementPage'
import { OrderManagementPage } from './pages/OrderManagementPage'
import { RatingsFeedbackPage } from './pages/RatingsFeedbackPage'
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage'
import { SampleCollectionPage } from './pages/SampleCollectionPage'
import { StaffManagementPage } from './pages/StaffManagementPage'
import { UserManagementPage } from './pages/UserManagementPage'
import { SystemSettingsPage } from './pages/SystemSettingsPage'

function RequireAuth() {
  const { t } = useTranslation()
  const { signedIn, initializing } = useAuth()
  if (initializing) {
    return (
      <div className="card-body-loading" style={{ minHeight: '40vh' }}>
        <LoadingSpinner layout="block" label={t('common.loadingSession')} />
      </div>
    )
  }
  if (!signedIn) return <Navigate to="/login" replace />
  return <Outlet />
}

function AppLocaleSync() {
  useAppLocaleSync(true)
  return null
}

export default function App() {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter

  return (
    <Router>
      <AppLocaleSync />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
            <Route path="referral-fees" element={<ReferralFeesManagementPage />} />
            <Route path="service-geofences" element={<ServiceGeofencesManagementPage />} />
            <Route path="advertisements" element={<AdvertisementsManagementPage />} />
            <Route path="loyalty" element={<LoyaltyPointsManagementPage />} />
            <Route path="system-settings" element={<SystemSettingsPage />} />
            <Route path="reports" element={<ReportsAnalyticsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
