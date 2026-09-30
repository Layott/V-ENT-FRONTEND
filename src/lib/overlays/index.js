/**
 * The designed overlays, by studio kind (inbox 390, 394).
 *
 * A kind listed here is drawn by its template on a canvas, edited in the
 * OverlayDesigner, and exported as a PNG or a video. Adding a design is one
 * file beside these and one line here, plus the kind on the server
 * (BroadcastElement kinds and DESIGNED_KINDS) and its group in groups.js.
 */
import startingSoon from './startingSoon';
import transition from './transition';
import { brb, streamEnded, champions } from './screens';
import { streamerSingle, streamerDouble, streamerGameplay } from './frames';
import { nameTag, matchLowerThird } from './people';

export const DESIGNS = {
  starting_soon: startingSoon,
  brb,
  stream_ended: streamEnded,
  champions,
  streamer_single: streamerSingle,
  streamer_double: streamerDouble,
  streamer_gameplay: streamerGameplay,
  name_tag: nameTag,
  match_lower_third: matchLowerThird,
  transition,
};

export const isDesigned = (kind) => Boolean(DESIGNS[kind]);
