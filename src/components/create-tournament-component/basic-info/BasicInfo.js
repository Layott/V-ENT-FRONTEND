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

const BasicInfo = ({ setSelectedTab, formData = {}, updateFormData, updateFileData, handleSubmit, isSavingDraft }) => {
  const { data: session } = useSession();
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
      setGames((body?.data?.games || []).map((g) => ({ id: g.id, name: g.name })));
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
    const { isValid, errors: fieldErrors } = validateBasicInfo(formData);
    setErrors(fieldErrors);
    if (!isValid) return;
    setSelectedTab((prevTab) => prevTab + 1);
  };

  const handleSaveDraft = () => {
    if (handleSubmit) handleSubmit(true);
  };

  return (
    <div>
      {/* Basic Info Header */}
      <div>
        <h2>Basic Info</h2>
      </div>

      <ValidationSummary errors={errors} />

      {/* Form Components */}
      <CreateTournamentTitle
        formData={formData}
        updateFormData={updateFormData}
        games={games}
        gamesLoading={gamesLoading}
      />
      <CreateTournamentType
        formData={formData}
        updateFormData={updateFormData}
      />
      <CreateTournamentSchedule
        formData={formData}
        updateFormData={updateFormData}
      />
      <CreateTournamentVisibility
        formData={formData}
        updateFormData={updateFormData}
      />
      <CreateTournamentLogo
        formData={formData}
        updateFormData={updateFormData}
        updateFileData={updateFileData}
      />

      {/* Action Buttons */}
      <div className={createTournamentStyles.buttonContainer}>
        <button
          className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          onClick={handleSaveDraft}
          disabled={isSavingDraft}
        >
          {isSavingDraft ? 'Saving...' : 'Save Draft'}
        </button>

        <button
          className={`${createTournamentStyles.btn} ${createTournamentStyles.proceedBTN}`}
          onClick={handleProceed}
        >
          Proceed
          <IoMdArrowForward className={createTournamentStyles.forwardArrowIcon} />
        </button>
      </div>
    </div>
  );
};

export default BasicInfo;
