import { useState } from "react";
import { PiCaretUpBold, PiCaretDownBold } from "react-icons/pi";
import { FiCheck, FiX, FiEdit3 } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'

const ReviewHeaderComponent = ({ title, children, isCompleted, editTabIndex, setSelectedTab }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleContent = () => {
        setIsOpen((prev) => !prev);
    }

    const handleEditClick = () => {
        setSelectedTab(editTabIndex)
    }

  return (
    <div className={createTournamentStyles.reviewContainer}>
        <div className={createTournamentStyles.reviewHeader}>
            <button className={createTournamentStyles.toggleContentBTN} onClick={toggleContent}>
                {isOpen ? <PiCaretUpBold /> : <PiCaretDownBold />}
                {title}
            </button>

            <div className={createTournamentStyles.completeAndEditContainer}>
                <div className={createTournamentStyles.completionStatusContainer}>
                    <p
                        className={isCompleted ? createTournamentStyles.completeParagraph : createTournamentStyles.inCompleteParagraph}>
                        <span
                            className={`${createTournamentStyles.checkIconSpan} ${isCompleted ? createTournamentStyles.checkIconSpan : createTournamentStyles.unCheckIconSpan}`}>
                            {isCompleted ? <FiCheck className={createTournamentStyles.checkIcon} /> : <FiX className={createTournamentStyles.checkIcon} />}
                        </span>
                        {isCompleted ? "Completed" : "Incomplete"}
                    </p>
                </div>
                <button className={createTournamentStyles.editBTN} onClick={handleEditClick}>
                    <FiEdit3 className={createTournamentStyles.editBTNIcon} />
                    Edit
                </button>
            </div>
        </div>

        {isOpen && (
            <div className={createTournamentStyles.reviewContentOuterContainer}>
<div className={createTournamentStyles.reviewContentContainer}>
                    {children}
                </div>
            </div>
        )}
    </div>
  )
}

export default ReviewHeaderComponent