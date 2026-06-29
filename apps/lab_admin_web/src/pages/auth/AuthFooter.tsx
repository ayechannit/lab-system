import { useTranslation } from 'react-i18next'

export function AuthFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="auth-footer">
      <div className="auth-footer-disclaimer">
        <span className="material-symbols-outlined" aria-hidden>
          lock_clock
        </span>
        <p>{t('footer.disclaimer')}</p>
      </div>
      <div className="auth-footer-meta">
        <span>{t('footer.copyright', { year })}</span>
        <a href="#">{t('footer.privacy')}</a>
        <a href="#">{t('footer.terms')}</a>
        <a href="#">{t('footer.security')}</a>
      </div>
    </footer>
  )
}
