import { useTranslation } from 'react-i18next'

type ApiConfigBannerProps = {
  /** Default shows dev-server setup hint with localhost example. */
  variant?: 'devServer' | 'signIn' | 'signInOrders' | 'signInResults' | 'settings' | 'reports' | 'notifications'
}

export function ApiConfigBanner({ variant = 'devServer' }: ApiConfigBannerProps) {
  const { t } = useTranslation()

  if (variant === 'signIn') {
    return (
      <div className="card card--muted">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('api.configureSignIn')}</p>
      </div>
    )
  }

  if (variant === 'signInOrders') {
    return (
      <div className="card card--muted">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('api.configureSignInOrders')}</p>
      </div>
    )
  }

  if (variant === 'signInResults') {
    return (
      <div className="card card--muted">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('api.configureSignInResults')}</p>
      </div>
    )
  }

  if (variant === 'settings') {
    return (
      <div className="card card--muted">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('api.configureSettings')}</p>
      </div>
    )
  }

  if (variant === 'reports') {
    return (
      <div className="card card--muted">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('api.configureReports')}</p>
      </div>
    )
  }

  if (variant === 'notifications') {
    return (
      <div className="card card--muted">
        <p style={{ margin: 0, fontSize: '0.9rem' }}>{t('api.configureNotifications')}</p>
      </div>
    )
  }

  return (
    <div className="card card--muted">
      <p style={{ margin: 0, fontSize: '0.9rem' }}>
        {t('api.configureDevServerPrefix')}{' '}
        <code>VITE_API_BASE_URL</code> {t('api.configureDevServerMiddle')}{' '}
        <code>apps/lab_admin_web</code> {t('api.configureDevServerSuffix')}{' '}
        <code>{t('api.configureDevServerExample')}</code>
        {t('api.configureDevServerEnd')}
      </p>
    </div>
  )
}
