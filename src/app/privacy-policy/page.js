// V-ENT Privacy Policy - server component, no client deps. The route is
// publicly accessible from auth pages, the landing footer, and Settings, so we
// keep it shell-free for predictable rendering and zero auth coupling.

export const metadata = {
  title: 'Privacy Policy - V-ENT (Vermillion Encore)',
  description: 'How V-ENT collects, uses, shares, and protects your data.',
};

const containerStyle = {
  minHeight: '100vh',
  background: '#131316',
  color: '#E6E6E6',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const innerStyle = {
  maxWidth: '880px',
  margin: '0 auto',
  padding: '3rem clamp(1rem, 4vw, 2.5rem)',
};

const headingStyle = {
  fontSize: '2.25rem',
  fontWeight: 700,
  marginBottom: '0.4rem',
  letterSpacing: '-0.01em',
  color: '#fff',
};

const subStyle = {
  color: 'rgba(230,230,230,0.55)',
  fontSize: '0.95rem',
  marginBottom: '2rem',
};

const sectionStyle = {
  marginTop: '1.5rem',
  background: '#212225',
  borderRadius: '12px',
  padding: '1.4rem 1.5rem',
};

const sectionTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: 600,
  marginTop: 0,
  marginBottom: '0.6rem',
  color: '#fff',
};

const paragraphStyle = {
  color: 'rgba(230,230,230,0.78)',
  fontSize: '0.95rem',
  lineHeight: '1.65',
  margin: 0,
};

const listStyle = {
  color: 'rgba(230,230,230,0.78)',
  fontSize: '0.95rem',
  lineHeight: '1.7',
  paddingLeft: '1.25rem',
  margin: 0,
};

const linkStyle = {
  color: '#D4AF37',
  textDecoration: 'underline',
};

const homeLinkStyle = {
  display: 'inline-block',
  marginBottom: '1.25rem',
  color: 'rgba(230,230,230,0.6)',
  fontSize: '0.85rem',
  textDecoration: 'none',
};

export default function PrivacyPolicy() {
  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <a href="/" style={homeLinkStyle}>&larr; Back to V-ENT</a>
        <h1 style={headingStyle}>Privacy Policy</h1>
        <p style={subStyle}>Last updated: April 2026 &middot; Vermillion Encore (V-ENT)</p>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>1. Who we are</h2>
          <p style={paragraphStyle}>
            V-ENT is operated by Vermillion Encore, a company registered in Nigeria. We
            provide tournaments, events, wallet, marketplace, anime, and community features
            for African gamers and creators. References to &ldquo;V-ENT&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or
            &ldquo;us&rdquo; mean Vermillion Encore.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>2. Information we collect</h2>
          <ul style={listStyle}>
            <li>Account info: email, username, full name, country, password hash.</li>
            <li>Profile info you choose to provide: avatar, banner, bio, social handles, gaming accounts.</li>
            <li>Wallet activity: top-ups, sends, withdrawals, prize payouts. Card data is handled by Paystack &mdash; we do not store card numbers.</li>
            <li>Tournament + event activity: registrations, results, brackets, tickets.</li>
            <li>Device + log data: IP, device, browser, login timestamps, security events.</li>
            <li>KYC documents when you choose to verify (held in encrypted private storage).</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>3. How we use your data</h2>
          <ul style={listStyle}>
            <li>Run the platform &mdash; host your tournaments, settle wallet transactions, deliver tickets.</li>
            <li>Detect fraud, abuse, and policy violations (cheat detection, KYC review, payout protection).</li>
            <li>Send you transactional notifications (login alerts, registration confirmations, payouts).</li>
            <li>Send marketing only when you opt in. You can opt out at any time in Settings &rarr; Notifications.</li>
            <li>Comply with Nigerian + African legal requirements where applicable.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>4. Sharing</h2>
          <p style={paragraphStyle}>
            We share data with: Paystack (payments), AWS (hosting + storage), AWS SES
            (transactional email), Cloudflare (DNS + edge), Sentry (error tracking), and
            PostHog (anonymized analytics). We do not sell your data. We may disclose data
            when required by law or to protect users from imminent harm.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>5. Your rights</h2>
          <p style={paragraphStyle}>
            You can edit your profile, export your wallet history, or delete your account
            from Settings &rarr; Danger Zone. Account deletion is reversible for 14 days, then
            permanent. Some financial records are retained for tax + audit compliance even
            after deletion, as required by law.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>6. Security</h2>
          <p style={paragraphStyle}>
            Passwords are hashed. Sessions are bound to device + IP. KYC documents live in
            private S3 with restricted IAM. Paystack handles card data on PCI-DSS-compliant
            infrastructure &mdash; V-ENT never sees your card number.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>7. Children</h2>
          <p style={paragraphStyle}>
            V-ENT is for users 13+. Wager features (when launched) require users to be 18+
            in line with Nigerian law. We will remove accounts found to be under-age.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>8. Contact</h2>
          <p style={paragraphStyle}>
            Questions or data requests:{' '}
            <a href="mailto:privacy@v-ent.co" style={linkStyle}>privacy@v-ent.co</a>.
            For account-specific actions, use Settings &rarr; Danger Zone first &mdash; it&rsquo;s
            the fastest path.
          </p>
        </section>
      </div>
    </div>
  );
}
