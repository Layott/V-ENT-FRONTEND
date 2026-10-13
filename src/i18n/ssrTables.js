// Every language's table, for the SERVER's render of client components only.
//
// A French or Portuguese page is rendered in its own language on the server,
// so a crawler and a slow phone both get the words before any script runs.
// That render happens inside LanguageProvider, a client component, which used
// to receive the table as a prop from the root layout; a prop from a server
// component is written into the page, so every full page load carried the
// whole table (715 KB of the 783 KB /fr/tournaments, inbox 454).
//
// LanguageProvider imports this module under the name `vent-ssr-tables`, which
// next.config.mjs points here for the server build and at nothing for the
// browser build. The browser gets its table from /i18n/<code>.<hash>.js, a
// cached script the root layout names (scripts/split-dictionaries.mjs).
import { dictionaries } from './dictionaries';

export default dictionaries;
