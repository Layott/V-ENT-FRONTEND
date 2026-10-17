import RouteLoading from '@/components/route-loading/RouteLoading';
import { getT } from '@/i18n/server';

// The outline of the circuits list while it loads (RouteLoading, inbox 310).
export default async function Loading() {
  const t = await getT();
  return <RouteLoading kind="list" label={t('loading.circuits', 'Loading circuits')} />;
}
