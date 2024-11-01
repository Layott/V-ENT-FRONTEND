'use client'
import { useState } from 'react'
import { FaRegEyeSlash } from "react-icons/fa";
import CircularProgress from '@mui/material/CircularProgress';
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { useRouter } from 'next/navigation';
import generalStyles from "@/styles/auth/auth.module.css"

const ResetPassword = () => {
    const [showPassword, setShowPassword] = useState(true)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showError, setShowError] = useState(false);
    const router = useRouter();

    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState)
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        if (name === 'password') setPassword(value)
        if (name === 'confirmPassword') setConfirmPassword(value)
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setShowError(false)

        if (password !== confirmPassword){
            setShowError(true);
            setLoading(false);
            return;
        }

        setLoading(false);
        router.push('./login');
    }

    return (
        <div className={generalStyles.pageContainer}>
            <header className={generalStyles.pageHeader}>
                <h1>v-ent</h1>
            </header>

            <main className={generalStyles.mainContainer}>
                <div className={generalStyles.formContainer}>
                    <section className={generalStyles.formHeader}>
                        <h3 className={generalStyles.formHeaderH3}>Reset password?</h3>
                        <p>Enter your new password</p>
                    </section>

                    <form className={`${generalStyles.generalForm}`} onSubmit={handleSubmit}>

                        <div className={generalStyles.inputGroup}>
                            <label>New Password:</label>
                            <div className={generalStyles.passwordContainer}>
                                <input
                                    type={showPassword ? "password" : "text"}
                                    name="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handleInputChange}
                                    required
                                />
                                <span
                                    onClick={togglePasswordVisibility}
                                    className={generalStyles.togglePassword}
                                >
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>Confirm Password:</label>
                            <div className={generalStyles.passwordContainer}>
                                <input
                                    type={showPassword ? "password" : "text"}
                                    name="confirmPassword"
                                    placeholder="Confirm your new password"
                                    value={confirmPassword}
                                    onChange={handleInputChange}
                                    required
                                />
                                <span
                                    onClick={togglePasswordVisibility}
                                    className={generalStyles.togglePassword}
                                >
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>

                            {showError && (
                                <div className={generalStyles.errorMessageContainer}>
                                    <p className={generalStyles.errorMessage}>Passwords do not match!</p>
                                </div>                            
                            )}
                        </div>

                        <button className={`btn redBTN ${generalStyles.formBTN}`} disabled={loading}>
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}

export default ResetPassword;
