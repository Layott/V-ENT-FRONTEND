// What to show somebody when a request does not do what they asked.
//
// Every one of the 145 places that reports a failure was written the same way:
//
//     setError(data.message || 'Failed to load audit log.');
//
// Both halves are English. `data.message` is a sentence the Django view wrote,
// and the fallback is a literal in the component. So a French reader who
// pressed a button that failed got told why in English - on a page that was
// otherwise entirely French. The string sweep never saw either, because it
// reads JSX text and copy attributes, and these are arguments to a function.
//
// The order here is deliberate:
//
//   1. **A translated error code.** The API sends `code` on the failures that
//      matter (`DM_NOT_ALLOWED`, `TOO_LATE`, `BRACKET_EXISTS`). A code is
//      language-free, so it can be translated properly and can carry the
//      specific meaning.
//   2. **The server's own sentence**, when there is no translation for the
//      code. English, but specific - "Check-in closed at 19:45" beats a
//      generic, and a reader would rather have the fact in the wrong language
//      than the wrong fact in theirs.
//   3. **The translated generic**, when the server said nothing useful.
//
// Translating the code rather than the sentence is what keeps this honest: the
// backend stays free to reword its messages without silently un-translating
// the interface.

/** Fill `{name}` and `{a.b}` from the response body.
 *
 *  Rung 1 was losing to rung 2 on exactly the errors worth reading. Several
 *  views build their sentence around a number or a name - "All 64 places have
 *  been taken", "This runs at the same time as Lagos Open" - and a code alone
 *  cannot say that, so translating it would have traded the fact for the
 *  language. Those views already publish the same values as structured fields,
 *  so the translation can name them and keep both.
 *
 *  A placeholder with nothing behind it leaves the text untouched rather than
 *  printing an empty gap, and the caller falls back to the server's sentence.
 */
const fill = (text, body) => {
  if (!text || text.indexOf('{') === -1) return text;

  // The envelope nests the useful fields under `data`; a few views put them at
  // the top level instead. Reading both means a translation does not have to
  // know which shape this particular view chose.
  const scopes = [body?.data, body].filter((s) => s && typeof s === 'object');

  let missing = false;
  const out = text.replace(/\{([a-z0-9_]+(?:\.[a-z0-9_]+)*)\}/gi, (whole, path) => {
    for (const scope of scopes) {
      const found = path.split('.').reduce(
        (acc, part) => (acc == null ? acc : acc[part]), scope);
      if (found !== undefined && found !== null && found !== '') return String(found);
    }
    missing = true;
    return whole;
  });

  return missing ? null : out;
};

/**
 * @param t         the translator from useT()
 * @param data      the parsed response body
 * @param key       dictionary key for this call site's generic message
 * @param english   the English of that generic, as the in-code fallback
 */
/** Words that mean the sentence was written for a log, not for a person. */
const MACHINE = new RegExp([
  'Authorization header',
  'Bearer token',
  'HTTP [0-9]{3}',
  'traceback',
  'stack ?trace',
  '(^|[^a-z])null([^a-z]|$)',
  '(^|[^a-z])undefined([^a-z]|$)',
  'Cannot read propert',
  'endpoint',
  'DoesNotExist',
  'IntegrityError',
].join('|'), 'i');

/** Whether `.message` on this object was written by the API for a person.
 *
 *  27 call sites hand this function a CAUGHT ERROR rather than a parsed body:
 *
 *      catch (err) { setError(apiMessage(tt, err, key, english)); }
 *
 *  A browser's own failure carries `message` too, and it is not a sentence
 *  anybody wrote: "Failed to fetch" in Chrome, "NetworkError when attempting
 *  to fetch resource" in Firefox, "Load failed" in Safari. None names anything
 *  a reader can act on, all are English on a page that may be French, and none
 *  contains a word the machine-text list looks for. So the console showed the
 *  CEO "Failed to fetch" during a deploy, on 3 September.
 *
 *  An API envelope always carries `status`. An `ApiError` is trusted because it
 *  was built FROM an envelope and carries the server's own code and message; a
 *  bare `Error` is not.
 */
const wroteItForAPerson = (data) => {
  if (!data || typeof data !== 'object') return false;
  if (data instanceof Error) return data.name === 'ApiError';
  return typeof data.status === 'string' || 'code' in data;
};

export const apiMessage = (t, data, key, english) => {
  const code = data?.code;
  if (code) {
    const translated = fill(t(`api.${code}`, ''), data);
    if (translated) return translated;
  }
  if (!wroteItForAPerson(data)) return t(key, english);
  // The server's own sentence, but only when it was written for a person.
  //
  // The CEO was shown "Authorization header with a Bearer token is required"
  // by this line. That is a sentence for whoever is reading the log: it names
  // an HTTP header, it is only ever in English, and there is nothing in it
  // somebody can act on. A code with no translation should fall through to the
  // sentence the app owns rather than leak the one the machine wrote.
  //
  // Deliberately a small list of machine words rather than a judgement about
  // tone. `scripts/check-error-ui.mjs` uses the same idea at the call sites.
  if (data?.message && !MACHINE.test(data.message)) return data.message;
  return t(key, english);
};

export default apiMessage;
