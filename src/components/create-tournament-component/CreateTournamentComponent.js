import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ventFetch, API, tokenFrom } from '@/components/tournament-lib/tournamentApi';
import { validateAll } from './tournamentWizardValidation';
import ProgressMenu from './progress-menu/ProgressMenu';
import BasicInfo from './basic-info/BasicInfo';
import FormatParticipants from './format-participants/FormatParticipants';
import PrizeDistribution from './prize-distribution/PrizeDistribution';
import SponsorsLinks from './sponsors-links/SponsorsLinks';
import Review from './review/Review';
import styles from './create-tournament-component.module.css';

// Reads the persisted wizard draft synchronously. Used both as the lazy
// initializer for formData (so the very first render - and therefore every
// child's own useState-from-props seed - already has any draft data the
// page shell hydrated before mounting this component) and as a safe helper
// anywhere else we need the latest snapshot.
const readSavedFormData = () => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('createTournamentData');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const CreateTournamentComponent = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [selectedTab, setSelectedTab] = useState(1);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'error' | 'success', text }

  const [formData, setFormData] = useState(readSavedFormData);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  // Centralized function to update both state and localStorage. This is the
  // single source of truth every step writes through, so formData is always
  // current for whichever step is mounted (no per-step drift/races).
  const updateFormData = useCallback((key, value) => {
    setFormData((prevData) => {
      const updatedData = { ...prevData, [key]: value };
      try {
        localStorage.setItem('createTournamentData', JSON.stringify(updatedData));
      } catch {
        // Storage can fail (private mode, quota) - keep going in-memory.
      }
      return updatedData;
    });
  }, []);

  const updateFileData = (key, file) => {
    if (key === 'tournament_logo') {
      setLogoFile(file);
    } else if (key === 'tournament_banner') {
      setBannerFile(file);
    }
  };

  const handleSubmit = async (isDraft = false) => {
    setStatusMessage(null);

    // Drafts can always be saved partially. Publishing must pass every step.
    if (!isDraft) {
      const { isValid, firstInvalidStep, stepErrors } = validateAll(formData);
      if (!isValid) {
        setSelectedTab(firstInvalidStep);
        const stepLabel = stepErrors[firstInvalidStep]?.label || `Step ${firstInvalidStep}`;
        setStatusMessage({ type: 'error', text: `Please fix "${stepLabel}" before publishing.` });
        return;
      }
    }

    const token = tokenFrom(session);
    if (!token) {
      setStatusMessage({ type: 'error', text: 'You must be logged in to create a tournament.' });
      return;
    }

    if (isDraft) setIsSavingDraft(true);
    else setIsPublishing(true);

    try {
      if (!isDraft) {
        if (!formData.tournament_title || !formData.tournament_title.trim()) {
          setStatusMessage({ type: 'error', text: 'Please fill in the tournament title.' });
          setSelectedTab(1);
          return;
        }
        if (!formData.game || !formData.game.trim()) {
          setStatusMessage({ type: 'error', text: 'Please select a game for your tournament.' });
          setSelectedTab(1);
          return;
        }
      }

      let sponsor_names = [];
      let sponsor_types = [];
      let sponsor_usernames = [];

      if (Array.isArray(formData.sponsors)) {
        sponsor_names = formData.sponsors.map((sponsor) => sponsor.name || '');
        sponsor_types = formData.sponsors.map((sponsor) => sponsor.type || 'individual');
        sponsor_usernames = formData.sponsors.map((sponsor) => sponsor.username || '');
      } else if (Array.isArray(formData.sponsor_names)) {
        sponsor_names = formData.sponsor_names;
        sponsor_types = formData.sponsor_types || [];
        sponsor_usernames = formData.sponsor_usernames || [];
      }

      const socialLinks = formData.webSocialLinks || formData;

      const formDataToSend = new FormData();
      formDataToSend.append('tournament_title', formData.tournament_title || '');
      formDataToSend.append('game', formData.game || '');
      if (formData.game_id !== undefined && formData.game_id !== null && formData.game_id !== '') {
        formDataToSend.append('game_id', formData.game_id);
      }
      formDataToSend.append('game_mode', formData.game_mode || '');
      formDataToSend.append('tournament_description', formData.tournament_description || '');
      formDataToSend.append('tournament_type', formData.tournament_type || '');
      formDataToSend.append('start_date_and_time', formData.start_date_and_time || '');
      formDataToSend.append('end_date_and_time', formData.end_date_and_time || '');
      formDataToSend.append('reg_start_date_and_time', formData.reg_start_date_and_time || '');
      formDataToSend.append('reg_end_date_and_time', formData.reg_end_date_and_time || '');
      formDataToSend.append('tournament_location', formData.tournament_location || '');
      formDataToSend.append('virtual_link', formData.virtual_link || '');

      formDataToSend.append('hide_location', formData.hide_location ? 'true' : 'false');

      formDataToSend.append('tournament_visibility', formData.tournament_visibility || 'public');
      formDataToSend.append('entry_type', formData.entry_type || '');
      formDataToSend.append('entry_fee_price', parseFloat(formData.entry_fee) || 0);

      formDataToSend.append('tournament_access', formData.tournament_access || '');
      formDataToSend.append('team_size', parseInt(formData.team_size, 10) || 1);
      formDataToSend.append('min_number_of_participants', parseInt(formData.min_number_of_participants, 10) || 8);
      formDataToSend.append('max_number_of_participants', parseInt(formData.max_number_of_participants, 10) || 32);
      formDataToSend.append('bracket_type', formData.bracket_type || '');
      formDataToSend.append('tournament_rules', formData.tournament_rules || '');

      // The organiser settings from step 2. Sent as one JSON object because
      // the backend validates them as a set (a group stage that advances more
      // than it holds is only wrong when both numbers are read together).
      formDataToSend.append('options', JSON.stringify(formData.options || {}));

      formDataToSend.append('prize_type', formData.prize_distribution_type || 'distributed');

      let prizeData = [];
      if (Array.isArray(formData.prize_distribution)) {
        prizeData = formData.prize_distribution.map((prize, index) => ({
          position: prize.position || index + 1,
          prize: parseFloat(prize.amount ?? prize.prize ?? 0) || 0,
          extras: prize.extras ?? prize.extra ?? '',
        }));
      }
      formDataToSend.append('prize_data', JSON.stringify(prizeData));

      // 'winner-takes-all' is what this wizard actually sets; 'winner_takes_all'
      // kept for tolerance in case a draft was saved under an older spelling.
      if (formData.prize_distribution_type === 'winner-takes-all' || formData.prize_distribution_type === 'winner_takes_all') {
        formDataToSend.append('winner_prize', parseFloat(formData.winner_prize) || 0);
      }

      formDataToSend.append('sponsor_names', JSON.stringify(sponsor_names));
      formDataToSend.append('sponsor_types', JSON.stringify(sponsor_types));
      formDataToSend.append('sponsor_usernames', JSON.stringify(sponsor_usernames));

      formDataToSend.append('is_draft', isDraft ? '1' : '0');

      if (logoFile) formDataToSend.append('tournament_logo', logoFile);
      if (bannerFile) formDataToSend.append('tournament_banner', bannerFile);

      if (socialLinks.facebook_link) formDataToSend.append('facebook_link', socialLinks.facebook_link);
      if (socialLinks.twitter_link) formDataToSend.append('twitter_link', socialLinks.twitter_link);
      if (socialLinks.instagram_link) formDataToSend.append('instagram_link', socialLinks.instagram_link);
      if (socialLinks.youtube_link) formDataToSend.append('youtube_link', socialLinks.youtube_link);
      if (socialLinks.twitch_link) formDataToSend.append('twitch_link', socialLinks.twitch_link);
      if (socialLinks.kick_link) formDataToSend.append('kick_link', socialLinks.kick_link);
      if (socialLinks.tiktok_link) formDataToSend.append('tiktok_link', socialLinks.tiktok_link);
      if (socialLinks.bigolive_link) formDataToSend.append('bigolive_link', socialLinks.bigolive_link);

      const data = await ventFetch(API.TOURNAMENT.CREATE, {
        method: 'POST',
        token,
        isFormData: true,
        body: formDataToSend,
      });

      const tournamentId = data?.tournament_id || data?.tournament?.id || data?.id || null;
      // The readable address, so the organiser lands on the link they will copy.
      const tournamentSlug = data?.slug || data?.data?.slug || data?.tournament?.slug || null;

      setFormData({});
      setLogoFile(null);
      setBannerFile(null);
      try { localStorage.removeItem('createTournamentData'); } catch {
        // Nothing to clean up if storage isn't available.
      }

      setStatusMessage({
        type: 'success',
        text: isDraft ? 'Tournament saved as draft.' : 'Tournament published successfully.',
      });

      if (isDraft) {
        router.push('/tournaments/drafts');
      } else if (tournamentId) {
        // Land on the readable address, which is what the organiser will copy.
        router.push(`/tournaments/${tournamentSlug || tournamentId}`);
      } else {
        router.push('/tournaments/drafts');
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error?.message || `Failed to ${isDraft ? 'save draft' : 'publish tournament'}.`,
      });
    } finally {
      if (isDraft) setIsSavingDraft(false);
      else setIsPublishing(false);
    }
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 1:
        return (
          <BasicInfo
            formData={formData}
            setSelectedTab={setSelectedTab}
            updateFormData={updateFormData}
            updateFileData={updateFileData}
            handleSubmit={handleSubmit}
            isSavingDraft={isSavingDraft}
          />
        );
      case 2:
        return (
          <FormatParticipants
            formData={formData}
            setSelectedTab={setSelectedTab}
            updateLocalStorage={updateFormData}
            handleSubmit={handleSubmit}
            isSavingDraft={isSavingDraft}
          />
        );
      case 3:
        return (
          <PrizeDistribution
            formData={formData}
            setSelectedTab={setSelectedTab}
            updateLocalStorage={updateFormData}
            handleSubmit={handleSubmit}
            isSavingDraft={isSavingDraft}
          />
        );
      case 4:
        return (
          <SponsorsLinks
            formData={formData}
            setFormData={setFormData}
            setSelectedTab={setSelectedTab}
            handleSubmit={handleSubmit}
            isSavingDraft={isSavingDraft}
          />
        );
      case 5:
        return (
          <Review
            formData={formData}
            handleSubmit={handleSubmit}
            setSelectedTab={setSelectedTab}
            isSavingDraft={isSavingDraft}
            isPublishing={isPublishing}
          />
        );
      default:
        return (
          <BasicInfo
            formData={formData}
            setSelectedTab={setSelectedTab}
            updateFormData={updateFormData}
            updateFileData={updateFileData}
            handleSubmit={handleSubmit}
            isSavingDraft={isSavingDraft}
          />
        );
    }
  };

  return (
    <div className={styles.createTournamentContainer}>
      {statusMessage && (
        <div
          className={`${styles.statusBanner} ${statusMessage.type === 'success' ? styles.statusSuccess : styles.statusError}`}
          role="status"
        >
          {statusMessage.text}
        </div>
      )}
      <ProgressMenu selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <div className={styles.renderTabContent}>{renderTabContent()}</div>
    </div>
  );
};

export default CreateTournamentComponent;
