"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import googleLogo from "../../../public/images/google.svg";
import { signIn } from "next-auth/react";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import { countries } from "./countries";
import PasswordStrength from "./passwordStrength";
import { VENT } from "@/app/api/auth/[...nextauth]/route";
import MessageSnackbar from "../../components/Snackbar/MessageSnackbar";
import CircularProgress from "@mui/material/CircularProgress";
import AuthHeader from "@/components/auth-header/AuthHeader";
import generalStyles from "@/styles/auth/auth.module.css";
import styles from "./signup.module.css";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    full_name: "",
    country: "",
    state: "",
    password: "",
    confirmPassword: "",
  });
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [showPassword, setShowPassword] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("");
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
    setShowPassword((prevState) => !prevState);
  };

  const clearError = (setErrorFunction) => {
      setTimeout(() => {
        setErrorFunction("");
      }, 1500);
    };

  const handleCloseSnackbar = () => {
    setOpen(false);
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    
    setFormData({ ...formData, [name]: value });
    

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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: value }),
        });
        
        const data = await response.json();

        if (data.status === 'success' && data.username) {
          setFormData((prev) => ({...prev, username: data.username }));
          setUsernameEditable(false);
          setUsernameError("");
          } else {
          // No existing username for email, allow manual entry
          setFormData((prev) => ({ ...prev, username: "" }));
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: value }),
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

  const handleCountrySelection = (event) => {
    setSelectedCountry(event.target.value);
    setFormData({ ...formData, country: event.target.value });
  };

  const handlePasswordChange = (e) => {
    const { value } = e.target;
    setPassword(value);
    setFormData({ ...formData, password: value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Inline validation gate - runs before any network call.
    const validationMessage = (() => {
      if (!emailRegex.test(formData.email)) return "Enter a valid email address";
      if (!usernameRegex.test((formData.username || "").trim()))
        return "Username must be 3-30 characters (letters, numbers, underscores)";
      if (!isPasswordValid(formData.password))
        return "Password needs 8+ characters with upper case, lower case, and a number";
      if (formData.password !== formData.confirmPassword) return "Passwords do not match";
      if (!formData.country) return "Please select your country";
      if (!formData.state || !formData.state.trim()) return "Please enter your state/area/province";
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
    const payload = {
      email: formData.email,
      username: formData.username,
      country: formData.country,
      state: formData.state,
      password: formData.password,
      full_name: formData.full_name
    };

    try {
      const response = await fetch(VENT.SIGNUP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { error: "Invalid server response" };
      }

      if (response.ok) {
        localStorage.setItem("signupData", JSON.stringify(payload));
        // Flag first-run so the first login routes through /onboarding.
        localStorage.setItem("needsOnboarding", "true");
        router.push("/verify-email");
        setSnackbarMessage(data.message || "Account created successfully!");
        setSnackbarType("success");
        setOpen(true);
      } else {
        const errorMessage = data.error ||
                            data.message ||
                            data.detail ||
                            "Failed to create account";

        setSnackbarMessage(errorMessage);
        setSnackbarType("error");
        setOpen(true);
      }
    } catch (error) {
      setSnackbarMessage("An error occurred. Please try again.");
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
            redirect: true,
        });
        
        setLoading(false);
    } catch (error) {
        setSnackbarMessage("An error occurred during signup. Please try again.");
        setSnackbarType("error");
        setOpen(true);
        setLoading(false);
    }
};

const isPasswordValid = (password) => {
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    );
};

return (
        <div className={generalStyles.pageContainer}>
            <header className={generalStyles.pageHeader}>
                <AuthHeader />
            </header>

            <main className={generalStyles.mainContainer}>
                <div className={generalStyles.formContainer}>
                    <section className={generalStyles.formHeader}>
                        <h3 className={generalStyles.formHeaderH3}>Create an account</h3>
                        <p>Please complete your account details</p>
                    </section>

                    <form className={generalStyles.generalForm} onSubmit={handleFormSubmit}>

                        <div className={generalStyles.inputGroup}>
                            <label>Email Address:</label>
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter your email address"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                                {isEmailLoading ? (
                                    <CircularProgress size={20} sx={{ color: 'red' }} className={styles.emailLoader} />
                                ) : (
                                    emailError && <p className={styles.errorMessage}>{emailError}</p>
                                )}
                        </div>


                        <div className={generalStyles.inputGroup}>
                            <label>Username:</label>
                            <input
                                type="text"
                                name="username"
                                placeholder="Enter a username"
                                value={formData.username}
                                onChange={handleInputChange}
                                disabled={!usernameEditable}
                                required
                            />
                            {usernameError ? (
                                <p className={styles.errorMessage}>{usernameError}</p>
                            ) : (
                                <p className={styles.toolTip}>This will be your display name across V-ent, so choose a cool one! (Max. 30 characters)</p>
                            )}
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>Full name:</label>
                            <input
                                type="text"
                                name="full_name" 
                                placeholder="Enter your name"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>Country:</label>
                            <select
                                value={selectedCountry}
                                onChange={handleCountrySelection}
                                className={styles.countryDropdown}
                                required
                            >
                                <option value="">Select your country</option>
                                {countries.map((country) => (
                                    <option key={country.code} value={country.name}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>State/Area/Province:</label>
                            <div className={generalStyles.inputGroup}>
                            <input
                                type='text'
                                name="state"
                                placeholder="Enter your state/area/province"
                                required
                                value={formData.state}
                                onChange={handleInputChange} 
                            />
                            </div>
                        </div>

                        <div className={generalStyles.inputGroup}>
                            <label>Password:</label>
                            <div className={generalStyles.passwordContainer}>
                                <input
                                    type={showPassword ? "password" : "text"}
                                    name="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handlePasswordChange}
                                    required
                                />
                                <span
                                    onClick={togglePasswordVisibility}
                                    className={generalStyles.togglePassword}>
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>
                            {password && <PasswordStrength password={password} />}
                        </div>

                        <div className={generalStyles.inputGroup}> 
                            <label>Confirm Password:</label>
                            <div className={generalStyles.passwordContainer}>
                                <input
                                    type={showPassword ? "password" : "text"}
                                    name="confirmPassword"
                                    placeholder="Re-enter your password"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    required
                                    disabled={!isPasswordValid(password)}
                                />
                                <span
                                    onClick={togglePasswordVisibility}
                                    className={generalStyles.togglePassword}
                                >
                                    {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                                </span>
                            </div>
                        </div>

                        <button type="submit" className={`btn redBTN ${generalStyles.formBTN}`}>
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create account'}
                        </button>
                        <p className={styles.termsAndPrivacy}>By creating an account, you agree to our&nbsp;
                            {/* /term-of-use is not a route - the terms live as a PDF in /public. */}
                            <a
                              href="/V-ENT%20TERMS%20OF%20USE.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Terms of Use
                            </a>
                            &nbsp;&amp;&nbsp;
                            {/* <Link href={'/privacy-policy'}>Privacy Policy</Link> */}
                            <a
                              href="/privacy-policy.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Privacy Policy
                            </a>
                        </p>
                    </form>

                    {/* <div className={generalStyles.alternativeAuthContainer}>
                        <p>Or sign up with</p>
                        <div className={generalStyles.logoContainer}>
                            <Image
                                src={googleLogo}
                                alt="Google Logo"
                                className={`${styles.googleLogo} ${generalStyles.authLogo}`}
                                // onClick={() => handleOAuthSignUp('google')}
                                onClick={() =>
                                handleOAuthSignUp("google", {
                                    callbackUrl: `${window.location.origin}/user-profile`,
                                    })
                                }
                            />
                        </div>
                    </div> */}

                    <div className={generalStyles.formHelperContainer}>
                        <p>Already have an account?&nbsp;</p>
                        <Link href={'/login'}>Login</Link>
                    </div>

                </div>
            </main>

            <MessageSnackbar
                open={open}
                handleClose={handleCloseSnackbar}
                message={snackbarMessage}
                type={snackbarType}
            />
        </div>
  );
};

export default Signup;

