import RouteLoading from '@/components/route-loading/RouteLoading';
import { getT } from '@/i18n/server';

// The outline of a league's page while it loads (RouteLoading, inbox 310).
export default async function Loading() {
  const t = await getT();
  return <RouteLoading kind="detail" label={t('loading.league', 'Loading league')} />;
}
