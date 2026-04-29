import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMockAuth } from '../../hooks/MockAuthContext'
import type { StaffRole } from '../../mock-data/types'
import { authImages } from './authAssets'
import { AuthFooter } from './AuthFooter'
import { AuthMarketingPanel } from './AuthMarketingPanel'
import './auth-screens.css'

const roleMap: Record<string, StaffRole> = {
  lab_tech: 'lab_technician',
  admin: 'admin',
  clinical_lead: 'manager',
  pathologist: 'lab_technician',
}

export function SignUpPage() {
  const { signIn, setRole, signedIn } = useMockAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roleKey, setRoleKey] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  if (signedIn) return <Navigate to="/" replace />

  return (
    <div className="auth-split">
      <AuthMarketingPanel
        heroImage={authImages.signUpHero}
        headline="Join the Future of Lab Management"
        lead="Deploy enterprise-grade laboratory information systems designed for precision, security, and global compliance."
      />
      <div className="auth-side">
        <header className="auth-mobile-header">
          <div className="auth-mobile-brand">
            <span className="material-symbols-outlined">biotech</span>
            <span>MedLab Smart </span>
          </div>
          <a className="auth-help-link" href="#">
            Help
          </a>
        </header>
        <div className="auth-main">
          <div className="auth-form-wrap auth-form-wrap--signup">
            <div className="auth-icon-tile">
              <span className="material-symbols-outlined">person_add</span>
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Access the clinical laboratory management suite.</p>

            <form
              className="auth-stack"
              style={{ marginTop: '2rem' }}
              onSubmit={(e) => {
                e.preventDefault()
                if (password.length < 4 || password !== confirm) {
                  window.alert('Passwords must match and be at least 4 characters (demo).')
                  return
                }
                if (!roleKey) {
                  window.alert('Please select your professional role.')
                  return
                }
                const mapped = roleMap[roleKey]
                if (mapped) setRole(mapped)
                signIn()
                navigate('/')
              }}
            >
              <div className="auth-grid-2">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="full_name">
                    Full Name
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">person</span>
                    <input
                      id="full_name"
                      className="auth-input"
                      placeholder="Dr. Jane Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="email">
                    Professional Email
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">mail</span>
                    <input
                      id="email"
                      className="auth-input"
                      type="email"
                      placeholder="jane.smith@hospital.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="role">
                  Role
                </label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">badge</span>
                  <select
                    id="role"
                    className="auth-input auth-select"
                    value={roleKey}
                    onChange={(e) => setRoleKey(e.target.value)}
                  >
                    <option value="">Select your professional role</option>
                    <option value="lab_tech">Lab Tech</option>
                    <option value="admin">Administrator</option>
                    <option value="clinical_lead">Clinical Lead</option>
                    <option value="pathologist">Pathologist</option>
                  </select>
                  <span className="material-symbols-outlined auth-chevron">expand_more</span>
                </div>
              </div>

              <div className="auth-grid-2">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="password">
                    Password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock</span>
                    <input
                      id="password"
                      className="auth-input"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="confirm_password">
                    Confirm Password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock_reset</span>
                    <input
                      id="confirm_password"
                      className="auth-input"
                      type="password"
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="auth-primary-btn">
                <span>Sign Up</span>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                  app_registration
                </span>
              </button>
            </form>

            <div className="auth-bottom-link" style={{ paddingBottom: '2rem' }}>
              <span>Already have an account? </span>
              <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
        <AuthFooter />
      </div>
    </div>
  )
}
