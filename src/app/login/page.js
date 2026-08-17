"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import googleLogo from "../../../public/images/google.svg";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import { signIn } from "next-auth/react";
import CircularProgress from "@mui/material/CircularProgress";
import { useRouter } from "next/navigation";
import MessageSnackbar from "../../components/Snackbar/MessageSnackbar";
import AuthHeader from "@/components/auth-header/AuthHeader";
import generalStyles from "@/styles/auth/auth.module.css";
import styles from "./login.module.css";

const Login = () => {
  const [showPassword, setShowPassword] = useState(true);
  const [username_or_email, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [errors, setErrors] = useState({});
  const [expired, setExpired] = useState(false);
  const router = useRouter();

  // Show a notice when the session-expiry guard bounced the user here.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setExpired(new URLSearchParams(window.location.search).get("expired") === "1");
    }
  }, []);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Inline validation: identifier required (valid email if it looks like one),
  // password required and at least 8 chars. Returns an errors map.
  const validate = () => {
    const next = {};
    const id = username_or_email.trim();
    if (!id) {
      next.username_or_email = "Email or username is required";
    } else if (id.includes("@") && !emailRegex.test(id)) {
      next.username_or_email = "Enter a valid email address";
    }
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Password must be at least 8 characters";
    return next;
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "username_or_email") setEmailOrUsername(value);
    if (name === "password") setPassword(value);
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    // Call NextAuth's signIn method with the credentials provider
    const result = await signIn("credentials", {
      redirect: false,
      email: username_or_email,
      password,
      callbackUrl: `${window.location.origin}/home`, // Redirect to user profile after login,
    });

    if (result?.error) {
      setSnackbarMessage("Login failed. Please check your credentials.");
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
    } else {
      setSnackbarMessage("Login successful!");
      setSnackbarType("success");
      setOpen(true);
      // First-run users (just signed up on this device) go through onboarding.
      const needsOnboarding = typeof window !== "undefined" && localStorage.getItem("needsOnboarding") === "true";
      window.location.href = needsOnboarding ? "/onboarding" : "/home";
    }

    setLoading(false);
  };

  const handleOAuthSignIn = async (provider) => {
    setLoading(true);

    try {
      // Force redirection to Google's auth page
      await signIn(provider, {
        redirect: true,
        callbackUrl: `${window.location.origin}/home`,
        prompt: "select_account consent", // Explicitly request prompt and consent
      });

      // This code will only run if redirect: false
      setSnackbarMessage(`${provider} login successful!`);
      setSnackbarType("success");
      setOpen(true);
    } catch (error) {
      setSnackbarMessage(`Failed to log in with ${provider}`);
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpen(false);
  };

  return (
    <div className={generalStyles.pageContainer}>
      <header className={generalStyles.pageHeader}>
        <AuthHeader />
      </header>

      <main className={generalStyles.mainContainer}>
        <div className={generalStyles.formContainer}>
          <section className={generalStyles.formHeader}>
            <h3 className={generalStyles.formHeaderH3}>Welcome Back</h3>
            <p>Please sign into your account</p>
          </section>

          {expired && (
            <div
              role="status"
              style={{
                margin: "0 0 1rem",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                background: "rgba(212, 175, 55, 0.12)",
                color: "var(--v-ent-gold, #D4AF37)",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              Your session expired. Please sign in again.
            </div>
          )}

          <form
            className={`${generalStyles.generalForm} ${styles.loginForm}`}
            onSubmit={handleSubmit}
          >
            <div className={generalStyles.inputGroup}>
              <label>Email or Username:</label>
              <input
                type="text"
                name="username_or_email"
                placeholder="Enter your email address or username"
                value={username_or_email}
                onChange={handleInputChange}
                required
              />
              {errors.username_or_email && (
                <p className={generalStyles.errorMessage}>{errors.username_or_email}</p>
              )}
            </div>
            <div className={generalStyles.inputGroup}>
              <label>Password:</label>
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
              {errors.password && (
                <p className={generalStyles.errorMessage}>{errors.password}</p>
              )}
            </div>

            <Link href={"/forgot-password"}>Forgot password?</Link>

            <button
              className={`btn redBTN ${generalStyles.formBTN}`}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* <div className={generalStyles.alternativeAuthContainer}>
            <p>Or sign in with</p>
            <div className={generalStyles.logoContainer}>
              <Image
                src={googleLogo}
                alt="Google Logo"
                className={`${styles.googleLogo} ${generalStyles.authLogo}`}
                onClick={() => handleOAuthSignIn("google")}
              />
            </div>
          </div> */}

          <div className={generalStyles.formHelperContainer}>
            <p>Don&#39;t have an account?&nbsp;</p>
            <Link href={"/signup"}>Create one</Link>
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

export default Login;
