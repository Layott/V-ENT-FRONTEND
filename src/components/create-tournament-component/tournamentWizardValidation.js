// Shared zod-based validation for the tournament creation wizard.
//
// Each validate*() function takes the wizard's flat formData object (the same
// shape persisted to localStorage under 'createTournamentData') and returns
// { isValid, errors } where `errors` is a { field: message } map.
//
// Field names below match what the wizard's leaf components actually write
// via updateFormData - NOT necessarily generic "step 1..5" names. Two
// deliberate adaptations from a generic wizard spec, since this app has no
// such fields:
//   - "registration deadline" -> reg_end_date_and_time (when registration
//     closes; there's no single `registration_deadline` field here).
//   - "prize pool %" -> this app tracks a raw VC amount per finishing
//     position (or a single winner_prize), not a percentage split, so the
//     prize-distribution check validates amounts are present/non-negative
//     instead of summing to 100.
//   - entry_fee lives on the Basic Info step's Visibility sub-section in
//     this codebase (not the Format & Participants step), so it's validated
//     there instead.

import { z } from 'zod';

const DAY_MS = 24 * 60 * 60 * 1000;

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
const toNumber = (v) => (isBlank(v) ? NaN : Number(v));

const isValidUrl = (value) => {
  if (isBlank(value)) return true; // optional fields - blank is fine
  const candidate = String(value).trim();
  try {
    // eslint-disable-next-line no-new
    new URL(candidate);
    return true;
  } catch {
    try {
      // eslint-disable-next-line no-new
      new URL(`https://${candidate}`);
      return true;
    } catch {
      return false;
    }
  }
};

const collectErrors = (issues) => {
  const errors = {};
  issues.forEach((issue) => {
    const key = issue.path[0] ?? '_form';
    if (!errors[key]) errors[key] = issue.message;
  });
  return errors;
};

// ── Step 1 - Basic Info ─────────────────────────────────────────────────────
const basicInfoSchema = z
  .object({
    tournament_title: z
      .string({ required_error: 'Tournament title is required' })
      .trim()
      .min(1, 'Tournament title is required')
      .max(148, 'Title must be 148 characters or fewer'),
    game: z.string({ required_error: 'Please select a game' }).trim().min(1, 'Please select a game'),
    start_date_and_time: z.string({ required_error: 'Start date & time is required' }).min(1, 'Start date & time is required'),
    end_date_and_time: z.string({ required_error: 'End date & time is required' }).min(1, 'End date & time is required'),
    reg_end_date_and_time: z.string().optional(),
    entry_fee: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const start = data.start_date_and_time ? new Date(data.start_date_and_time).getTime() : NaN;
    const end = data.end_date_and_time ? new Date(data.end_date_and_time).getTime() : NaN;
    const regEnd = data.reg_end_date_and_time ? new Date(data.reg_end_date_and_time).getTime() : NaN;

    if (!Number.isNaN(start) && start < Date.now() + DAY_MS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start_date_and_time'], message: 'Start date must be at least 24 hours from now' });
    }
    if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date_and_time'], message: 'End date must be after the start date' });
    }
    if (!Number.isNaN(regEnd) && !Number.isNaN(start) && regEnd > start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reg_end_date_and_time'], message: 'Registration deadline must be on or before the start date' });
    }
    if (!isBlank(data.entry_fee)) {
      const fee = toNumber(data.entry_fee);
      if (Number.isNaN(fee) || fee < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['entry_fee'], message: 'Entry fee cannot be negative' });
      }
    }
  });

export function validateBasicInfo(formData = {}) {
  const parsed = basicInfoSchema.safeParse(formData);
  if (parsed.success) return { isValid: true, errors: {} };
  return { isValid: false, errors: collectErrors(parsed.error.issues) };
}

// ── Step 2 - Format & Participants ──────────────────────────────────────────
const formatParticipantsSchema = z
  .object({
    bracket_type: z.string({ required_error: 'Select a tournament format' }).min(1, 'Select a tournament format'),
    tournament_access: z.string().optional(),
    team_size: z.union([z.string(), z.number()]).optional(),
    min_number_of_participants: z.union([z.string(), z.number()]).optional(),
    max_number_of_participants: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const access = data.tournament_access;

    if (access === 'individuals' || access === 'both') {
      const min = toNumber(data.min_number_of_participants);
      const max = toNumber(data.max_number_of_participants);

      if (Number.isNaN(min) || min < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['min_number_of_participants'], message: 'Minimum must be at least 2' });
      }
      if (Number.isNaN(max) || max < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_number_of_participants'], message: 'Maximum must be at least 2' });
      } else if (!Number.isNaN(min) && max < min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_number_of_participants'], message: 'Maximum must be greater than or equal to minimum' });
      }
    }

    if (access === 'teams' || access === 'both') {
      if (isBlank(data.team_size)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['team_size'], message: 'Select the number of players per team' });
      }
    }
  });

