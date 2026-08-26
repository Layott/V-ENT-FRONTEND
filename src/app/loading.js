import styles from './not-found.module.css';

// The frame between one route and the next. It is the page's own surface rather
// than nothing, so navigation never shows a white gap.
const Loading = () => <div className={styles.wrap} aria-busy="true" aria-label="Loading" />;

export default Loading;
