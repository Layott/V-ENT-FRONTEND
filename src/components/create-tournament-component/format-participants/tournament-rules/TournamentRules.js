import { useState } from 'react';
// import ReactQuill from 'react-quill';
// import 'react-quill/dist/quill.snow.css'

import { FiInfo } from "react-icons/fi";
import modules from '@/components/react-quill/reactQuillModule';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import tournamentTitleStyles from './../../basic-info/create-tournament-title/create-tournament-title.module.css'

const TournamentRules = () => {
    const [description, setDescription] = useState('');

    const handleDescriptionChange = (value) => {
        setDescription(value);
    }

  return (
    <div className={`${createTournamentStyles.createSubSectionContainer} ${tournamentTitleStyles.createSubSectionContainer}`}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Tournament Rules</h3>
        
        <div className={tournamentTitleStyles.tournamentDescriptionContainer}>
            {/* <ReactQuill
                type={description}
                onChange={handleDescriptionChange}
                modules={modules}
                theme='snow'
            /> */}

            <p className={tournamentTitleStyles.infoParagraph}>
                <span className={tournamentTitleStyles.infoSpan}>
                    <FiInfo className={tournamentTitleStyles.infoIcon} />
                </span>
                Max of 1,000 characters.
            </p>
        </div>

    </div>
  )
}

export default TournamentRules