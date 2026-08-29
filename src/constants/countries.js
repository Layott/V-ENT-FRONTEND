// The one list of countries, used everywhere a country is asked for.
//
// It has to be one list, because the values are COMPARED. A tournament that
// restricts entry to a country matches `restrict_country` against the entrant's
// own `user.country`, so the moment those two fields are filled from different
// vocabularies the restriction starts turning away people who qualify. Both
// were free text before this: an organiser could type "Naija" and refuse every
// Nigerian on the platform, and nothing would look broken to either of them.
//
// Africa first, and not as a courtesy. This is an Africa-first platform, the
// entire current membership is in Nigeria, the UK and the US, and a picker that
// opens on Afghanistan makes the common case the slowest one. The rest of the
// world follows, alphabetically.
//
// Full names rather than ISO codes, because that is what is already stored and
// what people read. A migration to codes would have to rewrite every existing
// row and every organiser's saved restriction, and would buy nothing here.

export const AFRICA = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cameroon', 'Cape Verde', 'Central African Republic', 'Chad', 'Comoros',
  'Congo', 'Democratic Republic of the Congo', 'Djibouti', 'Egypt',
  'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia',
  'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho',
  'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
  'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
  'Rwanda', 'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone',
  'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo',
  'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
];

export const REST_OF_WORLD = [
  'Afghanistan', 'Albania', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia',
  'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada',
  'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czechia', 'Denmark', 'Dominican Republic', 'Ecuador', 'El Salvador',
  'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Guatemala',
  'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania', 'Luxembourg',
  'Malaysia', 'Malta', 'Mexico', 'Moldova', 'Mongolia', 'Montenegro', 'Nepal',
  'Netherlands', 'New Zealand', 'Nicaragua', 'North Macedonia', 'Norway',
  'Oman', 'Pakistan', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia',
  'Singapore', 'Slovakia', 'Slovenia', 'South Korea', 'Spain', 'Sri Lanka',
  'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Thailand',
  'Trinidad and Tobago', 'Turkey', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Venezuela',
  'Vietnam', 'Yemen',
];

export const COUNTRIES = [...AFRICA, ...REST_OF_WORLD];

/** Whether a stored value is one this list knows, compared the way the backend
 *  compares it. Used to keep a country somebody already saved selectable even
 *  if it is not on the list, rather than silently blanking their profile. */
export function isKnownCountry(value) {
  const wanted = String(value || '').trim().toLowerCase();
  if (!wanted) return true;
  return COUNTRIES.some(c => c.toLowerCase() === wanted);
}

export default COUNTRIES;
