"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import googleLogo from "../../../public/images/google.svg";
import facebookLogo from "../../../public/images/facebook.svg";
import { signIn } from "next-auth/react";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import { countries } from "./countries";
import PasswordStrength from "./passwordStrength";
import { VENT } from "@/app/api/auth/[...nextauth]/route";
import MessageSnackbar from "../../components/Snackbar/MessageSnackbar";
import CircularProgress from "@mui/material/CircularProgress";
import { useRouter } from "next/navigation";
import AuthHeader from "@/components/auth-header/AuthHeader";
import generalStyles from "@/styles/auth/auth.module.css";
import styles from "./signup.module.css";

const Signup = () => {
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [showPassword, setShowPassword] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    country: "",
    state: "",
    password: "",
    confirmPassword: "",
  });
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameEditable, setUsernameEditable] = useState(false);

  const router = useRouter();

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handleCloseSnackbar = () => {
    setOpen(false);
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    setFormData({ ...formData, [name]: value });

    const clearError = (setErrorFunction) => {
      setTimeout(() => {
        setErrorFunction("");
      }, 1500);
    };

    if (name === "username") {
      if (!usernameEditable) return;

      if (value.length > 30) {
        setUsernameError("Username cannot exceed 30 characters.");
        clearError(setUsernameError);
      } else {
        setUsernameError("");
      }
    }

    if (name === "email") {
      setEmailError("");
    
      if (!emailRegex.test(value)) {
        setEmailError("Invalid email address");
        clearError(setEmailError);
        return;
      }
    
      setIsEmailLoading(true);
    
      try {
        const response = await fetch(VENT.USER_VERIFICATION, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: value }),
        });
    
        const data = await response.json();
    
        if (response.ok) {
          setFormData((prevFormData) => ({
            ...prevFormData,
            username: data.username || "",
          }));
    
          if (data.message === "The username does not exist") {
            setUsernameEditable(true);
          } else {
            setUsernameEditable(false);
          }
        } else {
          setUsernameError(data.message || "Failed to retrieve username");
          clearError(setUsernameError);
          setUsernameEditable(true);
        }
      } catch (error) {
        console.error("Error fetching username:", error);
        setEmailError("Error occurred while fetching username");
        clearError(setEmailError);
      } finally {
        setIsEmailLoading(false);
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
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setSnackbarMessage("Passwords do not match");
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
      return;
    }

    const { confirmPassword, ...dataToSend } = formData;

    try {
      const response = await fetch(VENT.SIGNUP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("signupData", JSON.stringify(dataToSend));

        router.push("/verify-email");
        setSnackbarMessage(data.message || "Account created successfully!");
        setSnackbarType("success");
        setOpen(true);
      } else {
        setSnackbarMessage(data.error || "Failed to create account");
        setSnackbarType("error");
        setOpen(true);
      }
    } catch (error) {
      console.error("Error during signup:", error);
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
      // We're going to simplify this function and let NextAuth handle the redirect
      // with proper error parameters
      await signIn(provider, {
        ...options,
        callbackUrl: "/user-profile",
        redirect: true, // Allow redirect, errors will be handled on the login page
      });
      
      // Note: This code below will likely not run due to redirect
      setLoading(false);
    } catch (error) {
      console.error("Error during OAuth signup:", error);
      setSnackbarMessage("An error occurred during signup. Please try again.");
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
    }
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

          <form
            className={generalStyles.generalForm}
            onSubmit={handleFormSubmit}
          >
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
                <CircularProgress
                  size={20}
                  sx={{ color: "red" }}
                  className={styles.emailLoader}
                />
              ) : (
                emailError && (
                  <p className={styles.errorMessage}>{emailError}</p>
                )
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
                <p className={styles.toolTip}>
                  This will be your display name across V-ent, so choose a cool
                  one! (Max. 30 characters)
                </p>
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
                  type="text"
                  name="state"
                  placeholder="Enter your state/area/province"
                  required
                  value={formData.state}
                  onChange={handleInputChange}
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
                  className={generalStyles.togglePassword}
                >
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
                />
                <span
                  onClick={togglePasswordVisibility}
                  className={generalStyles.togglePassword}
                >
                  {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className={`btn redBTN ${generalStyles.formBTN}`}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                "Create account"
              )}
            </button>
            <p className={styles.termsAndPrivacy}>
              By creating an account, you agree to our&nbsp;
              <Link href={"/term-of-use"}>Terms of Use</Link>
              &nbsp;&amp;&nbsp;
              <Link href={"/privacy-policy"}>Privacy Policy</Link>
            </p>
          </form>

          <div className={generalStyles.alternativeAuthContainer}>
            <p>Or sign up with</p>
            <div className={generalStyles.logoContainer}>
              <Image
                src={googleLogo}
                alt="Google Logo"
                className={`${styles.googleLogo} ${generalStyles.authLogo}`}
                onClick={() =>
                  handleOAuthSignUp("google", {
                    callbackUrl: `${window.location.origin}/events`,
                  })
                }
              />

              <Image
                src={facebookLogo}
                alt="Facebook Logo"
                className={`${styles.facebookLogo} ${generalStyles.authLogo}`}
                onClick={() =>
                  handleOAuthSignUp("facebook", {
                    callbackUrl: `${window.location.origin}/events`,
                  })
                }
              />
            </div>
          </div>

          <div className={generalStyles.formHelperContainer}>
            <p>Already have an account?&nbsp;</p>
            <Link href={"/login"}>Login</Link>
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
