import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HeaderLanguageMenu } from '../../components/common/HeaderLanguageMenu'
import { HeaderThemeMenu } from '../../components/common/HeaderThemeMenu'
import { brandLogo } from './authAssets'

type AuthScreenHeaderProps = {
  trailing?: ReactNode
}

export function AuthScreenHeader({ trailing }: AuthScreenHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="auth-screen-header">
      <div className="auth-screen-header__brand">
        <img className="auth-mobile-logo" src={brandLogo} alt={t('auth.brandAlt')} />
      </div>
      <div className="auth-screen-header__actions">
        <HeaderLanguageMenu />
        <HeaderThemeMenu />
        {trailing}
      </div>
    </header>
  )
}
