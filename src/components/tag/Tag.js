'use client';

/**
 * The one tag on this site.
 *
 * CEO, 7 September 2026, sending screenshots of the PHYSICAL and EA FC tags:
 * "this design looks like AI slop. The tags can be made using a design more in
 * tune with the v-ent website pattern."
 *
 * They were right, and the old shape broke two house rules at once:
 *
 *   background-color: rgba(237, 28, 36, 0.15);   a tinted translucent accent
 *   color: var(--v-ent-red);                     the same hue as the fill
 *   backdrop-filter: blur(8px);                  frosted glass, banned outright
 *
 * A 15 per cent red wash under red text on a dark surface is muddy by
 * construction: both sides of the contrast are the same hue, so the label reads
 * as a smudge rather than as a word. That is exactly what the screenshots show.
 * And blur behind a 20px chip is the "liquid glass" tell the vibecoded rules
 * ban by name.
 *
 * ## What replaces it
 *
 * The rule this site already follows everywhere else: **filled chip, muted
 * background, no ring, no blur**, built from the surface scale rather than from
 * a tint of the accent.
 *
 *   --overlay-gray  #212225   the panel
 *   #2a2b30                   one step up: a tag sitting ON a panel
 *   #33343a                   one more: a tag sitting on a card
 *
 * Text is near-white at full strength, so the word is legible at 11px, which is
 * the entire job of a tag.
 *
 * **Colour carries meaning, never category.** "EA FC" and "PHYSICAL" are
 * categories - they say what a thing IS, and a reader gains nothing from them
 * being red. So they are neutral. Colour is spent only where it means
 * something a reader must act on: live, cancelled, sold out, a win, a loss.
 * That is what makes the coloured ones actually register, and it is why the old
 * design failed: when everything is red, red stops meaning anything.
 *
 * There were ELEVEN copies of this chip in eleven stylesheets, drifting apart.
 * This is one component so the twelfth is not written. See
 * [[feedback_two_surfaces_one_job]].
 */
import styles from './tag.module.css';

/**
 * @param tone   'neutral' (default) for a category, or one of the meaning
 *               tones: 'live', 'good', 'bad', 'warn', 'muted'.
 * @param on     which surface this sits on, so the tag stays one step above it:
 *               'panel' (default) or 'card'.
 * @param size   'sm' (default) or 'md' for somewhere it carries more weight.
 */
export default function Tag({
  children, tone = 'neutral', on = 'panel', size = 'sm', className = '', ...rest
}) {
  if (children === null || children === undefined || children === '') return null;
  const classes = [
    styles.tag,
    styles[`tone_${tone}`] || styles.tone_neutral,
    styles[`on_${on}`] || styles.on_panel,
    styles[`size_${size}`] || styles.size_sm,
    className,
  ].filter(Boolean).join(' ');
  return <span className={classes} {...rest}>{children}</span>;
}

/** The tone an event or tournament type should carry.
 *
 *  All neutral, deliberately. Where a thing happens is a category, not a
 *  status, and the old design coloured all three differently for no reason a
 *  reader could use.
 */
export function toneForType() {
  return 'neutral';
}

/** The tone a lifecycle status should carry, which IS worth colouring. */
export function toneForStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'live' || s === 'ongoing' || s === 'in_progress') return 'live';
  if (s === 'completed' || s === 'confirmed' || s === 'checked_in') return 'good';
  if (s === 'cancelled' || s === 'disqualified' || s === 'refunded') return 'bad';
  if (s === 'draft' || s === 'pending' || s === 'upcoming') return 'warn';
  return 'muted';
}
