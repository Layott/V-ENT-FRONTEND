'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './partners.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// The partner area. Three states in one page, because they are the same subject
// at different stages: you have not applied, you have applied and are waiting,
// or you are running a partner account and need keys.

const SCOPE_GROUPS = [{
  title: 'Events',
  prefix: 'events'
}, {
  title: 'Tournaments',
  prefix: 'tournaments'
}, {
  title: 'Teams and players',
  prefix: ['teams', 'players', 'rankings']
}];
const groupFor = scope => SCOPE_GROUPS.find(g => Array.isArray(g.prefix) ? g.prefix.some(p => scope.startsWith(p)) : scope.startsWith(g.prefix)) || SCOPE_GROUPS[SCOPE_GROUPS.length - 1];
const PartnersPage = () => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session,
    status
  } = useSession();
  const token = session?.user?.sessionToken;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const [scopes, setScopes] = useState({});
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [issuedSecret, setIssuedSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    website: '',
    description: '',
    intended_use: '',
    requested_scopes: [],
    wants_sso: false,
    legal_name: '',
    registration_number: '',
    privacy_policy_url: '',
    terms_url: '',
    data_protection_contact: '',
    redirect_uris: ''
  });
  const say = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 4000);
  };
  const load = useCallback(async () => {
    try {
      const cat = await fetch(`${apiBase}/partners/scopes/`);
      if (cat.ok) setScopes((await cat.json())?.data?.scopes || {});
      if (token) {
        const mine = await fetch(`${apiBase}/partners/mine/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (mine.ok) setPartners((await mine.json())?.data?.partners || []);
      }
    } catch {
      say('Could not load the partner programme. Try again shortly.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, token]);
  useEffect(() => {
    load();
  }, [load]);
  const partner = partners[0] || null;
  const grouped = useMemo(() => {
    const map = new Map(SCOPE_GROUPS.map(g => [g.title, []]));
    Object.entries(scopes).forEach(([key, label]) => {
      map.get(groupFor(key).title).push({
        key,
        label
      });
    });
    return [...map.entries()].filter(([, rows]) => rows.length);
  }, [scopes]);
  const toggleScope = key => {
    setForm(f => ({
      ...f,
      requested_scopes: f.requested_scopes.includes(key) ? f.requested_scopes.filter(s => s !== key) : [...f.requested_scopes, key]
    }));
  };
  const apply = async e => {
    e.preventDefault();
    if (!token) {
      say('Sign in first, so the application belongs to your account.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/partners/apply/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          redirect_uris: form.redirect_uris.split('\n').map(u => u.trim()).filter(Boolean)
        })
      });
      const body = await res.json();
      say(body.message || (res.ok ? 'Application sent.' : 'Could not send that application.'));
      if (res.ok) await load();
    } catch {
      say('Could not send that application.');
    } finally {
      setSaving(false);
    }
  };
  const issueKey = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/partners/${partner.id}/keys/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'API key',
          scopes: partner.approved_scopes
        })
      });
      const body = await res.json();
      if (res.ok) {
        setIssuedSecret(body.data.secret);
        await load();
      }
      say(body.message || tt("api.keyIssued", "Key issued."));
    } catch {
      say('Could not issue a key.');
    } finally {
      setSaving(false);
    }
  };
  const revokeKey = async keyId => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/partners/${partner.id}/keys/${keyId}/revoke/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const body = await res.json();
      say(body.message || tt("api.keyRevoked", "Key revoked."));
      await load();
    } catch {
      say('Could not revoke that key.');
    } finally {
      setSaving(false);
    }
  };
  return <div className={styles.page}>
      <Header />
      <MobileHeader />
      <main className={styles.main}>
        <Sidebar />
        <section className={styles.content}>
          <header className={styles.pageHead}>
            <h1 className={styles.pageTitle}>{tt("ui.partner.programme.5043", "Partner programme")}</h1>
            <p className={styles.pageSub}>
              {tt("ui.read.v.ent.tournament.a458", "Read V-ENT tournament, event, team and player data from your own site, and let V-ENT\n              members sign in with their V-ENT account.")}
            </p>
          </header>

          {loading && <p className={styles.muted}>{tt("ui.loading.b04b", "Loading...")}</p>}

          {!loading && status === 'unauthenticated' && <div className={styles.card}>
              <h2 className={styles.cardTitle}>{tt("ui.sign.apply.5c22", "Sign in to apply")}</h2>
              <p className={styles.muted}>
                {tt("ui.partner.account.belongs.v.55de", "A partner account belongs to a V-ENT account, so applications start from a signed-in\n                session.")}
              </p>
              <Link href="/login" className={styles.primaryBtn}>{tt("ui.sign.ada2", "Sign in")}</Link>
            </div>}

          {!loading && partner && <>
              <div className={styles.card}>
                <div className={styles.rowBetween}>
                  <h2 className={styles.cardTitle}>{partner.name}</h2>
                  <span className={`${styles.pill} ${styles[`pill_${partner.status}`] || ''}`}>
                    {partner.status}
                  </span>
                </div>
                <dl className={styles.metaGrid}>
                  <div><dt>{tt("ui.applied.a3e4", "Applied")}</dt><dd>{new Date(partner.created_at).toLocaleDateString()}</dd></div>
                  <div><dt>{tt("ui.sign.v.ent.9ce8", "Sign-in with V-ENT")}</dt><dd>{partner.sso_status}</dd></div>
                  <div><dt>{tt("ui.scopes.granted.f614", "Scopes granted")}</dt><dd>{partner.approved_scopes.length || tx("None yet")}</dd></div>
                </dl>
                {partner.review_note && <p className={styles.muted}>{tt("ui.reviewer.note.27b1", "Reviewer note:")} {partner.review_note}</p>}
                {partner.status === 'pending' && <p className={styles.muted}>
                    {tt("ui.admin.reviews.every.application.e0aa", "An admin reviews every application. Nothing is granted until they do.")}
                  </p>}
              </div>

              {partner.status === 'approved' && <div className={styles.card}>
                  <div className={styles.rowBetween}>
                    <h2 className={styles.cardTitle}>{tt("ui.api.keys.94fc", "API keys")}</h2>
                    <button type="button" className={styles.primaryBtn} onClick={issueKey} disabled={saving}>
                      {tt("ui.issue.key.070c", "Issue a key")}
                    </button>
                  </div>

                  {issuedSecret && <div className={styles.secretBox}>
                      <p className={styles.secretLabel}>{tt("ui.copy.now.not.shown.db03", "Copy this now. It is not shown again.")}</p>
                      <code className={styles.secret}>{issuedSecret}</code>
                    </div>}

                  {partner.keys.length === 0 ? <p className={styles.muted}>{tt("ui.no.keys.yet.c1e9", "No keys yet.")}</p> : <div className={styles.keyList}>
                      {partner.keys.map(k => <div key={k.id} className={styles.keyRow}>
                          <div>
                            <p className={styles.keyName}>{k.name}</p>
                            <p className={styles.muted}>
                              {k.key_id} · {k.scopes.join(', ') || tx("no scopes")} ·{' '}
                              {k.revoked_at ? 'revoked' : `${k.rate_limit_per_minute}/min`}
                            </p>
                          </div>
                          {!k.revoked_at && <button type="button" className={styles.ghostBtn} onClick={() => revokeKey(k.id)} disabled={saving}>
                              {tt("ui.revoke.0be7", "Revoke")}
                            </button>}
                        </div>)}
                    </div>}

                  <h3 className={styles.subTitle}>{tt("ui.how.call.3bd4", "How to call it")}</h3>
                  <pre className={styles.code}>{`curl ${apiBase}/api/v1/tournaments/ \\
  -H "Authorization: Bearer vent_pk_<key id>.<secret>"`}</pre>
                  <p className={styles.muted}>
                    {tt("ui.every.endpoint.listed.5c59", "Every endpoint is listed at")} <code>{apiBase}{tt("ui.api.v.9090", "/api/v1/")}</code>{tt("ui.which.needs.no.key.5915", ", which needs no key.")}
                  </p>
                </div>}
            </>}

          {!loading && !partner && status === 'authenticated' && <form className={styles.card} onSubmit={apply} method="post">
              <h2 className={styles.cardTitle}>{tt("ui.apply.access.e551", "Apply for access")}</h2>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>{tt("ui.partner.name.9cbe", "Partner name")}</span>
                  <input className={styles.input} value={form.name} onChange={e => setForm({
                ...form,
                name: e.target.value
              })} required />
                <InfoTip id="partnerName" /></label>
                <label className={styles.field}>
                  <span>{tt("ui.contact.email.726a", "Contact email")}</span>
                  <input type="email" className={styles.input} value={form.contact_email} onChange={e => setForm({
                ...form,
                contact_email: e.target.value
              })} required />
                <InfoTip id="partnerEmail" /></label>
                <label className={styles.field}>
                  <span>{tt("ui.website.2e8a", "Website")}</span>
                  <input className={styles.input} value={form.website} onChange={e => setForm({
                ...form,
                website: e.target.value
              })} placeholder={tt("ui.https.a9a1", "https://")} />
                <InfoTip id="partnerWebsite" /></label>
                <label className={styles.field}>
                  <span>{tt("ui.who.61f8", "Who you are")}</span>
                  <input className={styles.input} value={form.contact_name} onChange={e => setForm({
                ...form,
                contact_name: e.target.value
              })} />
                <InfoTip id="partnerWhoYouAre" /></label>
              </div>

              <label className={styles.field}>
                <span>{tt("ui.what.want.build.3c41", "What you want to build with it")}</span>
                <textarea className={styles.textarea} rows={3} value={form.intended_use} onChange={e => setForm({
              ...form,
              intended_use: e.target.value
            })} />
              <InfoTip id="partnerWhatYouBuild" /></label>

              <h3 className={styles.subTitle}>{tt("ui.what.should.key.able.85af", "What should the key be able to read?")}</h3>
              <p className={styles.muted}>
                {tt("ui.ask.what.need.admin.369c", "Ask for what you need. An admin decides what is granted, and a key can never read\n                past that.")}
              </p>
              {grouped.map(([title, rows]) => <div key={title} className={styles.scopeGroup}>
                  <p className={styles.scopeGroupTitle}>{title}</p>
                  {rows.map(({
              key,
              label
            }) => <label key={key} className={styles.checkRow}>
                      <input type="checkbox" checked={form.requested_scopes.includes(key)} onChange={() => toggleScope(key)} />
                      <span><code>{key}</code> {label}</span>
                    </label>)}
                </div>)}

              <label className={styles.checkRow}>
                <input type="checkbox" checked={form.wants_sso} onChange={e => setForm({
              ...form,
              wants_sso: e.target.checked
            })} />
                <span>{tt("ui.i.also.want.people.8304", "I also want people to sign in to my site with their V-ENT account")}</span>
              </label>

              {form.wants_sso && <div className={styles.ssoBlock}>
                  <p className={styles.muted}>
                    {tt("ui.signing.people.means.handling.bbb5", "Signing people in means handling their identity, so this is reviewed separately\n                    and asks for more.")}
                  </p>
                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>{tt("ui.registered.legal.name.03cb", "Registered legal name")}</span>
                      <input className={styles.input} value={form.legal_name} onChange={e => setForm({
                  ...form,
                  legal_name: e.target.value
                })} />
                    <InfoTip id="partnerLegalName" /></label>
                    <label className={styles.field}>
                      <span>{tt("ui.company.registration.number.cd7a", "Company or registration number")}</span>
                      <input className={styles.input} value={form.registration_number} onChange={e => setForm({
                  ...form,
                  registration_number: e.target.value
                })} />
                    <InfoTip id="partnerRegNumber" /></label>
                    <label className={styles.field}>
                      <span>{tt("ui.privacy.policy.url.52c7", "Privacy policy URL")}</span>
                      <input className={styles.input} value={form.privacy_policy_url} onChange={e => setForm({
                  ...form,
                  privacy_policy_url: e.target.value
                })} />
                    <InfoTip id="partnerPrivacyUrl" /></label>
                    <label className={styles.field}>
                      <span>{tt("ui.data.protection.contact.0c1d", "Data protection contact")}</span>
                      <input className={styles.input} value={form.data_protection_contact} onChange={e => setForm({
                  ...form,
                  data_protection_contact: e.target.value
                })} />
                    <InfoTip id="partnerDataContact" /></label>
                  </div>
                  <label className={styles.field}>
                    <span>{tt("ui.redirect.addresses.one.per.fade", "Redirect addresses, one per line (https, or localhost while building)")}</span>
                    <textarea className={styles.textarea} rows={3} value={form.redirect_uris} onChange={e => setForm({
                ...form,
                redirect_uris: e.target.value
              })} placeholder={tt("ui.https.site.com.auth.d2f3", "https://your-site.com/auth/v-ent/callback")} />
                  <InfoTip id="ssoRedirect" /></label>
                </div>}

              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                {saving ? tx("Sending...") : tx("Send application")}
              </button>
            </form>}

          {toast && <div className={styles.toast}>{toast}</div>}
        </section>
      </main>
      <BottomMenu />
    </div>;
};
export default PartnersPage;