export function validateFormatParticipants(formData = {}) {
  const parsed = formatParticipantsSchema.safeParse(formData);
  if (parsed.success) return { isValid: true, errors: {} };
  return { isValid: false, errors: collectErrors(parsed.error.issues) };
}

// ── Step 3 - Prize Distribution ─────────────────────────────────────────────
const prizeDistributionSchema = z
  .object({
    prize_distribution_type: z.string({ required_error: 'Choose how the prize is distributed' }).min(1, 'Choose how the prize is distributed'),
    winner_prize: z.union([z.string(), z.number()]).optional(),
    prize_distribution: z
      .array(
        z.object({
          position: z.union([z.string(), z.number()]).optional(),
          prize: z.union([z.string(), z.number()]).nullable().optional(),
        }),
      )
      .optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const type = data.prize_distribution_type;

    if (type === 'winner-takes-all' || type === 'winner_takes_all') {
      const prize = toNumber(data.winner_prize);
      if (Number.isNaN(prize) || prize < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['winner_prize'], message: 'Enter a prize amount of 0 or more' });
      }
    } else if (type === 'distributed') {
      const positions = Array.isArray(data.prize_distribution) ? data.prize_distribution : [];
      const winner = positions.find((p) => Number(p.position) === 1);
      const winnerPrize = toNumber(winner?.prize);

      if (!winner || Number.isNaN(winnerPrize) || winnerPrize < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['prize_distribution'], message: '1st place prize is required and must be 0 or more' });
      } else {
        const hasNegative = positions.some((p) => !isBlank(p.prize) && Number(p.prize) < 0);
        if (hasNegative) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['prize_distribution'], message: 'Prize amounts cannot be negative' });
        }
      }
    }
    // 'no-prize' needs no further checks.
  });

export function validatePrizeDistribution(formData = {}) {
  const parsed = prizeDistributionSchema.safeParse(formData);
  if (parsed.success) return { isValid: true, errors: {} };
  return { isValid: false, errors: collectErrors(parsed.error.issues) };
}

// ── Step 4 - Sponsors & Links ───────────────────────────────────────────────
const sponsorsLinksSchema = z
  .object({
    sponsors: z.array(z.object({ name: z.string().optional(), logo: z.any().optional() })).optional(),
    webSocialLinks: z.record(z.string()).optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const sponsors = Array.isArray(data.sponsors) ? data.sponsors : [];
    sponsors.forEach((sponsor, index) => {
      if (sponsor?.logo && isBlank(sponsor?.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [`sponsor_${index}_name`],
          message: `Sponsor #${index + 1}: name is required when a logo is uploaded`,
        });
      }
    });

    const links = data.webSocialLinks || {};
    Object.entries(links).forEach(([key, value]) => {
      if (!isBlank(value) && !isValidUrl(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key.replace(/_link$/, '').replace(/_/g, ' ')} must be a valid URL`,
        });
      }
    });
  });

export function validateSponsorsLinks(formData = {}) {
  const parsed = sponsorsLinksSchema.safeParse(formData);
  if (parsed.success) return { isValid: true, errors: {} };
  return { isValid: false, errors: collectErrors(parsed.error.issues) };
}

// ── Step 5 - Review / aggregate ─────────────────────────────────────────────
export function validateAll(formData = {}) {
  const steps = [
    { step: 1, label: 'Basic Info', result: validateBasicInfo(formData) },
    { step: 2, label: 'Format & Participants', result: validateFormatParticipants(formData) },
    { step: 3, label: 'Prize Distribution', result: validatePrizeDistribution(formData) },
    { step: 4, label: 'Sponsors & Links', result: validateSponsorsLinks(formData) },
  ];

  const stepErrors = {};
  let firstInvalidStep = null;
  steps.forEach(({ step, label, result }) => {
    if (!result.isValid) {
      stepErrors[step] = { label, errors: result.errors };
      if (firstInvalidStep === null) firstInvalidStep = step;
    }
  });

  return {
    isValid: firstInvalidStep === null,
    firstInvalidStep,
    stepErrors,
  };
}
