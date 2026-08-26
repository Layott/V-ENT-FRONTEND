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

/**
 * @param t         the translator from useT()
 * @param data      the parsed response body
 * @param key       dictionary key for this call site's generic message
 * @param english   the English of that generic, as the in-code fallback
 */
export const apiMessage = (t, data, key, english) => {
  const code = data?.code;
  if (code) {
    const translated = t(`api.${code}`, '');
    if (translated) return translated;
  }
  if (data?.message) return data.message;
  return t(key, english);
};

export default apiMessage;
