'use client';

// What people can buy, decided while the event is being made.
//
// CEO, 1 September 2026: "if i am clicking on any of these and its still taking
// me here with this ui, then the flow is very bad", on being sent to the
// console to find the ticket types after creating an event. And on the
// capacity: "IF I SET 5000, AND I AM SETTING TICKETS FRO DIFFERENT DAYS, I
// SHOULD BE ABLE TO PICK IF THAT DAY MEANS STARTING AFRESH OR IT KEEPS
// CPUNTING... SO I SHOULD HAVE THE OPTION SET IT HOW I WANT."
//
// The split this step exists to make: a rule that CONFIGURES the event is set
// when the event is made. The things that manage LIVE ACTIVITY - sales, the
// door, messages, holds, the waiting list - stay in the console, because they
// only mean anything once the event is running.
//
// `create_event` already accepted `ticket_types` and `capacity`. The wizard
// sent neither, so every organiser created an event with nothing on sale and
// then had to go and find the console. Nothing was broken; nobody had wired
// the two ends together.

import { useState } from 'react';
import { IoMdArrowForward, IoMdArrowBack } from 'react-icons/io';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import DateField from '@/components/date-field/DateField';
import { useT } from '@/i18n/LanguageProvider';
import own from './tickets.module.css';

const emptyTier = () => ({
  name: '',
  price: '',
  quantity: '',
  perks: '',
  day: '',
  day_label: '',
});

