// V-ENT Privacy Policy - server component, no client deps. The route is
// publicly accessible from auth pages, the landing footer, and Settings, so we
// keep it shell-free for predictable rendering and zero auth coupling.
//
// The words live in policyCopy.js and are translated like everything else. A
// policy nobody can read in their own language is not much of a policy, and it
// was the last page on the platform still written in English in the markup.
//
// The English governs where a translation differs, and the page says so in
// whichever language it is being read.

import { getT } from '@/i18n/server';
import { POLICY_KEYS, SECTIONS } from './policyCopy';

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

const noteStyle = {
  color: 'rgba(230,230,230,0.5)',
  fontSize: '0.85rem',
  lineHeight: '1.6',
  marginTop: '2rem',
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
  const t = getT();
  const k = (key) => t(`policy.${POLICY_KEYS[key][0]}`, POLICY_KEYS[key][1]);

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <a href="/" style={homeLinkStyle}>&larr; {k('back')}</a>
        <h1 style={headingStyle}>{k('title')}</h1>
        <p style={subStyle}>{k('updated')}</p>

        {SECTIONS.map((section) => (
          <section key={section.id} style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              {t(`policy.${section.id}.heading`, section.heading)}
            </h2>

            {(section.paragraphs || []).map((p, i) => (
              <p key={i} style={paragraphStyle}>{t(`policy.${section.id}.p${i}`, p)}</p>
            ))}

            {section.items && (
              <ul style={listStyle}>
                {section.items.map((item, i) => (
                  <li key={i}>{t(`policy.${section.id}.i${i}`, item)}</li>
                ))}
              </ul>
            )}

            {section.contact && (
              <p style={paragraphStyle}>
                {k('contactIntro')}{' '}
                <a href="mailto:info@v-ent.co" style={linkStyle}>info@v-ent.co</a>.
                {' '}{k('contactAfter')}
              </p>
            )}
          </section>
        ))}

        <p style={noteStyle}>{k('authoritative')}</p>
      </div>
    </div>
  );
}
