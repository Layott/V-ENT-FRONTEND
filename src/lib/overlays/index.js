/**
 * The designed overlays, by studio kind (inbox 390).
 *
 * A kind listed here is drawn by its template on a canvas, edited in the
 * OverlayDesigner, and exported as a PNG or a video. Adding a design is one
 * file beside these and one line here, plus the kind on the server.
 */
import startingSoon from './startingSoon';
import transition from './transition';

export const DESIGNS = {
  starting_soon: startingSoon,
  transition,
};

export const isDesigned = (kind) => Boolean(DESIGNS[kind]);
