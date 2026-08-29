"use client";

import { apiMessage } from '@/lib/apiMessage';
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import googleLogo from "../../../public/images/google.svg";
import { signIn } from "next-auth/react";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import PasswordStrength from "./passwordStrength";
import { VENT } from "@/app/api/auth/[...nextauth]/route";
import MessageSnackbar from "../../components/Snackbar/MessageSnackbar";
import CircularProgress from "@mui/material/CircularProgress";
import AuthHeader from "@/components/auth-header/AuthHeader";
import generalStyles from "@/styles/auth/auth.module.css";
import styles from "./signup.module.css";
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const Signup = () => {
  const tx = useTx();
  const tt = useT();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [showPassword, setShowPassword] = useState(true);
  const [password, setPassword] = useState("");
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameEditable, setUsernameEditable] = useState(true);
  const router = useRouter();
  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState);
  };
  const clearError = setErrorFunction => {
    setTimeout(() => {
      setErrorFunction("");
    }, 1500);
  };
  const handleCloseSnackbar = () => {
    setOpen(false);
  };
  const handleInputChange = async e => {
    const {
      name,
      value
    } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (name === "email") {
      setEmailError("");
      setIsEmailLoading(true);
      if (!emailRegex.test(value)) {
        setEmailError("Invalid email address");
        clearError(setEmailError);
        setIsEmailLoading(false);
        return;
      }
      try {
        const response = await fetch(VENT.USER_VERIFICATION, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: value
          })
        });
        const data = await response.json();
        if (data.status === 'success' && data.username) {
          setFormData(prev => ({
            ...prev,
            username: data.username
          }));
          setUsernameEditable(false);
          setUsernameError("");
        } else {
          // No existing username for email, allow manual entry
          setFormData(prev => ({
            ...prev,
            username: ""
          }));
          setUsernameEditable(true);
          setUsernameError("");
        }
      } catch (err) {
        setEmailError("Verification failed. Try again.");
        clearError(setEmailError);
        setUsernameEditable(true);
      } finally {
        setIsEmailLoading(false);
      }
    }
    if (name === "username" && usernameEditable) {
      const uname = value.trim();
      // Inline rule: 3-30 chars, letters/numbers/underscore only.
      if (uname && !usernameRegex.test(uname)) {
        setUsernameError("3-30 characters - letters, numbers, and underscores only");
        return;
      }
      setUsernameError("");
      if (!uname) return;
      try {
        const res = await fetch(VENT.USER_VERIFICATION, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: value
          })
        });
        const data = await res.json();
        if (data.message === "The username does not exist") {
          setUsernameError("");
        } else {
          setUsernameError("Username is already taken");
          clearError(setUsernameError);
        }
      } catch (err) {
        // Uniqueness check is best-effort; ignore network failures here.
      }
    }
  };
  const handlePasswordChange = e => {
    const {
      value
    } = e.target;
    setPassword(value);
    setFormData({
      ...formData,
      password: value
    });
  };
  const handleFormSubmit = async e => {
    e.preventDefault();

    // Inline validation gate - runs before any network call.
    const validationMessage = (() => {
      if (!emailRegex.test(formData.email)) return "Enter a valid email address";
      if (!usernameRegex.test((formData.username || "").trim())) return "Username must be 3-30 characters (letters, numbers, underscores)";
      if (!isPasswordValid(formData.password)) return "Password needs 8+ characters with upper case, lower case, and a number";
      if (formData.password !== formData.confirmPassword) return "Passwords do not match";
      if (usernameError) return "Please choose a different username";
      return null;
    })();
    if (validationMessage) {
      setSnackbarMessage(validationMessage);
      setSnackbarType("error");
      setOpen(true);
      return;
    }
    setLoading(true);

    // Create payload to match expected format
    // Three fields. Country and state are resolved server-side from the request
    // IP, and the display name defaults to the username until onboarding.
    const payload = {
      email: formData.email,
      username: formData.username,
      password: formData.password
    };
    try {
      const response = await fetch(VENT.SIGNUP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = {
          error: "Invalid server response"
        };
      }
      if (response.ok) {
        localStorage.setItem("signupData", JSON.stringify(payload));
        // Flag first-run so the first login routes through /onboarding.
        localStorage.setItem("needsOnboarding", "true");
        router.push("/verify-email");
        setSnackbarMessage(apiMessage(tt, data, "api.accountCreatedSuccessfully", "Account created successfully!"));
        setSnackbarType("success");
        setOpen(true);
      } else {
        const errorMessage = data.error || data.message || data.detail || "Failed to create account";
        setSnackbarMessage(errorMessage);
        setSnackbarType("error");
        setOpen(true);
      }
    } catch (error) {
      setSnackbarMessage(tt("msg.anErrorOccurredPleaseTry", "An error occurred. Please try again."));
      setSnackbarType("error");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };
  const handleOAuthSignUp = async (provider, options = {}) => {
    setLoading(true);
    try {
      await signIn(provider, {
        callbackUrl: `${window.location.origin}/user-profile`,
        redirect: true
      });
      setLoading(false);
    } catch (error) {
      setSnackbarMessage(tt("msg.anErrorOccurredDuringSignup", "An error occurred during signup. Please try again."));
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
    }
  };
  const isPasswordValid = password => {
    return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
  };
  return <div className={generalStyles.pageContainer}>
            <header className={generalStyles.pageHeader}>
                <AuthHeader />
            </header>

            <main className={generalStyles.mainContainer}>
                <div className={generalStyles.formContainer}>
                    <section className={generalStyles.formHeader}>
                        <h1 className={generalStyles.formHeading}>{tt("ui.create.account.3f4f", "Create an account")}</h1>
                        <p>{tt("ui.please.complete.account.details.979b", "Please complete your account details")}</p>
                    </section>
            {/* method="post" is not there to be used - onSubmit handles the
                request. It is there because a form defaults to GET, and a
                submit that lands before React has hydrated puts whatever was
                typed into the URL. On these pages that means a password in the
                address bar, in history, and in any referrer. */}

                    <form method="post" className={generalStyles.generalForm} onSubmit={handleFormSubmit}>

                        <div className={generalStyles.inputGroup}>
                            <label>{tt("ui.email.address.852c", "Email Address:")}</label>
                            <input type="email" name="email" placeholder={tt("ui.enter.email.address.c099", "Enter your email address")} value={formData.email} onChange={handleInputChange} required />
                                {isEmailLoading ? <CircularProgress size={20} sx={{
              color: 'red'
            }} className={styles.emailLoader} /> : emailError && <p className={styles.errorMessage}>{emailError}</p>}
                        </div>


                        <div className={generalStyles.inputGroup}>
                            <label>{tt("ui.username.17df", "Username:")}</label>
                            <input type="text" name="username" placeholder={tt("ui.enter.username.9303", "Enter a username")} value={formData.username} onChange={handleInputChange} disabled={!usernameEditable} required />
                            {usernameError ? <p className={styles.errorMessage}>{usernameError}</p> : <p className={styles.toolTip}>{tt("ui.will.display.name.across.027d", "This will be your display name across V-ent, so choose a cool one! (Max. 30 characters)")}</p>}
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>{tt("ui.password.be81", "Password:")}</label>
                            <div className={generalStyles.passwordContainer}>
                                <input type={showPassword ? "password" : "text"} name="password" placeholder={tt("ui.enter.password.1378", "Enter your password")} value={password} onChange={handlePasswordChange} required />
                                <span onClick={togglePasswordVisibility} className={generalStyles.togglePassword}>
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>
                            {password && <PasswordStrength password={password} />}
                        </div>

                        <div className={generalStyles.inputGroup}> 
                            <label>{tt("ui.confirm.password.7fdb", "Confirm Password:")}</label>
                            <div className={generalStyles.passwordContainer}>
                                <input type={showPassword ? "password" : "text"} name="confirmPassword" placeholder={tt("ui.re.enter.password.e764", "Re-enter your password")} value={formData.confirmPassword} onChange={handleInputChange} required disabled={!isPasswordValid(password)} />
                                <span onClick={togglePasswordVisibility} className={generalStyles.togglePassword}>
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>
                        </div>

                        <button type="submit" className={`btn redBTN ${generalStyles.formBTN}`}>
                            {loading ? <CircularProgress size={24} sx={{
              color: 'white'
            }} /> : tx("Create account")}
                        </button>
                        <p className={styles.termsAndPrivacy}>{tt("ui.by.creating.account.agree.034e", "By creating an account, you agree to our")} 
                            {/* Both are pages now. They used to be PDFs, which could not be
                                translated, could not be read by a crawler, and in the case of
                                the terms still carried "[Insert Jurisdiction]" in the section
                                naming which country's law applies. */}
                            <a href="/terms" target="_blank" rel="noopener noreferrer">
                              {tt("ui.terms.use.9773", "Terms of Use")}
                            </a>
                            &nbsp;&amp;&nbsp;
                            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                              {tt("ui.privacy.policy.9db1", "Privacy Policy")}
                            </a>
                        </p>
                    </form>

                    <div className={generalStyles.alternativeAuthContainer}>
                        <p>{tt("ui.sign.up.b337", "Or sign up with")}</p>
                        <div className={generalStyles.logoContainer}>
                            <button type="button" className={generalStyles.oauthButton} aria-label={tt("ui.sign.up.google.3384", "Sign up with Google")} onClick={() => handleOAuthSignUp("google", {
              callbackUrl: `${window.location.origin}/onboarding`
            })}>
                                <Image src={googleLogo} alt="" aria-hidden="true" className={`${styles.googleLogo} ${generalStyles.authLogo}`} />
                                <span>{tt("ui.google.2b68", "Google")}</span>
                            </button>
                        </div>
                    </div>

                    <div className={generalStyles.formHelperContainer}>
                        <p>{tt("ui.already.have.account.8559", "Already have an account?")} </p>
                        <Link href={'/login'}>{tt("ui.login.4e5a", "Login")}</Link>
                    </div>

                </div>
            </main>

            <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
        </div>;
};
export default Signup;