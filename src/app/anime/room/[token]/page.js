import { buildMetadata, currentLocale } from '@/lib/seo';
import RoomClient from './RoomClient';
import { recordCopy } from '@/lib/seoRecordCopy';

// `/anime/room/<token>` - one reading room.
//
// NOINDEX and in the robots disallow list. A room is a private thing addressed
// by an opaque token, and the token IS the invitation: indexing it would post
// the invitation publicly. It is also an action rather than content, which is
// the test the project rule sets.

export async function generateMetadata() {
  const locale = await currentLocale();
  const { t } = recordCopy(locale);
  return buildMetadata({
    title: t('room.title'),
    description: t('room.description'),
    path: '/anime/room',
    noindex: true,
    locale,
  });
}

const RoomPage = async props => {
  const params = await props.params;
  return (<RoomClient roomToken={decodeURIComponent(params.token)} />);
};

export default RoomPage;
