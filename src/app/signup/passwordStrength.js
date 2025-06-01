import { FaCheckCircle, FaMinusCircle } from 'react-icons/fa'
import styles from './signup.module.css';

const PasswordStrength = ({ password }) => {
    const criteria = [
        { label: 'At least 8 characters', isValid: password.length >= 8 },
        { label: 'One lowercase character', isValid: /[a-z]/.test(password) },
        { label: 'One uppercase character', isValid: /[A-Z]/.test(password) },
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
                    Password doesn&apos;t fit required criteria
                </p>
            )}
        </div>
    );
};

export default PasswordStrength;
