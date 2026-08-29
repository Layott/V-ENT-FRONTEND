'use client';

// The tournament's rules: typed, and as a document.
//
// The typed field was capped at 1,000 characters and drawn four lines tall. A
// real ruleset runs to pages - format, seeding, substitutes, disconnections,
// what counts as a forfeit - so the box was refusing input before anybody had
// finished describing how a match is won. The column behind it is a TextField
// with no limit at all; the cap was invented here.
//
// CEO: "this should have a lot more space for characters since its rules, the
// text s typically a lot. It should also allow uploading of documents, so
// people can download the rule document also."
//
// So both. The document is the version an entrant argues a call from, and the
// typed text is what somebody on a phone reads without downloading anything.
// Neither replaces the other.

import { useEffect, useState } from 'react';
import { FiFileText, FiInfo, FiX } from 'react-icons/fi';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import tournamentTitleStyles from './../../basic-info/create-tournament-title/create-tournament-title.module.css';
import styles from './tournament-rules.module.css';
import { useT } from '@/i18n/LanguageProvider';

const MAX_CHARS = 20000;
const MAX_DOC_MB = 10;
const DOC_TYPES = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'];

const TournamentRules = ({
  formData = {},
  updateFormData,
  rulesFile,
  updateFileData
}) => {
  const tt = useT();
  const [description, setDescription] = useState(formData?.tournament_rules || '');
  const [docError, setDocError] = useState('');

  useEffect(() => {
    updateFormData('tournament_rules', description);
  }, [description, updateFormData]);

  const handleDescriptionChange = event => {
    const value = event.target.value;
    if (value.length <= MAX_CHARS) setDescription(value);
  };

  // Refused when it is chosen rather than after the whole wizard is filled in.
  const pickDoc = event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!DOC_TYPES.includes(file.type)) {
      setDocError(tt('rules.docType', 'Upload a PDF, a Word document or a text file.'));
      return;
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setDocError(tt('rules.docSize', 'That file is over {n} MB.').replace('{n}', MAX_DOC_MB));
      return;
    }
    setDocError('');
    if (updateFileData) updateFileData('rules_document', file);
  };

  const remaining = MAX_CHARS - description.length;

  return (
    <div className={`${createTournamentStyles.createSubSectionContainer} ${tournamentTitleStyles.createSubSectionContainer}`}>
      <h3 className={createTournamentStyles.tournamentTypeH3}>
        {tt('ui.tournament.rules.df25', 'Tournament Rules')}
      </h3>

      <div className={tournamentTitleStyles.tournamentDescriptionContainer}>
        <textarea id="tournament-rules" name="tournament_rules" value={description}
                  onChange={handleDescriptionChange}
                  placeholder={tt('ui.enter.tournament.rules.7ea0', 'Enter the tournament rules...')}
                  className={`${createTournamentStyles.inputText} ${styles.rulesArea}`} />

        <p className={tournamentTitleStyles.infoParagraph}>
          <span className={tournamentTitleStyles.infoSpan}>
            <FiInfo className={tournamentTitleStyles.infoIcon} />
          </span>
          {/* Counted down rather than up. What somebody wants to know while
              typing a long ruleset is how much room is left, not how much
              they have used. */}
          {tt('rules.remaining', '{n} characters left.').replace('{n}', remaining.toLocaleString())}
        </p>
      </div>

      {/* The document. Beside the typed rules, never instead of them. */}
      <div className={styles.docBlock}>
        <p className={styles.docTitle}>
          {tt('rules.docTitle', 'Rules document')}
        </p>
        <p className={styles.docHint}>
          {tt('rules.docHint', 'Optional. Entrants can download this from the tournament page. PDF, Word or text, up to 10 MB.')}
        </p>

        {rulesFile
          ? <div className={styles.docRow}>
              <FiFileText aria-hidden="true" />
              <span className={styles.docName}>{rulesFile.name}</span>
              <button type="button" className={styles.docRemove}
                      onClick={() => updateFileData && updateFileData('rules_document', null)}>
                <FiX aria-hidden="true" />
                {tt('rules.docRemove', 'Remove')}
              </button>
            </div>
          : <label className={styles.docPick}>
              <FiFileText aria-hidden="true" />
              {tt('rules.docPick', 'Choose a rules document')}
              <input type="file" hidden accept=".pdf,.doc,.docx,.txt" onChange={pickDoc} />
            </label>}

        {docError && <p className={styles.docError}>{docError}</p>}
      </div>
    </div>
  );
};

export default TournamentRules;
