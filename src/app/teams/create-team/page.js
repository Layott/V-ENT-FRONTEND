'use client';

import { uploadHint } from '@/lib/uploadSpecs';
import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { FiCamera, FiUpload } from 'react-icons/fi';
import { LuGamepad2, LuCheck } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './create-team.module.css';
import useGames from '@/hooks/useGames';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const REGIONS = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Morocco', 'Senegal'];
const CreateTeam = () => {
  const tx = useTx();
  const tt = useT();
  const {
    gameTitles
  } = useGames();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const [logoPreview, setLogoPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [name, setName] = useState('');
  const [coreGame, setCoreGame] = useState('');
  const [bio, setBio] = useState('');
  const [region, setRegion] = useState('Nigeria');
  const [maxMembers, setMaxMembers] = useState(6);
  const [openToJoin, setOpenToJoin] = useState(true);
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [discord, setDiscord] = useState('');
  const [twitch, setTwitch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const logoRef = useRef(null);
  const bannerRef = useRef(null);
  const handleFile = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setter(e.target.result);
    reader.readAsDataURL(file);
  };
  const handleSubmit = async e => {
    e?.preventDefault?.();
    setError('');
    if (!name.trim()) return setError(tt("msg.teamNameIsRequired", "Team name is required."));
    if (!coreGame) return setError(tt("msg.pickACoreGame", "Pick a core game."));
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/create-team/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({
          name: name.trim(),
          core_game: coreGame,
          bio,
          region,
          max_members: maxMembers,
          open_to_join: openToJoin,
          social_links: {
            twitter,
            instagram,
            discord,
            twitch
          },
          logo_url: logoPreview,
          banner_url: bannerPreview
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setSuccess(true);
        const newId = data?.data?.id || data?.data?.team?.id;
        window.setTimeout(() => {
          if (newId) router.push(`/teams/${newId}`);else router.push('/teams');
        }, 1100);
      } else {
        setError(apiMessage(tt, data, "api.failedToCreateTeam", "Failed to create team."));
      }
    } catch (err) {
      setError(tt("msg.networkErrorTryAgain", "Network error. Try again."));
    } finally {
      setSubmitting(false);
    }
  };
  if (success) {
    return <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.successPanel}>
              <div className={styles.successIcon}><LuCheck /></div>
              <h2 className={styles.successTitle}>{tt("ui.team.created.0815", "Team created")}</h2>
              <p className={styles.successSub}>{tt("ui.taking.team.profile.20d5", "Taking you to the team profile…")}</p>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>{tt("ui.create.new.team.f67f", "Create a new team")}</h1>
              <p className={styles.pageSub}>{tt("ui.pick.name.upload.assets.7914", "Pick a name, upload assets and define your squad - you can edit everything later.")}</p>
            </div>
          </div>

          <form className={styles.formGrid} onSubmit={handleSubmit}>
            {/* Banner + Logo upload */}
            <section className={styles.uploadSection}>
              <div className={styles.bannerUpload} onClick={() => bannerRef.current?.click()}>
                {bannerPreview ? <Image src={bannerPreview} alt={tt("team.alt.bannerPreview", "The banner you chose for this team")} fill style={{
                objectFit: 'cover'
              }} sizes="100vw" /> : <div className={styles.uploadHint}>
                    <FiCamera /> <span>{tt("ui.upload.banner.image.0fa5", "Upload banner image")}</span>
                  </div>}
                <input ref={bannerRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={e => handleFile(e.target.files?.[0], setBannerPreview)} />
              </div>
                <p className={styles.uploadHintLine}>{uploadHint(tt, 'banner')}</p>

              <div className={styles.logoUploadWrap}>
                <div className={styles.logoUpload} onClick={() => logoRef.current?.click()}>
                  {logoPreview ? <Image src={logoPreview} alt={tt("team.alt.logoPreview", "The crest you chose for this team")} fill style={{
                  objectFit: 'cover'
                }} /> : <div className={styles.logoFallback}><FiCamera /></div>}
                  <input ref={logoRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={e => handleFile(e.target.files?.[0], setLogoPreview)} />
                </div>
                <p className={styles.uploadCaption}><FiUpload /> {tt("ui.upload.logo.a564", "Upload logo")}</p>
                <p className={styles.uploadHintLine}>{uploadHint(tt, 'logo')}</p>
              </div>
            </section>

            {/* Basic info */}
            <section className={styles.formCard}>
              <h2 className={styles.cardTitle}>{tt("ui.basic.info.3ecb", "Basic info")}</h2>

              <label className={styles.field}>
                <span className="fieldLabelRow"><span className={styles.fieldLabel}>{tt("ui.team.name.3274", "Team name *")}</span> <InfoTip id="teamName" /></span>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={tt("ui.e.g.crimson.wolves.98c1", "e.g. Crimson Wolves")} className={styles.input} maxLength={32} />
              </label>

              <label className={styles.field}>
                <span className="fieldLabelRow"><span className={styles.fieldLabel}>{tt("ui.core.game.754b", "Core game *")}</span> <InfoTip id="teamGame" /></span>
                <select value={coreGame} onChange={e => setCoreGame(e.target.value)} className={styles.input}>
                  <option value="">{tt("ui.select.game.a65d", "Select a game…")}</option>
                  {gameTitles.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>

              <label className={styles.field}>
                <span className="fieldLabelRow"><span className={styles.fieldLabel}>{tt("ui.bio.b31f", "Bio")}</span> <InfoTip id="teamDescription" /></span>
                <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder={tt("ui.what.team.about.achievements.6986", "What is your team about? Achievements? Playstyle?")} className={styles.textarea} maxLength={300} />
                <span className={styles.charCount}>{bio.length} / 300</span>
              </label>

              <label className={styles.field}>
                <span className="fieldLabelRow"><span className={styles.fieldLabel}>{tt("ui.region.0f21", "Region")}</span> <InfoTip id="teamRegion" /></span>
                <select value={region} onChange={e => setRegion(e.target.value)} className={styles.input}>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </section>

            {/* Membership settings */}
            <section className={styles.formCard}>
              <h2 className={styles.cardTitle}>{tt("ui.membership.53bc", "Membership")}</h2>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>{tt("ui.max.members.cd74", "Max members:")} <strong className={styles.sliderValue}>{maxMembers}</strong></span>
                <input type="range" min={2} max={10} value={maxMembers} onChange={e => setMaxMembers(parseInt(e.target.value, 10))} className={styles.slider} />
                <div className={styles.sliderTicks}>
                  {[2, 4, 6, 8, 10].map(n => <span key={n}>{n}</span>)}
                </div>
              </div>

              <label className={styles.toggleField}>
                <div>
                  <span className={`${styles.fieldLabel} fieldLabelRow`}>{tt("ui.open.join.f8e3", "Open to join")} <InfoTip id="allowMembershipRequests" /></span>
                  <span className={styles.fieldHint}>{tt("ui.anyone.can.request.join.5886", "Anyone can request to join. Captains approve.")}</span>
                </div>
                <button type="button" className={`${styles.toggle} ${openToJoin ? styles.toggleOn : ''}`} onClick={() => setOpenToJoin(v => !v)}>
                  <span className={styles.toggleKnob} />
                </button>
              </label>
            </section>

            {/* Social links */}
            <section className={styles.formCard}>
              <h2 className={styles.cardTitle}>{tt("ui.social.links.52e0", "Social links")} <span className={styles.optional}>{tt("ui.optional.b16c", "(optional)")}</span></h2>

              <label className={styles.field}>
                <span className="fieldLabelRow"><span className={styles.fieldLabel}>{tt("ui.twitter.x.a0b4", "Twitter / X")}</span> <InfoTip id="teamSocial" /></span>
                <input type="url" value={twitter} onChange={e => setTwitter(e.target.value)} placeholder={tt("ui.https.twitter.com.team.108c", "https://twitter.com/team")} className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className="fieldLabelRow"><span className={styles.fieldLabel}>{tt("ui.instagram.5721", "Instagram")}</span> <InfoTip id="teamSocial" /></span>
                <input type="url" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder={tt("ui.https.instagram.com.team.dd94", "https://instagram.com/team")} className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className="fieldLabelRow"><span className={styles.fieldLabel}>{tt("ui.discord.bccc", "Discord")}</span> <InfoTip id="teamSocial" /></span>
                <input type="url" value={discord} onChange={e => setDiscord(e.target.value)} placeholder={tt("ui.https.discord.gg.invite.b705", "https://discord.gg/invite")} className={styles.input} />
              </label>
              <label className={styles.field}>
                <span className="fieldLabelRow"><span className={styles.fieldLabel}>{tt("ui.twitch.e8ea", "Twitch")}</span> <InfoTip id="teamSocial" /></span>
                <input type="url" value={twitch} onChange={e => setTwitch(e.target.value)} placeholder={tt("ui.https.twitch.tv.team.5181", "https://twitch.tv/team")} className={styles.input} />
              </label>
            </section>

            {/* Submit */}
            <section className={styles.submitRow}>
              {error && <p className={styles.errorText}>{error}</p>}
              <div className={styles.submitButtons}>
                <button type="button" className={styles.cancelBtn} onClick={() => router.push('/teams')}>{tt("ui.cancel.77df", "Cancel")}</button>
                <button type="submit" className={`${styles.submitBtn} redBTN`} disabled={submitting}>
                  {submitting ? tx("Creating…") : tx("Create team")}
                </button>
              </div>
            </section>
          </form>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default CreateTeam;