import RouteLoading from '@/components/route-loading/RouteLoading';
import { getT } from '@/i18n/server';

// The outline of this page while it loads, under a moving red line
// (inbox 310, option A). See src/components/route-loading/RouteLoading.js.
export default function Loading() {
  const t = getT();
  return <RouteLoading kind="form" label={t('loading.createTournament', 'Loading tournament creator…')} />;
}
