import { brandLogo } from './authAssets'

type AuthMarketingPanelProps = {
  heroImage: string
  headline: string
  lead: string
}

export function AuthMarketingPanel({ heroImage, headline, lead }: AuthMarketingPanelProps) {
  return (
    <div className="auth-hero">
      <img className="auth-hero__img" src={heroImage} alt="" />
      <div className="auth-hero__gradient" />
      <div className="auth-hero__inner">
        <div className="auth-brand">
          <img
            className="auth-hero__logo"
            src={brandLogo}
            alt="International Diagnostic & Healthcare Center"
          />
        </div>
        <div className="auth-hero__copy">
          <h2 className="auth-hero__headline">{headline}</h2>
          <p className="auth-hero__lead">{lead}</p>
        </div>
        <div className="auth-badges" aria-label="Security and compliance highlights">
          <div className="auth-badge-chip">
            <span className="material-symbols-outlined">verified_user</span>
            <span>ISO 15189 Certified</span>
          </div>
          <div className="auth-badge-chip">
            <span className="material-symbols-outlined">encrypted</span>
            <span>HIPAA Compliant</span>
          </div>
        </div>
      </div>
    </div>
  )
}
