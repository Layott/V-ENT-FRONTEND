import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaAsterisk, FaTrash, FaPlus } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './prize-distribution-inside.module.css';

// Reconstructs the position/prize/extras working state from the persisted
// formData.prize_distribution array so re-visiting this step (or opening a
// draft) doesn't wipe out prior entries.
const buildInitialPrizeState = (formData) => {
  const saved = Array.isArray(formData?.prize_distribution) ? formData.prize_distribution : [];
  const prizes = {};
  const extraBonuses = {};
  const savedPositions = [];

  saved.forEach((entry) => {
    const position = Number(entry?.position);
    if (!position) return;
    savedPositions.push(position);
    if (entry.prize !== null && entry.prize !== undefined && entry.prize !== '') {
      prizes[`prizePosition${position}`] = entry.prize;
    }
    if (entry.extras !== null && entry.extras !== undefined && entry.extras !== '') {
      extraBonuses[`extraBonus${position}`] = entry.extras;
    }
  });

  const positions = savedPositions.length > 0
    ? Array.from(new Set([1, 2, 3, ...savedPositions])).sort((a, b) => a - b)
    : [1, 2, 3];

  return { positions, prizes, extraBonuses };
};

const PrizeDistributionInside = ({ formData = {}, updateFormData }) => {
  const initial = buildInitialPrizeState(formData);
  const [selectedOption, setSelectedOption] = useState(formData?.prize_distribution_type || "");
  const [positions, setPositions] = useState(initial.positions);
  const [prizes, setPrizes] = useState(initial.prizes);
  const [extraBonuses, setExtraBonuses] = useState(initial.extraBonuses);
  const [winnerPrize, setWinnerPrize] = useState(formData?.winner_prize ?? '');

  useEffect(() => {
    const formattedPrizeDistribution = positions.map((position) => ({
      position,
      prize: prizes[`prizePosition${position}`] || null,
      extras: extraBonuses[`extraBonus${position}`] || null,
    })).filter(entry => entry.prize !== null || entry.extras !== null);

    updateFormData('prize_distribution_type', selectedOption);
    updateFormData('prize_distribution', formattedPrizeDistribution);
    if (selectedOption === 'winner-takes-all') {
      updateFormData('winner_prize', winnerPrize);
    }
  }, [selectedOption, prizes, extraBonuses, positions, winnerPrize, updateFormData]);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    if (option !== 'distributed') {
      setPrizes({});
      setExtraBonuses({});
    }
    if (option !== 'winner-takes-all') {
      setWinnerPrize('');
    }
  };

  const addAnotherPosition = () => {
    setPositions((prevPositions) => [...prevPositions, prevPositions.length > 0 ? Math.max(...prevPositions) + 1 : 1]);
  };

  const deletePosition = (position) => {
    if (position > 3) {
      setPositions(positions.filter((pos) => pos !== position));
      const newPrizes = { ...prizes };
      delete newPrizes[`prizePosition${position}`];
      setPrizes(newPrizes);

      const newExtras = { ...extraBonuses };
      delete newExtras[`extraBonus${position}`];
      setExtraBonuses(newExtras);
    }
  };

  const handlePrizeChange = (position, value) => {
    setPrizes((prevPrizes) => ({
      ...prevPrizes,
      [`prizePosition${position}`]: value,
    }));
  };

  const handleBonusChange = (position, value) => {
    setExtraBonuses((prevExtras) => ({
      ...prevExtras,
      [`extraBonus${position}`]: value,
    }));
  };

  const totalPrize = Object.values(prizes).reduce((total, prize) => total + (parseFloat(prize) || 0), 0);

  const formatNumber = (num) => new Intl.NumberFormat().format(num);

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <p>How should the prize be distributed between participants?</p>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {[
            { id: "distributed", title: "Distributed", description: "Reward is distributed between winners." },
            { id: "winner-takes-all", title: "Winner takes all", description: "Winner takes the whole reward." },
            { id: "no-prize", title: "No Prize", description: "No reward is given to winners." }
          ].map((option) => (
            <div
              key={option.id}
              className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === option.id ? createTournamentStyles.activeBox : ""}`}
              onClick={() => handleOptionClick(option.id)}
            >
              <div className={`${createTournamentStyles.option} ${selectedOption === option.id ? createTournamentStyles.selected : ""}`} />
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{option.title}</h4>
                <p>{option.description}</p>
              </div>
            </div>
          ))}
        </div>

        {selectedOption === "distributed" && (
          <div className={styles.distributedContainer}>
            <p className={createTournamentStyles.infoParagraph}>
              <span className={styles.infoSpan}>
                <FiInfo className={styles.infoIcon} />
              </span>
              Any position left empty will be omitted. All amounts are in v-ent coins.
            </p>

            {positions.map((position) => (
              <div key={position} className={`${createTournamentStyles.twoInputContainer} ${styles.twoInputContainer}`}>
                <div className={createTournamentStyles.inputGroup}>
                  <label htmlFor={`prizePosition${position}`} className={createTournamentStyles.labelWithAsterisk}>
                    {position} Place {position === 1 && "(Winner)"}
                    <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                  </label>
                  <input
                    id={`prizePosition${position}`}
                    type="number"
                    placeholder={`Enter Prize for ${position} Place (Number)`}
                    className={createTournamentStyles.inputNumber}
                    value={prizes[`prizePosition${position}`] || ""}
                    onChange={(e) => handlePrizeChange(position, e.target.value)}
                  />
                </div>

                <div className={createTournamentStyles.inputGroup}>
                  <label htmlFor={`extraBonus${position}`} className={createTournamentStyles.labelWithAsterisk}>
                    Extras (e.g., Bonuses)
                    <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                  </label>
                  <input
                    id={`extraBonus${position}`}
                    type="text"
                    placeholder="Enter Extra Bonus (Text)"
                    className={`${createTournamentStyles.inputText} ${styles.inputText}`}
                    value={extraBonuses[`extraBonus${position}`] || ""}
                    onChange={(e) => handleBonusChange(position, e.target.value)}
                  />
                </div>

                {position > 3 && (
                  <button
                    type="button"
                    className={`${styles.deleteBTN}`}
                    onClick={() => deletePosition(position)}
                  >
                    <FaTrash className={styles.deleteIcon} />
                  </button>
                )}
              </div>
            ))}

            <div className={styles.addBTNContainer}>
              <button type="button" className={styles.addAnotherBTN} onClick={addAnotherPosition}>
                <FaPlus className={styles.plusIcon} />
                Add Another
              </button>
            </div>
          </div>
        )}

        {selectedOption === "winner-takes-all" && (
          <div className={styles.winnerTakesAllContainer}>
            <div className={`${createTournamentStyles.inputGroup} ${styles.inputGroup}`}>
              <label htmlFor="winnerPrize" className={createTournamentStyles.labelWithAsterisk}>
                Prize
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>
              <input
                id="winnerPrize"
                type="number"
                placeholder="Enter Amount for Prize"
                className={createTournamentStyles.inputNumber}
                value={winnerPrize}
                onChange={(e) => setWinnerPrize(e.target.value)}
              />
            </div>
            <p className={createTournamentStyles.infoParagraph}>
              <span className={styles.infoSpan}>
                <FiInfo className={styles.infoIcon} />
              </span>
              Prize amount should be in v-ent coins.
            </p>
          </div>
        )}

        {selectedOption === "no-prize" && (
          <div className={styles.noPrizeContainer}>
            <p>No prize will be given for this tournament.</p>
          </div>
        )}

        {selectedOption === "distributed" && totalPrize > 0 && (
          <div className={styles.totalPrizeContainer}>
            <p className={styles.totalPrizeText}>
              Total Prize: <span className={styles.totalPrizeAmount}>{formatNumber(totalPrize)} v-ent coins</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

PrizeDistributionInside.propTypes = {
  formData: PropTypes.shape({
    prize_distribution_type: PropTypes.string,
    prize_distribution: PropTypes.array,
    winner_prize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  updateFormData: PropTypes.func.isRequired,
};

export default PrizeDistributionInside;
