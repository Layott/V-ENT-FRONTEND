import styles from './validation-summary.module.css';

// Small, self-contained inline error panel shared by every wizard step.
// Renders nothing when there are no errors so it's safe to always mount.
const ValidationSummary = ({ errors = {} }) => {
  const messages = Object.values(errors).filter(Boolean);
  if (messages.length === 0) return null;

  return (
    <div className={styles.validationSummary} role="alert">
      <p className={styles.validationSummaryTitle}>Please fix the following before continuing:</p>
      <ul className={styles.validationSummaryList}>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationSummary;
