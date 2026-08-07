import { BrowserRouter, HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { useAuth } from './hooks/AuthContext'
import { usePermissions } from './hooks/PermissionsContext'
import { AdminLayout } from './layout/AdminLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { AdvertisementsManagementPage } from './pages/AdvertisementsManagementPage'
import { DiscountManagementPage } from './pages/DiscountManagementPage'
import { PermissionsManagementPage } from './pages/PermissionsManagementPage'
import { ReferralFeesManagementPage } from './pages/ReferralFeesManagementPage'
import { ServiceGeofencesManagementPage } from './pages/ServiceGeofencesManagementPage'
import { LabTestCatalogPage } from './pages/LabTestCatalogPage'
import { LabResultManagementPage } from './pages/LabResultManagementPage'
import { LoyaltyPointsManagementPage } from './pages/LoyaltyPointsManagementPage'
import { MembershipTiersManagementPage } from './pages/MembershipTiersManagementPage'
import { OrderManagementPage } from './pages/OrderManagementPage'
import { RatingsFeedbackPage } from './pages/RatingsFeedbackPage'
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage'
import { SampleCollectionPage } from './pages/SampleCollectionPage'
import { StaffManagementPage } from './pages/StaffManagementPage'
import { UserManagementPage } from './pages/UserManagementPage'
import { SystemSettingsPage } from './pages/SystemSettingsPage'
//make deployment new (2026-08-07)
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

/**
 * Guards a module's routes against direct URL navigation, per the admin-configurable
 * role_permissions matrix (kept in sync with AdminLayout's nav filtering). Renders an inline
 * message rather than redirecting, since a role can have any module disabled — including the
 * ones a redirect target would normally land on — and a fixed redirect risks looping.
 */
function RequireModule({ moduleKey }: { moduleKey: string }) {
  const { t } = useTranslation()
  const { loading, hasModule } = usePermissions()
  if (loading) {
    return (
      <div className="card-body-loading" style={{ minHeight: '40vh' }}>
        <LoadingSpinner layout="block" label={t('common.loadingSession')} />
      </div>
    )
  }
  if (!hasModule(moduleKey)) {
    return (
      <div className="card" style={{ margin: '2rem', padding: '2rem', textAlign: 'center' }}>
        <p>{t('common.accessRestricted')}</p>
      </div>
    )
  }
  return <Outlet />
}

/** Guards the Permissions page itself — hardcoded admin-only, not part of the configurable matrix. */
function RequireAdmin() {
  const { role } = useAuth()
  if (role !== 'admin') return <Navigate to="/orders" replace />
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
            <Route element={<RequireModule moduleKey="orders" />}>
              <Route path="orders" element={<OrderManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="lab-tests" />}>
              <Route path="lab-tests" element={<LabTestCatalogPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="collections" />}>
              <Route path="collections" element={<SampleCollectionPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="results" />}>
              <Route path="results" element={<LabResultManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="ratings" />}>
              <Route path="ratings" element={<RatingsFeedbackPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="referral-fees" />}>
              <Route path="referral-fees" element={<ReferralFeesManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="discounts" />}>
              <Route path="discounts" element={<DiscountManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="service-geofences" />}>
              <Route path="service-geofences" element={<ServiceGeofencesManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="advertisements" />}>
              <Route path="advertisements" element={<AdvertisementsManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="loyalty" />}>
              <Route path="loyalty" element={<LoyaltyPointsManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="membership-tiers" />}>
              <Route path="membership-tiers" element={<MembershipTiersManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="reports" />}>
              <Route path="reports" element={<ReportsAnalyticsPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="staff" />}>
              <Route path="staff" element={<StaffManagementPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="system-settings" />}>
              <Route path="system-settings" element={<SystemSettingsPage />} />
            </Route>
            <Route element={<RequireModule moduleKey="users" />}>
              <Route path="users" element={<UserManagementPage />} />
            </Route>
            <Route element={<RequireAdmin />}>
              <Route path="permissions" element={<PermissionsManagementPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
