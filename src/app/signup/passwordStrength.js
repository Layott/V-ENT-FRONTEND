import { FaCheckCircle, FaMinusCircle } from 'react-icons/fa'
import styles from './signup.module.css';
import { useT } from '@/i18n/LanguageProvider';

// The same four rules the form checks before it submits (isPasswordValid in
// page.js). The list used to show three, so a password with no number ticked
// every line and was then refused with a message nobody had been shown.
const PasswordStrength = ({ password }) => {
    const tt = useT();
    const criteria = [
        { label: tt('ui.at.least.characters.1fe4', 'At least 8 characters'), isValid: password.length >= 8 },
        { label: tt('ui.one.lowercase.character.adcd', 'One lowercase character'), isValid: /[a-z]/.test(password) },
        { label: tt('ui.one.uppercase.character.3450', 'One uppercase character'), isValid: /[A-Z]/.test(password) },
        { label: tt('msg.pwNumber', 'One number'), isValid: /[0-9]/.test(password) },
    ];

    const allValid = criteria.every(criterion => criterion.isValid);

    return (
        <div className={styles.criteriaContainer}>
            {criteria.map((criterion, index) => (
                <div key={index} className={styles.criterion}>
                    <span className={`${styles.icon} ${criterion.isValid ? styles.valid : styles.invalid} ${styles.animate}`}>

                    {criterion.isValid ? <FaCheckCircle /> : <FaMinusCircle />}
                    </span>
                    <span>{criterion.label}</span>
                </div>
            ))}

            {!allValid && (
                <p className={styles.errorMessage}>
                    {tt('msg.pwNotMet', 'The password does not meet every rule yet')}
                </p>
            )}
        </div>
    );
};

export default PasswordStrength;
