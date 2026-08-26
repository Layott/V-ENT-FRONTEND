'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaAsterisk, FaTrash, FaPlus } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './prize-distribution-inside.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Reconstructs the position/prize/extras working state from the persisted
// formData.prize_distribution array so re-visiting this step (or opening a
// draft) doesn't wipe out prior entries.
const buildInitialPrizeState = formData => {
  const saved = Array.isArray(formData?.prize_distribution) ? formData.prize_distribution : [];
  const prizes = {};
  const extraBonuses = {};
  const bonusAmounts = {};
  const savedPositions = [];
  saved.forEach(entry => {
    const position = Number(entry?.position);
    if (!position) return;
    savedPositions.push(position);
    if (entry.prize !== null && entry.prize !== undefined && entry.prize !== '') {
      prizes[`prizePosition${position}`] = entry.prize;
    }
    if (entry.extras !== null && entry.extras !== undefined && entry.extras !== '') {
      extraBonuses[`extraBonus${position}`] = entry.extras;
    }
    if (entry.extras_amount) {
      bonusAmounts[`bonusAmount${position}`] = entry.extras_amount;
    }
  });
  const positions = savedPositions.length > 0 ? Array.from(new Set([1, 2, 3, ...savedPositions])).sort((a, b) => a - b) : [1, 2, 3];
  return {
    positions,
    prizes,
    extraBonuses,
    bonusAmounts
  };
};
const PrizeDistributionInside = ({
  formData = {},
  updateFormData
}) => {
  const tx = useTx();
  const tt = useT();
  const initial = buildInitialPrizeState(formData);
  const [selectedOption, setSelectedOption] = useState(formData?.prize_distribution_type || "");
  const [positions, setPositions] = useState(initial.positions);
  const [prizes, setPrizes] = useState(initial.prizes);
  const [extraBonuses, setExtraBonuses] = useState(initial.extraBonuses);
  const [winnerPrize, setWinnerPrize] = useState(formData?.winner_prize ?? '');

  // Currency, the announced pool, and the bonus amounts. An organiser thinks in
  // naira or dollars; the platform pays in coins. Both are kept, and the
  // conversion shown here is a preview - the server does the arithmetic that
  // counts, from the currency and the amount, so a figure edited in the browser
  // cannot become a prize.
  const [currency, setCurrency] = useState(formData?.prize_currency || 'VC');
  const [poolTotal, setPoolTotal] = useState(formData?.prize_pool_total ?? '');
  const [bonusAmounts, setBonusAmounts] = useState(initial.bonusAmounts || {});
  const [rates, setRates] = useState({
    ngn_per_coin: 1000,
    ngn_per_usd: 1500
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tournament/prize-rates/`);
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled && body?.data) setRates(body.data);
      } catch {
        /* the defaults match the published rate */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Same rule as the server: coins are whole, and a half rounds up so a pool
  // never quietly pays less than what was announced.
  const toCoins = amount => {
    const value = parseFloat(amount);
    if (!value || value <= 0) return 0;
    if (currency === 'VC') return Math.round(value);
    if (currency === 'NGN') return Math.round(value / rates.ngn_per_coin);
    if (currency === 'USD') return Math.round(value * rates.ngn_per_usd / rates.ngn_per_coin);
    return 0;
  };
  const symbol = {
    VC: 'VC',
    NGN: '\u20a6',
    USD: '$'
  }[currency] || '';
  const showCoins = amount => {
    const coins = toCoins(amount);
    return coins ? `${coins.toLocaleString()} VC` : '0 VC';
  };
  useEffect(() => {
    const formattedPrizeDistribution = positions.map(position => ({
      position,
      // `amount` is what was typed, in `currency`. `prize` stays for older
      // drafts; the server ignores it and converts `amount` itself.
      amount: prizes[`prizePosition${position}`] || null,
      currency,
      prize: prizes[`prizePosition${position}`] || null,
      extras: extraBonuses[`extraBonus${position}`] || null,
      extras_amount: bonusAmounts[`bonusAmount${position}`] || null
    })).filter(entry => entry.amount !== null || entry.extras !== null || entry.extras_amount !== null);
    updateFormData('prize_distribution_type', selectedOption);
    updateFormData('prize_distribution', formattedPrizeDistribution);
    updateFormData('prize_currency', currency);
    updateFormData('prize_pool_total', poolTotal);
    if (selectedOption === 'winner-takes-all') {
      updateFormData('winner_prize', winnerPrize);
    }
  }, [selectedOption, prizes, extraBonuses, bonusAmounts, positions, winnerPrize, currency, poolTotal, updateFormData]);
  const handleOptionClick = option => {
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
    setPositions(prevPositions => [...prevPositions, prevPositions.length > 0 ? Math.max(...prevPositions) + 1 : 1]);
  };
  const deletePosition = position => {
    if (position > 3) {
      setPositions(positions.filter(pos => pos !== position));
      const newPrizes = {
        ...prizes
      };
      delete newPrizes[`prizePosition${position}`];
      setPrizes(newPrizes);
      const newExtras = {
        ...extraBonuses
      };
      delete newExtras[`extraBonus${position}`];
      setExtraBonuses(newExtras);
      const newBonusAmounts = {
        ...bonusAmounts
      };
      delete newBonusAmounts[`bonusAmount${position}`];
      setBonusAmounts(newBonusAmounts);
    }
  };
  const handlePrizeChange = (position, value) => {
    setPrizes(prevPrizes => ({
      ...prevPrizes,
      [`prizePosition${position}`]: value
    }));
  };
  const handleBonusAmountChange = (position, value) => {
    setBonusAmounts(prev => ({
      ...prev,
      [`bonusAmount${position}`]: value
    }));
  };
  const handleBonusChange = (position, value) => {
    setExtraBonuses(prevExtras => ({
      ...prevExtras,
      [`extraBonus${position}`]: value
    }));
  };
  const totalPrize = Object.values(prizes).reduce((total, prize) => total + (parseFloat(prize) || 0), 0);
  const formatNumber = num => new Intl.NumberFormat().format(num);
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <p>{tt("ui.how.should.prize.distributed.b5d6", "How should the prize be distributed between participants?")}</p>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {[{
          id: "distributed",
          title: "Distributed",
          description: "Reward is distributed between winners."
        }, {
          id: "winner-takes-all",
          title: "Winner takes all",
          description: "Winner takes the whole reward."
        }, {
          id: "no-prize",
          title: "No Prize",
          description: "No reward is given to winners."
        }].map(option => <div key={option.id} className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === option.id ? createTournamentStyles.activeBox : ""}`} onClick={() => handleOptionClick(option.id)}>
              <div className={`${createTournamentStyles.option} ${selectedOption === option.id ? createTournamentStyles.selected : ""}`} />
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{tx(option.title)}</h4>
                <p>{tx(option.description)}</p>
              </div>
            </div>)}
        </div>

        {selectedOption === "distributed" && <div className={styles.distributedContainer}>
            <div className={styles.currencyRow}>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="prizeCurrency" className={createTournamentStyles.labelWithAsterisk}>
                  {tt("ui.currency.e070", "Currency")}
                <InfoTip id="prizeCurrency" /></label>
                <select id="prizeCurrency" className={createTournamentStyles.inputText} value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="VC">{tt("ui.vent.coins.536d", "VENT COINS")}</option>
                  <option value="NGN">{tt("ui.nigerian.naira.3a42", "Nigerian Naira")}</option>
                  <option value="USD">{tt("ui.us.dollar.21c0", "US Dollar")}</option>
                </select>
              </div>

              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="prizePoolTotal" className={createTournamentStyles.labelWithAsterisk}>
                  {tt("ui.total.prize.pool.2276", "Total prize pool")}
                <InfoTip id="prizePoolTotal" /></label>
                <input id="prizePoolTotal" type="number" min="0" placeholder={`Total in ${currency}`} className={createTournamentStyles.inputNumber} value={poolTotal} onChange={e => setPoolTotal(e.target.value)} />
                <span className={styles.conversionHint}>{showCoins(poolTotal)}</span>
              </div>
            </div>

            <p className={createTournamentStyles.infoParagraph}>
              <span className={styles.infoSpan}>
                <FiInfo className={styles.infoIcon} />
              </span>
              {tt("ui.enter.each.amount.c1e3", "Enter each amount in")} {currency}{tt("ui.prizes.pay.out.vent.82d9", ". Prizes pay out in VENT COINS at")}
              {' '}{rates.ngn_per_coin.toLocaleString()} {tt("ui.ngn.vc.converted.figure.9bb9", "NGN to 1 VC, and the converted figure is\n              shown under every field. A position left empty is omitted.")}
            </p>

            {positions.map(position => <div key={position} className={`${createTournamentStyles.twoInputContainer} ${styles.twoInputContainer}`}>
                <div className={createTournamentStyles.inputGroup}>
                  <label htmlFor={`prizePosition${position}`} className={createTournamentStyles.labelWithAsterisk}>
                    {position} {tt("ui.place.c32a", "Place")} {position === 1 && "(Winner)"}
                    <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                  <InfoTip id="prizePlace" /></label>
                  <input id={`prizePosition${position}`} type="number" placeholder={`Prize for ${position} place in ${currency}`} className={createTournamentStyles.inputNumber} value={prizes[`prizePosition${position}`] || ""} onChange={e => handlePrizeChange(position, e.target.value)} />
                  <span className={styles.conversionHint}>
                    {showCoins(prizes[`prizePosition${position}`])}
                  </span>
                </div>

                <div className={createTournamentStyles.inputGroup}>
                  <label htmlFor={`extraBonus${position}`} className={createTournamentStyles.labelWithAsterisk}>
                    {tt("ui.extras.e.g.bonuses.5e9f", "Extras (e.g., Bonuses)")}
                    <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                  <InfoTip id="prizeExtras" /></label>
                  <input id={`extraBonus${position}`} type="text" placeholder={tt("ui.what.bonus.e.g.c411", "What the bonus is, e.g. a gaming chair")} className={`${createTournamentStyles.inputText} ${styles.inputText}`} value={extraBonuses[`extraBonus${position}`] || ""} onChange={e => handleBonusChange(position, e.target.value)} />
                  {/* A bonus can be a thing ("gaming chair") and a value. The
                      value converts exactly like a prize does. */}
                  <input id={`bonusAmount${position}`} type="number" min="0" placeholder={`Bonus value in ${currency} (optional)`} className={createTournamentStyles.inputNumber} value={bonusAmounts[`bonusAmount${position}`] || ""} onChange={e => handleBonusAmountChange(position, e.target.value)} />
                  <span className={styles.conversionHint}>
                    {showCoins(bonusAmounts[`bonusAmount${position}`])}
                  </span>
                </div>

                {position > 3 && <button type="button" className={`${styles.deleteBTN}`} onClick={() => deletePosition(position)}>
                    <FaTrash className={styles.deleteIcon} />
                  </button>}
              </div>)}

            <div className={styles.addBTNContainer}>
              <button type="button" className={styles.addAnotherBTN} onClick={addAnotherPosition}>
                <FaPlus className={styles.plusIcon} />
                {tt("ui.add.another.e8ac", "Add Another")}
              </button>
            </div>
          </div>}

        {selectedOption === "winner-takes-all" && <div className={styles.winnerTakesAllContainer}>
            <div className={`${createTournamentStyles.inputGroup} ${styles.inputGroup}`}>
              <label htmlFor="winnerPrize" className={createTournamentStyles.labelWithAsterisk}>
                {tt("ui.prize.d597", "Prize")}
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>
              <input id="winnerPrize" type="number" placeholder={tt("ui.enter.amount.prize.ea29", "Enter Amount for Prize")} className={createTournamentStyles.inputNumber} value={winnerPrize} onChange={e => setWinnerPrize(e.target.value)} />
            </div>
            <p className={createTournamentStyles.infoParagraph}>
              <span className={styles.infoSpan}>
                <FiInfo className={styles.infoIcon} />
              </span>
              {tt("ui.prize.amount.should.v.5ac8", "Prize amount should be in v-ent coins.")}
            </p>
          </div>}

        {selectedOption === "no-prize" && <div className={styles.noPrizeContainer}>
            <p>{tt("ui.no.prize.will.given.d47f", "No prize will be given for this tournament.")}</p>
          </div>}

        {selectedOption === "distributed" && totalPrize > 0 && <div className={styles.totalPrizeContainer}>
            <p className={styles.totalPrizeText}>
              {tt("ui.positions.add.up.b127", "Positions add up to")}{' '}
              <span className={styles.totalPrizeAmount}>
                {symbol}{formatNumber(totalPrize)}
              </span>
              {' '}({showCoins(totalPrize)})
            </p>
            {/* If they announced a pool, say whether the positions match it.
                Saying it here is cheaper than an organiser finding out at
                payout that the prizes do not add up to what was advertised. */}
            {parseFloat(poolTotal) > 0 && <p className={styles.totalPrizeText}>
                {(() => {
            const diff = parseFloat(poolTotal) - totalPrize;
            if (Math.abs(diff) < 0.005) return 'That matches the pool you announced.';
            return diff > 0 ? `${symbol}${formatNumber(diff)} of the announced pool is still unassigned.` : `That is ${symbol}${formatNumber(Math.abs(diff))} more than the pool you announced.`;
          })()}
              </p>}
          </div>}
      </div>
    </div>;
};
PrizeDistributionInside.propTypes = {
  formData: PropTypes.shape({
    prize_distribution_type: PropTypes.string,
    prize_distribution: PropTypes.array,
    winner_prize: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }),
  updateFormData: PropTypes.func.isRequired
};
export default PrizeDistributionInside;