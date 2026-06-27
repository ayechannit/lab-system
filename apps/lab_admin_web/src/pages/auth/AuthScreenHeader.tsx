import type { ReactNode } from 'react'
import { HeaderThemeMenu } from '../../components/common/HeaderThemeMenu'
import { brandLogo } from './authAssets'

type AuthScreenHeaderProps = {
  trailing?: ReactNode
}

export function AuthScreenHeader({ trailing }: AuthScreenHeaderProps) {
  return (
    <header className="auth-screen-header">
      <div className="auth-screen-header__brand">
        <img
          className="auth-mobile-logo"
          src={brandLogo}
          alt="International Diagnostic & Healthcare Center"
        />
      </div>
      <div className="auth-screen-header__actions">
        <HeaderThemeMenu />
        {trailing}
      </div>
    </header>
  )
}
