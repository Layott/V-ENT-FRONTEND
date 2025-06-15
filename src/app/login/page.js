"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import googleLogo from "../../../public/images/google.svg";
import facebookLogo from "../../../public/images/facebook.svg";
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
  const router = useRouter();

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "username_or_email") setEmailOrUsername(value);
    if (name === "password") setPassword(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Call NextAuth's signIn method with the credentials provider
    const result = await signIn("credentials", {
      redirect: false,
      email: username_or_email,
      password, 
      callbackUrl: `${window.location.origin}/user-profile`, // Redirect to user profile after login,
    });
    
    console.log("SignIn result:", result);


    if (result?.error) {
      setSnackbarMessage("Login failed. Please check your credentials.");
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
    } else {
      setSnackbarMessage("Login successful!");
      setSnackbarType("success");
      setOpen(true);
      window.location.href = "/user-profile";
      
    }

    setLoading(false);
  };

  const handleOAuthSignIn = async (provider) => {
    setLoading(true);

    try {
      // Force redirection to Google's auth page
      await signIn(provider, {
        redirect: true,
        callbackUrl: `${window.location.origin}/user-profile`,
        prompt: "select_account consent", // Explicitly request prompt and consent
      });

      // This code will only run if redirect: false
      setSnackbarMessage(`${provider} login successful!`);
      setSnackbarType("success");
      setOpen(true);
    } catch (error) {
      console.error(`Error during ${provider} sign-in:`, error);
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
              <Image
                src={facebookLogo}
                alt="Facebook Logo"
                className={`${styles.facebookLogo} ${generalStyles.authLogo}`}
                onClick={() =>
                  handleOAuthSignIn("facebook", {
                    callbackUrl: `${window.location.origin}/user-profile`, // ✅ redirect to /events after login
                  })
                }
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