const Tickets = ({ formData, setFormData, setSelectedTab }) => {
  const tt = useT();
  const [error, setError] = useState('');

  const tiers = formData.ticket_types?.length
    ? formData.ticket_types
    : [emptyTier()];

  const update = (key, value) => {
    const updated = { ...formData, [key]: value };
    setFormData(updated);
    localStorage.setItem('createTournamentData', JSON.stringify(updated));
  };

  const setTiers = (next) => update('ticket_types', next);
  const setTier = (index, key, value) => setTiers(
    tiers.map((t, i) => (i === index ? { ...t, [key]: value } : t)));

  const removeTier = (index) => setTiers(
    tiers.length === 1 ? [emptyTier()] : tiers.filter((_t, i) => i !== index));

  const handleProceed = () => {
    // A type with a name and no allocation sells nothing and reads as sold out.
    // That exact fault has already reached the CEO once, on an event with 4814
    // tickets left, so it is caught here rather than discovered on the day.
    const named = tiers.filter((t) => (t.name || '').trim());
    const unallocated = named.find((t) => !Number(t.quantity));
    if (unallocated) {
      setError(tt('createEvent.tierNeedsQuantity',
        'Say how many "{name}" tickets there are. A type with none of them reads as sold out on the day.')
        .replace('{name}', unallocated.name.trim()));
      return;
    }
    setError('');
    setTiers(named);
    setSelectedTab((prev) => prev + 1);
  };

  const handleBack = () => setSelectedTab((prev) => prev - 1);

  return (
    <div className={createTournamentStyles.generalTabContainer}>
      <header className={createTournamentStyles.createTournamentHeader}>
        <h1>{tt('createEvent.ticketsTitle', 'Tickets and capacity')}</h1>
      </header>

      <div className={createTournamentStyles.createSubSectionContainer}>
        <p className={createTournamentStyles.infoParagraph}>
          {tt('createEvent.ticketsHint',
            'What people can buy, and how many the room holds. You can add a type or open more at any time afterwards. How many are sold is counted from the tickets themselves and can never be typed.')}
        </p>

        <div className={createTournamentStyles.twoBoxesInRowContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label>{tt('createEvent.capacity', 'How many the venue takes')}</label>
            <input
              className={createTournamentStyles.inputNumber}
              type="number"
              min="0"
              value={formData.capacity || ''}
              placeholder={tt('createEvent.capacityNone', 'No limit')}
              onChange={(e) => update('capacity', e.target.value)}
            />
          </div>
          <div className={createTournamentStyles.inputGroup}>
            <label>{tt('createEvent.capacityMode', 'And that number is')}</label>
            <select
              className={createTournamentStyles.inputText}
              value={formData.capacity_mode || 'per_day'}
              onChange={(e) => update('capacity_mode', e.target.value)}
            >
              <option value="per_day">
                {tt('createEvent.capacityPerDay', 'How many each day holds')}
              </option>
              <option value="total">
                {tt('createEvent.capacityTotal', 'How many the whole event holds')}
              </option>
            </select>
          </div>
        </div>

        <p className={createTournamentStyles.mutedNote}>
          {tt('createEvent.capacityModeHint',
            'On a two-day event, "each day" means the number starts again on day two. "The whole event" means the two days share it.')}
        </p>
      </div>

      <div className={createTournamentStyles.createSubSectionContainer}>
        <h2 className={createTournamentStyles.tournamentTypeH}>
          {tt('createEvent.ticketTypes', 'Ticket types')}
        </h2>

        {tiers.map((tier, index) => (
          <div key={index} className={own.tier}>
            <div className={createTournamentStyles.threeBoxesInRowContainer}>
              <div className={createTournamentStyles.inputGroup}>
                <label>{tt('createEvent.tierName', 'Name')}</label>
                <input
                  className={createTournamentStyles.inputText}
                  value={tier.name}
                  placeholder={tt('createEvent.tierNamePlaceholder', 'General Admission')}
                  onChange={(e) => setTier(index, 'name', e.target.value)}
                />
              </div>
              <div className={createTournamentStyles.inputGroup}>
                <label>{tt('createEvent.tierPrice', 'Price in VENT COINS')}</label>
                <input
                  className={createTournamentStyles.inputNumber}
                  type="number"
                  min="0"
                  value={tier.price}
                  placeholder="0"
                  onChange={(e) => setTier(index, 'price', e.target.value)}
                />
              </div>
              <div className={createTournamentStyles.inputGroup}>
                <label>{tt('createEvent.tierQuantity', 'How many')}</label>
                <input
                  className={createTournamentStyles.inputNumber}
                  type="number"
                  min="0"
                  value={tier.quantity}
                  placeholder="100"
                  onChange={(e) => setTier(index, 'quantity', e.target.value)}
                />
              </div>
            </div>

            <div className={createTournamentStyles.threeBoxesInRowContainer}>
              <div className={createTournamentStyles.inputGroup}>
                <label>{tt('createEvent.tierDay', 'For one day only')}</label>
                <DateField
                  value={tier.day}
                  onChange={(value) => setTier(index, 'day', value)}
                />
              </div>
              <div className={createTournamentStyles.inputGroup}>
                <label>{tt('createEvent.tierDayLabel', 'What to call that day')}</label>
                <input
                  className={createTournamentStyles.inputText}
                  value={tier.day_label}
                  placeholder={tt('createEvent.tierDayLabelPlaceholder', 'Day 1')}
                  onChange={(e) => setTier(index, 'day_label', e.target.value)}
                />
              </div>
              <div className={createTournamentStyles.inputGroup}>
                <label>{tt('createEvent.tierPerks', 'What it includes')}</label>
                <input
                  className={createTournamentStyles.inputText}
                  value={tier.perks}
                  placeholder={tt('createEvent.tierPerksPlaceholder', 'All-day entry, standing area')}
                  onChange={(e) => setTier(index, 'perks', e.target.value)}
                />
              </div>
            </div>

            {tiers.length > 1 && (
              <button
                type="button"
                className={own.removeTier}
                onClick={() => removeTier(index)}
              >
                {tt('createEvent.removeTier', 'Remove this type')}
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          className={own.addTier}
          onClick={() => setTiers([...tiers, emptyTier()])}
        >
          {tt('createEvent.addTier', 'Add another type')}
        </button>

        <p className={createTournamentStyles.mutedNote}>
          {tt('createEvent.ticketsOptional',
            'Leave this empty if your event is not ticketed. Nothing here is final: all of it can be changed from the event console afterwards.')}
        </p>

        {error && <p className={own.error} role="alert">{error}</p>}
      </div>

      <div className={createTournamentStyles.buttonContainer}>
        <div className={createTournamentStyles.backAndProceedContainer}>
          <button
            type="button"
            className={`${createTournamentStyles.btn} ${createTournamentStyles.backBTN}`}
            onClick={handleBack}
          >
            <IoMdArrowBack className={createTournamentStyles.backArrowIcon} />
            {tt('ui.back.b52b', 'Back')}
          </button>
          <button
            type="button"
            className={`${createTournamentStyles.btn} ${createTournamentStyles.proceedBTN}`}
            onClick={handleProceed}
          >
            {tt('ui.proceed.02ed', 'Proceed')}
            <IoMdArrowForward className={createTournamentStyles.forwardArrowIcon} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tickets;
