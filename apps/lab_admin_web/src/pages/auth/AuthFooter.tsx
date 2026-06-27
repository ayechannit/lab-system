export function AuthFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="auth-footer">
      <div className="auth-footer-disclaimer">
        <span className="material-symbols-outlined" aria-hidden>
          lock_clock
        </span>
        <p>
          Authorized clinical users only. This system is monitored for security and compliance (HIPAA/ISO). All access logs are recorded.
        </p>
      </div>
      <div className="auth-footer-meta">
        <span>© {year} International Diagnostic &amp; Healthcare Center</span>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Security</a>
      </div>
    </footer>
  )
}
