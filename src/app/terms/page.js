// V-ENT terms of use - server component, no client deps, same shape as the
// privacy policy so the two read as one pair rather than two documents.
//
// It replaces `/public/terms-of-use.pdf`, which nobody could translate, no
// crawler could read, and which still carried the drafting note "[Insert
// Jurisdiction]" in the section about which country's law applies. The PDF is
// kept only as a redirect, because the signup page has linked to it.

import { getT } from '@/i18n/server';
import { TERMS_KEYS, SECTIONS } from './termsCopy';

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
  margin: '0 0 0.6rem',
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

export default function TermsOfUse() {
  const t = getT();
  const k = (key) => t(`terms.${TERMS_KEYS[key][0]}`, TERMS_KEYS[key][1]);

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <a href="/" style={homeLinkStyle}>&larr; {k('back')}</a>
        <h1 style={headingStyle}>{k('title')}</h1>
        <p style={subStyle}>{k('updated')}</p>

        {SECTIONS.map((section) => (
          <section key={section.id} style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              {t(`terms.${section.id}.heading`, section.heading)}
            </h2>

            {(section.paragraphs || []).map((p, i) => (
              <p key={i} style={paragraphStyle}>{t(`terms.${section.id}.p${i}`, p)}</p>
            ))}

            {section.items && (
              <ul style={listStyle}>
                {section.items.map((item, i) => (
                  <li key={i}>{t(`terms.${section.id}.i${i}`, item)}</li>
                ))}
              </ul>
            )}

            {(section.after || []).map((p, i) => (
              <p key={i} style={{ ...paragraphStyle, marginTop: '0.9rem', marginBottom: 0 }}>
                {t(`terms.${section.id}.a${i}`, p)}
              </p>
            ))}

            {section.contact && (
              <p style={{ ...paragraphStyle, marginTop: '0.9rem', marginBottom: 0 }}>
                {k('contactIntro')}{' '}
                <a href="mailto:info@v-ent.co" style={linkStyle}>info@v-ent.co</a>.
                {' '}{k('contactAfter')}
              </p>
            )}
          </section>
        ))}

        <p style={noteStyle}>
          {k('authoritative')}{' '}
          <a href="/privacy-policy" style={linkStyle}>{t('terms.readPrivacy', 'Read the privacy policy')}</a>.
        </p>
      </div>
    </div>
  );
}
