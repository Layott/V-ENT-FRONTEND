import { Suspense } from 'react';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbLd, buildMetadata, clamp, fetchForMetadata } from '@/lib/seo';
import ProfileClient from './ProfileClient';

// `/u/temi` - a person's profile at their username, which is the readable,
// stable address for a person and the one they would give somebody.
//
// A server component, for the same reason the tournament route is one. The page
// underneath is `'use client'` and loads the profile in an effect, so the HTML
// the server sent carried no title, no description and no picture: every
// profile looked identical to a crawler, and a shared profile link previewed as
// the generic site card - which, until tonight, was itself a 404.
//
// The person's own avatar is the share image. A profile link that previews with
// somebody's face is the difference between a link worth sending and a bare URL.

export const revalidate = 900;

const load = (username) =>
  fetchForMetadata(`/user/${encodeURIComponent(username)}/profile/`);

export async function generateMetadata({ params }) {
  const username = decodeURIComponent(params.username);
  const profile = await load(username);

  if (!profile) {
    return buildMetadata({
      title: 'Player not found',
      description: 'This player does not exist, or their profile is not public.',
      path: `/u/${username}`,
      noindex: true,
    });
  }

  const name = profile.full_name || profile.username || username;
  const country = profile.country ? ` from ${profile.country}` : '';

  return buildMetadata({
    title: name,
    description: clamp(
      profile.description
      || `${name}${country} plays on V-ENT. See their teams, the tournaments `
         + 'they have entered and how they have placed.',
    ),
    path: `/u/${profile.username || username}`,
    // Their own picture, not the site card.
    image: profile.profile_picture || profile.avatar || null,
  });
}

export default async function ProfileByUsername({ params }) {
  const username = decodeURIComponent(params.username);
  const profile = await load(username);

  return (
    <>
      {profile && (
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: profile.full_name || profile.username || username,
              alternateName: profile.username,
              url: `https://v-ent.co/u/${profile.username || username}`,
              image: profile.profile_picture || undefined,
              nationality: profile.country || undefined,
            },
            breadcrumbLd([
              { name: 'Players', path: '/rankings' },
              {
                name: profile.username || username,
                path: `/u/${profile.username || username}`,
              },
            ]),
          ]}
        />
      )}
      <Suspense
        fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}
      >
        <ProfileClient username={username} />
      </Suspense>
    </>
  );
}
