import { buildMetadata, currentLocale } from '@/lib/seo';
import RoomClient from './RoomClient';

// `/anime/room/<token>` - one reading room.
//
// NOINDEX and in the robots disallow list. A room is a private thing addressed
// by an opaque token, and the token IS the invitation: indexing it would post
// the invitation publicly. It is also an action rather than content, which is
// the test the project rule sets.

export async function generateMetadata() {
  return buildMetadata({
    title: 'Reading room',
    description: 'A room where people read the same comic at the same time.',
    path: '/anime/room',
    noindex: true,
    locale: currentLocale(),
  });
}

const RoomPage = ({ params }) => (
  <RoomClient roomToken={decodeURIComponent(params.token)} />
);

export default RoomPage;
