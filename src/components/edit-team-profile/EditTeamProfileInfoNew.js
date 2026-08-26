'use client';

import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { FiCamera } from 'react-icons/fi';
import styles from './edit-team-profile-new.module.css';
import useGames from '@/hooks/useGames';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const REGIONS = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt', 'Morocco', 'Senegal'];
const EditTeamProfileInfoNew = ({
  team,
  onSaved
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    gameTitles
  } = useGames();
  const {
    data: session
  } = useSession();
  const [name, setName] = useState(team.name || '');
  const [coreGame, setCoreGame] = useState(team.core_game || team.game || '');
  const [bio, setBio] = useState(team.bio || team.description || '');
  const [region, setRegion] = useState(team.region || 'Nigeria');
  const [logoPreview, setLogoPreview] = useState(team.logo || team.team_logo || null);
  const [bannerPreview, setBannerPreview] = useState(team.banner || team.team_banner || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const logoRef = useRef(null);
  const bannerRef = useRef(null);
  const handleFile = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setter(e.target.result);
    reader.readAsDataURL(file);
  };
  const handleSave = async e => {
    e?.preventDefault?.();
    setError('');
    if (!name.trim()) return setError(tt("msg.nameIsRequired", "Name is required"));
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/edit-team/${team.id}/`, {
        method: 'PATCH',
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
          logo_url: logoPreview,
          banner_url: bannerPreview
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        onSaved?.({
          name: name.trim(),
          core_game: coreGame,
          bio,
          region,
          logo: logoPreview,
          banner: bannerPreview
        });
      } else {
        setError(apiMessage(tt, data, "api.saveFailed", "Save failed"));
      }
    } catch {
      setError(tt("msg.networkError", "Network error"));
    } finally {
      setSaving(false);
    }
  };
  return <form className={styles.formWrapper} onSubmit={handleSave}>
      <h2 className={styles.sectionTitle}>{tt("ui.profile.info.f29b", "Profile Info")}</h2>

      <div className={styles.uploadSection}>
        <div className={styles.bannerUpload} onClick={() => bannerRef.current?.click()}>
          {bannerPreview ? <Image src={bannerPreview} alt={tt("team.alt.bannerPreview", "The banner you chose for this team")} fill style={{
          objectFit: 'cover'
        }} sizes="100vw" /> : <div className={styles.uploadHint}><FiCamera /> <span>{tt("ui.upload.banner.abba", "Upload banner")}</span></div>}
          <input ref={bannerRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={e => handleFile(e.target.files?.[0], setBannerPreview)} />
        </div>
        <div className={styles.logoUploadWrap}>
          <div className={styles.logoUpload} onClick={() => logoRef.current?.click()}>
            {logoPreview ? <Image src={logoPreview} alt={tt("team.alt.logoPreview", "The crest you chose for this team")} fill style={{
            objectFit: 'cover'
          }} /> : <div className={styles.logoFallback}><FiCamera /></div>}
            <input ref={logoRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={e => handleFile(e.target.files?.[0], setLogoPreview)} />
          </div>
          <p className={styles.uploadCaption}>{tt("ui.click.logo.change.babe", "Click logo to change")}</p>
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{tt("ui.team.name.9b11", "Team name")}</span>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className={styles.input} maxLength={32} />
      <InfoTip id="teamName" /></label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{tt("ui.core.game.e45a", "Core game")}</span>
        <select value={coreGame} onChange={e => setCoreGame(e.target.value)} className={styles.input}>
          <option value="">{tt("ui.select.349a", "Select…")}</option>
          {gameTitles.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      <InfoTip id="teamGame" /></label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{tt("ui.bio.b31f", "Bio")}</span>
        <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} className={styles.textarea} maxLength={300} />
        <span className={styles.charCount}>{bio.length} / 300</span>
      <InfoTip id="teamDescription" /></label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{tt("ui.region.0f21", "Region")}</span>
        <select value={region} onChange={e => setRegion(e.target.value)} className={styles.input}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      <InfoTip id="teamRegion" /></label>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.actions}>
        <button type="submit" className={`${styles.saveBtn} redBTN`} disabled={saving}>
          {saving ? tx("Saving…") : tx("Save changes")}
        </button>
      </div>
    </form>;
};
export default EditTeamProfileInfoNew;