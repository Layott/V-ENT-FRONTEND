'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BsChevronLeft, BsCheck2 } from 'react-icons/bs';
import { FiUploadCloud } from 'react-icons/fi';
import { MdOutlineClose } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './create.module.css';

const STEPS = [
  { id: 1, label: 'Title & Description' },
  { id: 2, label: 'Category & Condition' },
  { id: 3, label: 'Images' },
  { id: 4, label: 'Price & Shipping' },
  { id: 5, label: 'Review' },
];

const CATEGORIES = [
  { v: 'Gaming Hardware', label: 'Gaming Hardware' },
  { v: 'Apparel', label: 'Apparel' },
  { v: 'Collectibles', label: 'Collectibles' },
  { v: 'Tickets', label: 'Tickets' },
  { v: 'Services', label: 'Services' },
  { v: 'Digital', label: 'Digital' },
];

const CONDITIONS = [
  { v: 'new', label: 'New' },
  { v: 'like_new', label: 'Like new' },
  { v: 'good', label: 'Good' },
  { v: 'fair', label: 'Fair' },
];

const REGIONS = ['Lagos', 'Abuja', 'Accra', 'Nairobi'];

const MAX_IMAGES = 5;

const CreateListing = () => {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 2
  const [category, setCategory] = useState('Gaming Hardware');
  const [condition, setCondition] = useState('new');

  // Step 3 — mock image URLs.
  const [images, setImages] = useState([]);

  // Step 4
  const [priceVc, setPriceVc] = useState('');
  const [stock, setStock] = useState('1');
  const [shipping, setShipping] = useState('25');
  const [region, setRegion] = useState('Lagos');
  const [delivery, setDelivery] = useState('shipping');

  const canNext = () => {
    if (step === 1) return title.trim().length >= 3 && description.trim().length >= 10;
    if (step === 2) return !!category && !!condition;
    if (step === 3) return images.length >= 1;
    if (step === 4) {
      const p = parseInt(priceVc, 10);
      const s = parseInt(stock, 10);
      return p > 0 && s > 0;
    }
    return true;
  };

  const addMockImage = () => {
    if (images.length >= MAX_IMAGES) return;
    const next = `https://picsum.photos/seed/new-lst-${Date.now()}-${images.length}/800/600`;
    setImages((prev) => [...prev, next]);
  };

  const removeImage = (i) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submitListing = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        condition,
        images,
        price_vc: parseInt(priceVc, 10),
        price_vent_coins: parseInt(priceVc, 10),
        price_ngn: parseInt(priceVc, 10) * 1000,
        stock: parseInt(stock, 10),
        shipping_cost_vc: parseInt(shipping || '0', 10),
        location: region,
        delivery,
        delivery_label: delivery === 'pickup_only'
          ? 'Pickup only'
          : delivery === 'shipping' ? 'Ships nationwide' : 'Pickup or shipping',
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/listings/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') setDone(true);
      else setError(data.message || 'Failed to create listing.');
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepper = () => (
    <div className={styles.stepper}>
      {STEPS.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: '1 1 auto' }}>
          <div className={styles.stepDot}>
            <span
              className={`${styles.dotNum} ${step === s.id ? styles.dotActive : ''} ${step > s.id ? styles.dotDone : ''}`}
            >
              {step > s.id ? <BsCheck2 /> : s.id}
            </span>
            <span className={`${styles.dotLabel} ${step === s.id ? styles.dotLabelActive : ''}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <span className={styles.stepConnector} />}
        </div>
      ))}
    </div>
  );

  if (done) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.panel}>
              <div className={styles.success}>
                <div className={styles.successIcon}><BsCheck2 /></div>
                <h2 className={styles.successTitle}>Listing submitted</h2>
                <p className={styles.successSub}>
                  Your listing is live in Vermillion City. Buyers can view, offer and buy with full escrow protection.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Link href="/marketplace/dashboard" className={`${styles.nextBtn} redBTN`}>
                    Go to seller dashboard
                  </Link>
                  <Link href="/marketplace" className={styles.backBtn}>
                    Back to marketplace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/marketplace" className={styles.backLink}>
            <BsChevronLeft /> Back to marketplace
          </Link>

          <div className={styles.header}>
            <h1 className={styles.title}>Create a listing</h1>
            <p className={styles.sub}>Publish a service, item or swap for the V-ENT community.</p>
          </div>

          {renderStepper()}

          {step === 1 && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Title & description</h2>
              <p className={styles.label}>Title</p>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. PS5 Slim — barely used"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className={styles.hint}>Keep it short and specific. {title.length}/100</p>

              <p className={styles.label}>Description</p>
              <textarea
                className={styles.textarea}
                placeholder="Describe what you're offering, condition details, what's included, delivery time, and anything the buyer should know."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
              <p className={styles.hint}>{description.length}/2000</p>
            </div>
          )}

          {step === 2 && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Category & condition</h2>
              <p className={styles.label}>Category</p>
              <div className={styles.optionGrid}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    className={`${styles.optionBtn} ${category === c.v ? styles.optionBtnActive : ''}`}
                    onClick={() => setCategory(c.v)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <p className={styles.label} style={{ marginTop: '0.75rem' }}>Condition</p>
              <div className={styles.optionGrid}>
                {CONDITIONS.map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    className={`${styles.optionBtn} ${condition === c.v ? styles.optionBtnActive : ''}`}
                    onClick={() => setCondition(c.v)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Images</h2>
              <p className={styles.label}>Add up to {MAX_IMAGES} photos. The first image is the hero.</p>
              <div
                className={`${styles.mediaUpload} ${images.length >= MAX_IMAGES ? styles.mediaUploadDisabled : ''}`}
                onClick={addMockImage}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') addMockImage(); }}
              >
                <FiUploadCloud style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }} />
                <p style={{ margin: 0 }}>
                  {images.length >= MAX_IMAGES
                    ? `Maximum ${MAX_IMAGES} images reached`
                    : 'Click to add a sample image (demo mode)'}
                </p>
                <p className={styles.hint} style={{ marginTop: '0.4rem' }}>
                  {images.length} / {MAX_IMAGES}
                </p>
              </div>
              {images.length > 0 && (
                <div className={styles.mediaGrid}>
                  {images.map((src, i) => (
                    <div key={i} className={styles.mediaTile}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Upload ${i + 1}`} />
                      <button
                        type="button"
                        className={styles.mediaRemove}
                        onClick={() => removeImage(i)}
                        aria-label="Remove image"
                      >
                        <MdOutlineClose />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Price & shipping</h2>
              <div className={styles.row2}>
                <div>
                  <p className={styles.label}>Price (VENT COINS)</p>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 800"
                    value={priceVc}
                    onChange={(e) => setPriceVc(e.target.value)}
                    min="1"
                  />
                  <p className={styles.hint}>
                    {priceVc ? `≈ ₦${(parseInt(priceVc, 10) * 1000).toLocaleString()}` : '1 VC = ₦1,000'}
                  </p>
                </div>
                <div>
                  <p className={styles.label}>Stock</p>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div className={styles.row2}>
                <div>
                  <p className={styles.label}>Shipping cost (VC, set 0 for free)</p>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="e.g. 25"
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <p className={styles.label}>Region</p>
                  <select
                    className={styles.selectInput}
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <p className={styles.label}>Delivery method</p>
              <div className={styles.modeToggle}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${delivery === 'shipping' ? styles.modeBtnActive : ''}`}
                  onClick={() => setDelivery('shipping')}
                >
                  Ships nationwide
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${delivery === 'pickup_only' ? styles.modeBtnActive : ''}`}
                  onClick={() => setDelivery('pickup_only')}
                >
                  Pickup only
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${delivery === 'both' ? styles.modeBtnActive : ''}`}
                  onClick={() => setDelivery('both')}
                >
                  Pickup or shipping
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Review & submit</h2>
              <div className={styles.reviewCard}>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Title</span>
                  <span className={styles.reviewValue}>{title}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Category</span>
                  <span className={styles.reviewValue}>{category}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Condition</span>
                  <span className={styles.reviewValue}>{condition.replace('_', ' ')}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Images</span>
                  <div className={styles.reviewImagesRow}>
                    {images.slice(0, MAX_IMAGES).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt={`thumb ${i + 1}`} className={styles.reviewImageThumb} />
                    ))}
                  </div>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Price</span>
                  <span className={styles.reviewValue}>{priceVc} VC ≈ ₦{(parseInt(priceVc || '0', 10) * 1000).toLocaleString()}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Stock</span>
                  <span className={styles.reviewValue}>{stock}</span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Shipping</span>
                  <span className={styles.reviewValue}>
                    {parseInt(shipping || '0', 10) === 0 ? 'Free' : `${shipping} VC`} · {delivery === 'pickup_only' ? 'Pickup only' : delivery === 'both' ? 'Pickup or shipping' : 'Ships nationwide'}
                  </span>
                </div>
                <div className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>Region</span>
                  <span className={styles.reviewValue}>{region}</span>
                </div>
              </div>
              {error && <div className={styles.errorBanner}>{error}</div>}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || submitting}
              style={{ opacity: step === 1 ? 0.4 : 1 }}
            >
              Back
            </button>
            {step < STEPS.length ? (
              <button
                type="button"
                className={`${styles.nextBtn} redBTN`}
                onClick={() => canNext() && setStep((s) => s + 1)}
                disabled={!canNext()}
                style={{ opacity: canNext() ? 1 : 0.5 }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.nextBtn} redBTN`}
                onClick={submitListing}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Publish listing'}
              </button>
            )}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default CreateListing;
