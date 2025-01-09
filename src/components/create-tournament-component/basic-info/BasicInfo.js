import { IoMdArrowForward } from "react-icons/io";
import CreateTournamentTitle from './create-tournament-title/CreateTournamentTitle';
import CreateTournamentType from './create-tournament-type/CreateTournamentType';
import CreateTournamentSchedule from './create-tournament-schedule/CreateTournamentSchedule';
import CreateTournamentVisibility from './create-tournament-visibility/CreateTournamentVisibility';
import CreateTournamentLogo from './create-tournament-logo/CreateTournamentLogo';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';

const BasicInfo = ({ formData, setFormData, setSelectedTab }) => {
  // Function to handle form data updates and localStorage sync
  const updateFormData = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    localStorage.setItem('createTournamentData', JSON.stringify(updatedData));
  };

  const handleProceed = () => {
    setSelectedTab((prevTab) => prevTab + 1);
  };

  return (
    <div className={createTournamentStyles.generalTabContainer}>
      <header>
        <h1>Basic Info</h1>
      </header>

      <CreateTournamentTitle formData={formData} updateFormData={updateFormData} />

      <CreateTournamentType formData={formData} updateFormData={updateFormData} />

      <CreateTournamentSchedule formData={formData} updateFormData={updateFormData} />

      <CreateTournamentVisibility formData={formData} updateFormData={updateFormData} />

      <CreateTournamentLogo formData={formData} updateFormData={updateFormData} />

      <div className={createTournamentStyles.buttonContainer}>
        <button
          className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          onClick={() => alert('Draft saved')}
        >
          Save Draft
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
