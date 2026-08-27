'use client';

import { KYC_REQUIRED } from '@/lib/features';
import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from '../wallets.module.css';
import v from './verify.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const DOC_TYPES = [{
  value: 'national_id',
  label: 'National ID',
  hint: 'NIN slip or National ID card'
}, {
  value: 'passport',
  label: 'Passport',
  hint: 'International passport data page'
}, {
  value: 'drivers_license',
  label: "Driver's License",
  hint: 'Front of your licence'
}];
const docLabel = val => DOC_TYPES.find(d => d.value === val)?.label || val || '-';
const fmtDate = iso => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return iso;
  }
};
const fmtFileSize = bytes => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const VerifyPage = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();

  const {
    data: session
  } = useSession();
  const token = session?.user?.sessionToken;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [kycVerified, setKycVerified] = useState(false);
  const [latestSubmission, setLatestSubmission] = useState(null);

  // KYC is switched off. The only link here was inside the wallet banner, which
  // is gated too, but the address still worked - and a form asking somebody for
  // a passport photograph, for a requirement that has been dropped, is worse
  // than a dead link. Send them back to the wallet.
  //
  // An early `return null` here would break the rules of hooks: this sits above
  // the rest of the component's state, so the guard belongs on the render, not
  // on the function.
  useEffect(() => {
    if (!KYC_REQUIRED) router.replace('/wallets');
  }, [router]);

  // Upload form state
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? {
      Authorization: `Bearer ${token}`
    } : {})
  });
  const fetchStatus = async () => {
    if (!token) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/kyc/status/`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setKycVerified(!!data.data?.kyc_verified);
        setLatestSubmission(data.data?.latest_submission ?? null);
      } else {
        setLoadError(apiMessage(tt, data, "api.couldNotLoadVerificationStatus", "Could not load verification status."));
      }
    } catch (err) {
      console.error('KYC status fetch error:', err);
      setLoadError('Network error loading verification status.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch once the auth token is available.
  useEffect(() => {
    if (!token) return;
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Release the object URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  const handleFileChange = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setSubmitError('');
    setSubmitSuccess(false);
  };
  const clearFile = () => {
    setFile(null);
    setPreviewUrl('');
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!docType || !file || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      formData.append('document_type', docType);
      formData.append('document_image', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/kyc/submit/`, {
        method: 'POST',
        // IMPORTANT: only Authorization - the browser sets the multipart boundary.
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {},
        body: formData
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setSubmitSuccess(true);
        clearFile();
        setDocType('');
        await fetchStatus(); // moves the view to "pending"
      } else {
        setSubmitError(apiMessage(tt, data, "api.submissionFailedPleaseTryAgain", "Submission failed. Please try again."));
      }
    } catch (err) {
      console.error('KYC submit error:', err);
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shell wrapper ──
  // Plain function (not a component) so the tree stays stable across
  // re-renders - avoids remounting the form/file input on every keystroke.
  // Nothing renders while KYC is off; the effect above is already sending them
  // to the wallet. Guarding here rather than with an early return keeps the
  // hook order identical on every render.
  if (!KYC_REQUIRED) return null;

  const wrap = content => <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>{tt("ui.verify.identity.f4f5", "Verify Your Identity")}</h1>
              <p className={styles.pageSubtitle}>
                {tt("ui.confirm.identity.unlock.withdrawals.004f", "Confirm your identity to unlock withdrawals and higher transaction limits.")}
              </p>
            </div>
          </div>
          {content}
        </div>
      </main>
      <BottomMenu />
    </div>;

  // ── Token not ready ──
  if (!token) {
    return wrap(<div className={styles.formCard}>
        <div className={styles.processingState}>
          <div className={styles.spinner} />
          <p className={styles.processingTitle}>{tt("ui.preparing.session.65ff", "Preparing your session…")}</p>
          <p className={styles.processingSub}>{tt("ui.just.moment.while.sign.2ade", "Just a moment while we sign you in.")}</p>
        </div>
      </div>);
  }

  // ── Loading status ──
  if (loading) {
    return wrap(<div className={styles.formCard}>
        <div className={styles.processingState}>
          <div className={styles.spinner} />
          <p className={styles.processingTitle}>{tt("ui.loading.verification.status.0281", "Loading verification status…")}</p>
          <p className={styles.processingSub}>{tt("ui.checking.latest.submission.62e9", "Checking your latest submission.")}</p>
        </div>
      </div>);
  }

  // ── Load failed ──
  if (loadError) {
    return wrap(<div className={styles.formCard}>
        <div className={`${styles.notice} ${styles.noticeError}`}>{loadError}</div>
        <div className={styles.btnRow}>
          <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>
            {tt("ui.back.wallet.0358", "Back to wallet")}
          </Link>
          <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={fetchStatus}>
            {tt("ui.try.again.042c", "Try again")}
          </button>
        </div>
      </div>);
  }

  // ── Verified ──
  if (kycVerified === true) {
    return wrap(<div className={styles.formCard}>
        <div className={styles.successCenter}>
          <div className={v.verifiedIcon}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>{tt("ui.identity.verified.78c5", "Identity verified")}</h2>
          <p className={styles.successSub}>
            {tt("ui.identity.confirmed.withdrawals.higher.ac53", "Your identity is confirmed. Withdrawals and higher transaction limits are now unlocked.")}
          </p>
          <Link href="/wallets" className={`${styles.btn} ${styles.btnRed} ${styles.btnFull}`}>
            {tt("ui.back.wallet.0358", "Back to wallet")}
          </Link>
        </div>
      </div>);
  }

  // ── Pending review ──
  if (latestSubmission?.status === 'pending') {
    return wrap(<div className={styles.formCard}>
        <div className={styles.successCenter}>
          <div className={styles.warnIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>{tt("ui.under.review.7e3e", "Under review")}</h2>
          <p className={styles.successSub}>
            {tt("ui.we've.received.document.our.adc9", "We've received your document and our team is reviewing it. This usually takes about 24 hours.")}
          </p>
        </div>

        <div className={v.pillRow}>
          <span className={`${v.statusPill} ${v.statusPillPending}`}>{tt("ui.pending.review.6a80", "Pending review")}</span>
        </div>

        <div className={styles.summaryList} style={{
        textAlign: 'left'
      }}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryKey}>{tt("ui.document.type.300b", "Document type")}</span>
            <span className={styles.summaryVal}>{docLabel(latestSubmission.document_type)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryKey}>{tt("ui.submitted.2e00", "Submitted")}</span>
            <span className={styles.summaryVal}>{fmtDate(latestSubmission.submitted_at)}</span>
          </div>
        </div>

        <Link href="/wallets" className={`${styles.btn} ${styles.btnRed} ${styles.btnFull}`}>
          {tt("ui.back.wallet.0358", "Back to wallet")}
        </Link>
      </div>);
  }

  // ── Upload form (no submission OR previous rejected) ──
  const isRejected = latestSubmission?.status === 'rejected';
  return wrap(<form className={styles.formCard} onSubmit={handleSubmit}>
        {isRejected && <>
            <div className={v.pillRow}>
              <span className={`${v.statusPill} ${v.statusPillRejected}`}>{tt("ui.previous.submission.rejected.db83", "Previous submission rejected")}</span>
            </div>
            <div className={`${styles.notice} ${styles.noticeError}`}>
              {latestSubmission.rejection_reason || tx("Your previous document could not be verified. Please upload a clearer photo.")}
            </div>
          </>}

        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          {tt("ui.upload.clear.photo.government.6370", "Upload a clear photo of a government-issued ID. Review takes about 24 hours and unlocks withdrawals + higher limits.")}
        </div>

        {/* Document type */}
        <span className={v.blockLabel}>{tt("ui.document.type.300b", "Document type")}</span>
        <div className={v.docTypeGroup}>
          {DOC_TYPES.map(d => {
        const active = docType === d.value;
        return <label key={d.value} className={`${v.docTypeOption} ${active ? v.docTypeOptionActive : ''}`}>
                <input type="radio" name="documentType" value={d.value} checked={active} onChange={() => {
            setDocType(d.value);
            setSubmitError('');
            setSubmitSuccess(false);
          }} className={v.srOnly} />
                <span className={`${v.docRadio} ${active ? v.docRadioActive : ''}`}>
                  {active && <span className={v.docRadioDot} />}
                </span>
                <span className={v.docOptionText}>
                  <span className={v.docOptionLabel}>{tx(d.label)}</span>
                  <span className={v.docOptionHint}>{tx(d.hint)}</span>
                </span>
              </label>;
      })}
        </div>

        {/* Document photo */}
        <span className={v.blockLabel}>{tt("ui.document.photo.1365", "Document photo")}</span>
        <input id="kyc-doc-file" type="file" accept="image/*" onChange={handleFileChange} className={v.srOnly} />
        {!file ? <label htmlFor="kyc-doc-file" className={v.dropzone} style={{
      marginBottom: '1.1rem'
    }}>
            <span className="fieldLabelRow"><span className={v.dropIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className={v.dropTitle}>{tt("ui.tap.upload.photo.f8aa", "Tap to upload a photo")}</span>
            <span className={v.dropHint}>{tt("ui.png.jpg.selected.document.4a8f", "PNG or JPG of your selected document")}</span> <InfoTip id="kycVerification" /></span>
          </label> : <div className={v.filePreview} style={{
      marginBottom: '1.1rem'
    }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={tt("ui.document.preview.eef7", "Document preview")} className={v.fileThumb} />
            <div className={v.fileMeta}>
              <p className={v.fileName}>{file.name}</p>
              <p className={v.fileSize}>{fmtFileSize(file.size)}</p>
            </div>
            <div className={v.fileActions}>
              <label htmlFor="kyc-doc-file" className={v.fileChange}>{tt("ui.change.64fb", "Change")}</label>
              <button type="button" className={v.fileRemove} onClick={clearFile}>{tt("ui.remove.e963", "Remove")}</button>
            </div>
          </div>}

        {submitSuccess && <div className={`${styles.notice} ${styles.noticeInfo}`}>
            {tt("ui.document.submitted.successfully.review.8984", "Document submitted successfully - your review is now in progress.")}
          </div>}

        {submitError && <div className={`${styles.notice} ${styles.noticeError}`}>{submitError}</div>}

        <div className={styles.btnRow}>
          <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>
            {tt("ui.back.wallet.0358", "Back to wallet")}
          </Link>
          <button type="submit" className={`${styles.btn} ${styles.btnGrn}`} disabled={!docType || !file || submitting}>
            {submitting ? tx("Submitting…") : tx("Submit for review")}
          </button>
        </div>
    </form>);
};
export default VerifyPage;