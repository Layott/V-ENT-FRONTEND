import styles from './ServedSummary.module.css';

// What a public record page shows before its interactive page has loaded, and
// so what its served HTML says (inbox 517). The page underneath is a client
// page that reads the address on the browser, so the server sends only the
// Suspense fallback; that fallback used to be an empty dark box, which gave a
// crawler, a link preview and any reader without script a page with no h1 and
// no words. This is the same dark surface, carrying the record's name as the
// one h1 and its description, from the record the route already fetched to
// describe itself. The client page replaces it once it loads.
//
// No hooks, so it renders the same from a server page and from a client one.
const ServedSummary = ({ title, description }) => (
  <div className={styles.served}>
    {title ? <h1 className={styles.title}>{title}</h1> : null}
    {description ? <p className={styles.description}>{description}</p> : null}
  </div>
);

export default ServedSummary;
