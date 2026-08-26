import styles from './not-found.module.css';
import { getT } from '@/i18n/server';

// The frame between one route and the next. It is the page's own surface rather
// than nothing, so navigation never shows a white gap.
const Loading = () => {
  const t = getT();
  return <div className={styles.wrap} aria-busy="true" aria-label={t('loading.generic', 'Loading')} />;
};

export default Loading;
