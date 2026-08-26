"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import googleLogo from "../../../public/images/google.svg";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { FaRegEyeSlash } from "react-icons/fa";
import { getSession, signIn } from "next-auth/react";
import CircularProgress from "@mui/material/CircularProgress";
import { useRouter } from "next/navigation";
import MessageSnackbar from "../../components/Snackbar/MessageSnackbar";
import AuthHeader from "@/components/auth-header/AuthHeader";
import generalStyles from "@/styles/auth/auth.module.css";
import styles from "./login.module.css";
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const Login = () => {
  const tx = useTx();
  const tt = useT();
  const [showPassword, setShowPassword] = useState(true);
  const [username_or_email, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [errors, setErrors] = useState({});
  const [expired, setExpired] = useState(false);
  // Outside sign-ins appear only when their keys exist. A button that leads to
  // a 503 is worse than no button.
  const [externalProviders, setExternalProviders] = useState({});
  const router = useRouter();

  // Show a notice when the session-expiry guard bounced the user here, and
  // report a sign-in that failed on the way back from Google. Without the
  // second half, a rejected social sign-in landed on a blank login form with
  // no explanation at all.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setExpired(params.get("expired") === "1");
    const failed = params.get("error");
    if (failed) {
      setSnackbarMessage(params.get("message") || "Sign-in did not complete. Please try again.");
      setSnackbarType("error");
      setOpen(true);
      params.delete("error");
      params.delete("message");
      const rest = params.toString();
      window.history.replaceState({}, "", rest ? `/login?${rest}` : "/login");
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/inbound/providers/`);
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setExternalProviders(body?.data?.providers || {});
      } catch {
        /* the page works without them */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const startExternal = async slug => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/inbound/${slug}/start/`);
      const body = await res.json();
      if (res.ok && body?.data?.url) {
        window.location.href = body.data.url;
        return;
      }
      setSnackbarMessage(body.message || tt("api.thatSignInIsNot", "That sign-in is not available yet."));
      setSnackbarType('error');
      setOpen(true);
    } catch {
      setSnackbarMessage(tt("msg.thatSignInCouldNot", "That sign-in could not be started."));
      setSnackbarType('error');
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };
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
    if (!password) next.password = "Password is required";else if (password.length < 8) next.password = "Password must be at least 8 characters";
    return next;
  };
  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState);
  };
  const handleInputChange = e => {
    const {
      name,
      value
    } = e.target;
    if (name === "username_or_email") setEmailOrUsername(value);
    if (name === "password") setPassword(value);
    if (errors[name]) setErrors(prev => ({
      ...prev,
      [name]: undefined
    }));
  };
  const handleSubmit = async e => {
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
      callbackUrl: `${window.location.origin}/home` // Redirect to user profile after login,
    });
    if (result?.error) {
      setSnackbarMessage(tt("msg.loginFailedPleaseCheckYour", "Login failed. Please check your credentials."));
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
    } else {
      setSnackbarMessage(tt("msg.loginSuccessful", "Login successful!"));
      setSnackbarType("success");
      setOpen(true);
      // First-run users (just signed up on this device) go through onboarding.
      const needsOnboarding = typeof window !== "undefined" && localStorage.getItem("needsOnboarding") === "true";

      // A staff account goes to the admin console rather than the player
      // dashboard. It still signs in to the console separately - that has its
      // own token and its own 2FA, and this grants neither - but an admin no
      // longer has to know the address and type it.
      //
      // `next` wins over both: somebody sent to sign in from a page they were
      // reading goes back to that page.
      const next = new URLSearchParams(window.location.search).get("next");
      const session = await getSession();
      const home = session?.user?.isStaff ? "/admin" : "/home";
      window.location.href = next || (needsOnboarding ? "/onboarding" : home);
    }
    setLoading(false);
  };
  const handleOAuthSignIn = async provider => {
    setLoading(true);
    try {
      // Force redirection to Google's auth page
      await signIn(provider, {
        redirect: true,
        callbackUrl: `${window.location.origin}/home`,
        prompt: "select_account consent" // Explicitly request prompt and consent
      });

      // Nothing is announced here. signIn() with redirect: true resolves as
      // soon as the browser starts leaving for Google, which is long before
      // anyone has picked an account - so a success message at this point
      // claimed the sign-in had worked while the chooser was still open. The
      // real outcome arrives back on /home or, if it failed, on
      // /login?error=..., and it is reported there.
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
  return <div className={generalStyles.pageContainer}>
      <header className={generalStyles.pageHeader}>
        <AuthHeader />
      </header>

      <main className={generalStyles.mainContainer}>
        <div className={generalStyles.formContainer}>
          <section className={generalStyles.formHeader}>
            <h1 className={generalStyles.formHeading}>{tt("ui.welcome.back.1c90", "Welcome Back")}</h1>
            <p>{tt("ui.please.sign.into.account.51de", "Please sign into your account")}</p>
          </section>

          {expired && <div role="status" style={{
          margin: "0 0 1rem",
          padding: "0.65rem 0.85rem",
          borderRadius: "8px",
          background: "rgba(212, 175, 55, 0.12)",
          color: "var(--v-ent-gold, #D4AF37)",
          fontSize: "0.85rem",
          textAlign: "center"
        }}>
              {tt("ui.session.expired.please.sign.4b19", "Your session expired. Please sign in again.")}
            </div>}
            {/* method="post" is not there to be used - onSubmit handles the
                request. It is there because a form defaults to GET, and a
                submit that lands before React has hydrated puts whatever was
                typed into the URL. On these pages that means a password in the
                address bar, in history, and in any referrer. */}

          <form method="post" className={`${generalStyles.generalForm} ${styles.loginForm}`} onSubmit={handleSubmit}>
            <div className={generalStyles.inputGroup}>
              <label>{tt("ui.email.username.c4b8", "Email or Username:")}</label>
              <input type="text" name="username_or_email" placeholder={tt("ui.enter.email.address.username.1978", "Enter your email address or username")} value={username_or_email} onChange={handleInputChange} required />
              {errors.username_or_email && <p className={generalStyles.errorMessage}>{errors.username_or_email}</p>}
            </div>
            <div className={generalStyles.inputGroup}>
              <label>{tt("ui.password.be81", "Password:")}</label>
              <div className={generalStyles.passwordContainer}>
                <input type={showPassword ? "password" : "text"} name="password" placeholder={tt("ui.enter.password.1378", "Enter your password")} value={password} onChange={handleInputChange} required />
                <span onClick={togglePasswordVisibility} className={generalStyles.togglePassword}>
                  {showPassword ? <FaRegEyeSlash /> : <MdOutlineRemoveRedEye />}
                </span>
              </div>
              {errors.password && <p className={generalStyles.errorMessage}>{errors.password}</p>}
            </div>

            <Link href={"/forgot-password"}>{tt("ui.forgot.password.4c29", "Forgot password?")}</Link>

            <button className={`btn redBTN ${generalStyles.formBTN}`} disabled={loading}>
              {loading ? <CircularProgress size={24} sx={{
              color: "white"
            }} /> : "Login"}
            </button>
          </form>

          <div className={generalStyles.alternativeAuthContainer}>
            <p>{tt("ui.sign.96ec", "Or sign in with")}</p>
            <div className={generalStyles.logoContainer}>
              <button type="button" className={generalStyles.oauthButton} onClick={() => handleOAuthSignIn("google")} aria-label={tt("ui.sign.google.4a0b", "Sign in with Google")} disabled={loading}>
                <Image src={googleLogo} alt="" aria-hidden="true" className={`${styles.googleLogo} ${generalStyles.authLogo}`} />
                <span>{tt("ui.google.2b68", "Google")}</span>
              </button>

              {Object.entries(externalProviders).filter(([, meta]) => meta.configured).map(([slug, meta]) => <button key={slug} type="button" className={styles.oauthBTN} onClick={() => startExternal(slug)} disabled={loading}>
                    {tt("ui.continue.with.6433", "Continue with")} {tx(meta.label)}
                  </button>)}
            </div>
          </div>

          <div className={generalStyles.formHelperContainer}>
            <p>{tt("ui.don't.have.account.f838", "Don't have an account?")} </p>
            <Link href={"/signup"}>{tt("ui.create.one.7dbf", "Create one")}</Link>
          </div>
        </div>
      </main>

      <MessageSnackbar open={open} handleClose={handleCloseSnackbar} message={snackbarMessage} type={snackbarType} />
    </div>;
};
export default Login;