import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IoMdArrowForward } from "react-icons/io";
import { ventFetch, API, tokenFrom, toTournamentArray } from "@/components/tournament-lib/tournamentApi";
import CreateTournamentTitle from './create-tournament-title/CreateTournamentTitle';
import CreateTournamentType from './create-tournament-type/CreateTournamentType';
import CreateTournamentSchedule from './create-tournament-schedule/CreateTournamentSchedule';
import CreateTournamentVisibility from './create-tournament-visibility/CreateTournamentVisibility';
import CreateTournamentLogo from './create-tournament-logo/CreateTournamentLogo';
import { validateBasicInfo } from '../tournamentWizardValidation';
import ValidationSummary from '../validation-summary/ValidationSummary';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const BasicInfo = ({
  logoFile,
  bannerFile,
  setSelectedTab,
  formData = {},
  updateFormData,
  updateFileData,
  handleSubmit,
  isSavingDraft
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [errors, setErrors] = useState({});

  // The real game catalogue (GET /auth/games/). This used to be derived from
  // whatever games existing tournaments happened to use, with a hardcoded
  // fallback list of six titles the platform might not even run.
  const loadGames = useCallback(async () => {
    setGamesLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/games/`);
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      // The editions come with each game. Dropping them here is what left the
      // wizard unable to ask which one.
      setGames((body?.data?.games || []).map(g => ({
        id: g.id,
        name: g.name,
        series: g.series || []
      })));
    } catch {
      setGames([]);
    } finally {
      setGamesLoading(false);
    }
  }, []);
  useEffect(() => {
    loadGames();
  }, [loadGames]);
  const handleProceed = () => {
    const {
      isValid,
      errors: fieldErrors
    } = validateBasicInfo(formData);
    setErrors(fieldErrors);
    if (!isValid) return;
    setSelectedTab(prevTab => prevTab + 1);
  };
  const handleSaveDraft = () => {
    if (handleSubmit) handleSubmit(true);
  };
  return <div>
      {/* Basic Info Header */}
      <div>
        <h2>{tt("ui.basic.info.09a7", "Basic Info")}</h2>
      </div>

      <ValidationSummary errors={errors} />

      {/* Form Components */}
      <CreateTournamentTitle formData={formData} updateFormData={updateFormData} games={games} gamesLoading={gamesLoading} />
      <CreateTournamentType formData={formData} updateFormData={updateFormData} />
      <CreateTournamentSchedule formData={formData} updateFormData={updateFormData} />
      <CreateTournamentVisibility formData={formData} updateFormData={updateFormData} />
      <CreateTournamentLogo updateFileData={updateFileData} logoFile={logoFile} bannerFile={bannerFile} />

      {/* Action Buttons */}
      <div className={createTournamentStyles.buttonContainer}>
        <button className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`} onClick={handleSaveDraft} disabled={isSavingDraft}>
          {isSavingDraft ? tx("Saving...") : tx("Save Draft")}
        </button>

        <button className={`${createTournamentStyles.btn} ${createTournamentStyles.proceedBTN}`} onClick={handleProceed}>
          {tt("ui.proceed.02ed", "Proceed")}
          <IoMdArrowForward className={createTournamentStyles.forwardArrowIcon} />
        </button>
      </div>
    </div>;
};
export default BasicInfo;