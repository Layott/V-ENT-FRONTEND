import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTx } from '@/i18n/LanguageProvider';
import { ventFetch, API, tokenFrom } from '@/components/tournament-lib/tournamentApi';
import { validateAll } from './tournamentWizardValidation';
import ProgressMenu from './progress-menu/ProgressMenu';
import BasicInfo from './basic-info/BasicInfo';
import FormatParticipants from './format-participants/FormatParticipants';
import { isLeagueFormat } from './format-participants/league-setup/LeagueSetup';
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

// `draftId` is the tournament this wizard is EDITING, when it was opened from
// a saved draft. Without it every save created another row: the CEO pressed
// Save Draft twice and got two identical tournaments in the list.
const CreateTournamentComponent = ({ draftId = null }) => {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  // Status-banner sentences are English in the source and looked up by
  // their text, the same way the wizard's validation messages are.
  const tx = useTx();

  const [selectedTab, setSelectedTab] = useState(1);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'error' | 'success', text }
  const bannerRef = useRef(null);

  const [formData, setFormData] = useState(readSavedFormData);
  const [logoFile, setLogoFile] = useState(null);
  // The rules as a document, held here beside the images for the same
  // reason: a File cannot go into the draft, so the parent has to hold it
  // or a step change loses it.
  const [rulesFile, setRulesFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  // Centralized function to update both state and localStorage. This is the
  // single source of truth every step writes through, so formData is always
  // current for whichever step is mounted (no per-step drift/races).
  const updateFormData = useCallback((key, value) => {
    setFormData((prevData) => {
      const updatedData = { ...prevData, [key]: value };
      try {
        // A File cannot be stored and an object URL is meaningless in the next
        // session, so neither goes into the draft. Only what can be restored.
        const forStorage = {
          ...updatedData,
          sponsors: Array.isArray(updatedData.sponsors)
            ? updatedData.sponsors.map(({ logoFile, logo, ...rest }) => rest)
            : updatedData.sponsors,
        };
        localStorage.setItem('createTournamentData', JSON.stringify(forStorage));
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
    } else if (key === 'rules_document') {
      setRulesFile(file);
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

    // A session that is still resolving has no token yet, and treating that as
    // "not logged in" is how somebody who IS logged in gets told they are not.
    // The publish waits for the answer instead of racing it.
    if (sessionStatus === 'loading') {
      setStatusMessage({ type: 'error', text: tx('One moment - still checking you are signed in. Press again.') });
      return;
    }

    const token = tokenFrom(session);
    if (!token) {
      setStatusMessage({ type: 'error', text: tx('You must be logged in to create a tournament.') });
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
      // The edition and the event this tournament belongs to. Both are asked
      // for on step 1 and neither was ever sent, so both were gone the moment
      // the organiser left the page.
      formDataToSend.append('series_id', formData.series_id || '');
      if (formData.event) formDataToSend.append('event', formData.event);
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

      // How the table is scored, for a format decided by one. Sent with the
      // tournament rather than as a second call: a tournament created without
      // these generates a plain round robin, because the seat count lives on
      // the league rules row - so a second call that failed would leave a
      // league whose fixtures have no matches in them, and no sign of why.
      if (isLeagueFormat(formData.bracket_type)) {
        formDataToSend.append('points_win', String(formData.points_win ?? 3));
        formDataToSend.append('points_draw', String(formData.points_draw ?? 1));
        formDataToSend.append('points_loss', String(formData.points_loss ?? 0));
        formDataToSend.append('players_per_team',
          String(formData.players_per_team ?? formData.team_size ?? 1));
        // A multipart form cannot carry a list, so the order travels as JSON
        // and the server parses it back.
        formDataToSend.append('tiebreakers',
          JSON.stringify(Array.isArray(formData.tiebreakers) ? formData.tiebreakers : []));
      }

      formDataToSend.append('is_draft', isDraft ? '1' : '0');

      if (logoFile) formDataToSend.append('tournament_logo', logoFile);
      if (rulesFile) formDataToSend.append('rules_document', rulesFile);
      if (bannerFile) formDataToSend.append('tournament_banner', bannerFile);

      // Sponsor logos, in the same order as the names above. The backend has
      // always read request.FILES.getlist('sponsor_logos') and matched them by
      // index; nothing ever sent them, so every sponsor logo was silently
      // dropped. An empty slot is sent as a blank so the indexes still line up
      // with the names.
      if (Array.isArray(formData.sponsors)) {
        formData.sponsors.forEach((sponsor) => {
          if (sponsor?.logoFile instanceof File) {
            formDataToSend.append('sponsor_logos', sponsor.logoFile);
          } else {
            formDataToSend.append('sponsor_logos', new Blob([]), '');
          }
        });
      }

      if (socialLinks.facebook_link) formDataToSend.append('facebook_link', socialLinks.facebook_link);
      if (socialLinks.twitter_link) formDataToSend.append('twitter_link', socialLinks.twitter_link);
      if (socialLinks.instagram_link) formDataToSend.append('instagram_link', socialLinks.instagram_link);
      if (socialLinks.youtube_link) formDataToSend.append('youtube_link', socialLinks.youtube_link);
      if (socialLinks.twitch_link) formDataToSend.append('twitch_link', socialLinks.twitch_link);
      if (socialLinks.kick_link) formDataToSend.append('kick_link', socialLinks.kick_link);
      if (socialLinks.tiktok_link) formDataToSend.append('tiktok_link', socialLinks.tiktok_link);
      if (socialLinks.bigolive_link) formDataToSend.append('bigolive_link', socialLinks.bigolive_link);

      // Update the draft we opened, or create one if this is a new tournament.
      //
      // This was always a POST to CREATE, so pressing Save Draft twice made two
      // tournaments, and the second copy carried none of the images from the
      // first - which is why the logo and banner appeared to "not save".
      const data = draftId
        ? await ventFetch(API.TOURNAMENT.EDIT(draftId), {
            method: 'PUT',
            token,
            isFormData: true,
            body: formDataToSend,
          })
        : await ventFetch(API.TOURNAMENT.CREATE, {
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
            logoFile={logoFile}
            bannerFile={bannerFile}
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
            rulesFile={rulesFile}
            updateFileData={updateFileData}
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
            logoFile={logoFile}
            bannerFile={bannerFile}
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

  // Scrolled to, not just rendered. See the note on the banner below.
  useEffect(() => {
    if (statusMessage && bannerRef.current) {
      bannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [statusMessage]);

  return (
    <div className={styles.createTournamentContainer}>
      {/* Brought into view when it appears. It renders at the top of a page
          several screens long and Publish is at the bottom, so a refusal was
          being announced somewhere nobody was looking - which reads exactly
          like the button doing nothing. */}
      {statusMessage && (
        <div
          ref={bannerRef}
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
