import { redirect } from 'next/navigation';
import { currentLocale } from '@/lib/seo';

/**
 * A record opened by its number goes to its name (CEO, 30 September 2026:
 * "I wanted to share a team and still saw an ID https://v-ent.co/teams/29").
 *
 * Every old address keeps working, which is why /teams/29 still opens the
 * team. But it opened it AT /teams/29, so the address bar, the thing people
 * actually copy, kept the number; only the canonical tag knew the name. Here
 * the record's own slug decides: any other form of the address is sent to it,
 * in the reader's language, with its query kept so a link to ?tab=tickets
 * still lands on the tickets.
 *
 * Call it after the route's own `__moved` redirect, in the page and in
 * generateMetadata (metadata resolves first, so a redirect there is a real 307
 * for a crawler, where one from the page arrives after the response started).
 */
export async function toSlugAddress(requested, record, base, searchParams) {
  const slug = record?.slug;
  if (!slug || record?.__moved || record?.__failed) return;
  if (String(requested) === String(slug)) return;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== undefined && v !== null) params.append(key, v);
    }
  }
  const locale = await currentLocale();
  const prefix = locale && locale !== 'en' ? `/${locale}` : '';
  const query = params.toString();
  redirect(`${prefix}${base}/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`);
}
