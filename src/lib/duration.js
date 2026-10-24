// A length of time, written the way people read a race result: "1:05",
// "0:59.5", "1:02:03". Used by the battle royale time column and the time box
// on the result sheet, so a time typed as "1:05" reads back as "1:05".
//
// Tenths show only when the time has a fraction of a second. An hour or more
// drops them, because nobody times a speedrun to the tenth at that length.

const pad = n => String(n).padStart(2, '0');

/** Milliseconds to "m:ss" or "m:ss.t", or "h:mm:ss" from an hour up. '' when there is no time. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '';
  const whole = Math.floor(ms);
  const seconds = Math.floor(whole / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds % 60)}`;
  const tenths = whole % 1000 === 0 ? '' : `.${Math.floor((whole % 1000) / 100)}`;
  return `${minutes}:${pad(seconds % 60)}${tenths}`;
}
