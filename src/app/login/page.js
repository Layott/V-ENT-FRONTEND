"use client";

import { apiMessage } from '@/lib/apiMessage';
import AuthProviders from '@/components/auth-providers/AuthProviders';
import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
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
const Login = () => {
  const tt = useT();
  const [showPassword, setShowPassword] = useState(true);
  const [username_or_email, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  // The second half of the sign-in, for anybody who has a second factor and for
  // every admin whether they set one up or not. `challenge` is null until the
  // password is accepted and the server asks for a code.
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState("success");
  const [errors, setErrors] = useState({});
  const [expired, setExpired] = useState(false);
  // Outside sign-ins appear only when their keys exist. A button that leads to
  // a 503 is worse than no button.
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

  // Spends a backend session token for a NextAuth session. Both halves of the
  // sign-in end here, so a session established with a code and one established
  // without are the same thing afterwards.
  const finishSignIn = async (payload, body) => {
    if (!payload?.session_token) {
      return { error: apiMessage(tt, body, "api.loginFailed", "Login failed.") };
    }
    return signIn("external-token", {
      redirect: false,
      token: payload.session_token,
      callbackUrl: `${window.location.origin}/home`
    });
  };

  const submitCode = async e => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);

    let res;
    try {
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login/2fa/verify/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_token: challenge.pending_token, code: code.trim() })
      });
    } catch {
      setSnackbarMessage(tt("api.NETWORK_UNREACHABLE", "Could not reach the server. Check the connection and try again."));
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
      return;
    }
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSnackbarMessage(apiMessage(tt, body, "api.badCode", "That code is not right, or it has already been used."));
      setSnackbarType("error");
      setOpen(true);
      setCode("");
      setLoading(false);
      return;
    }

    const result = await finishSignIn(body, body);
    if (result?.error) {
      setSnackbarMessage(tt("msg.loginFailedPleaseCheckYour", "Login failed. Please check your credentials."));
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
      return;
    }
    await afterSignIn();
  };

  // Where somebody lands once they are in. Shared, so the code path and the
  // straight-in path cannot send people to different places.
  const afterSignIn = async () => {
    setSnackbarMessage(tt("msg.loginSuccessful", "Login successful!"));
    setSnackbarType("success");
    setOpen(true);
    const needsOnboarding = typeof window !== "undefined" && localStorage.getItem("needsOnboarding") === "true";
    const next = new URLSearchParams(window.location.search).get("next");
    const session = await getSession();
    const home = session?.user?.isStaff ? "/admin" : "/home";
    window.location.href = next || (needsOnboarding ? "/onboarding" : home);
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

    // The password goes to the backend directly rather than through NextAuth,
    // because the answer can be "now the code" rather than a session, and a
    // provider's authorize() has nowhere to put a half-finished sign-in.
    // NextAuth still holds the session: the token is spent against it below.
    let res;
    try {
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username_or_email, password })
      });
    } catch {
      setSnackbarMessage(tt("api.NETWORK_UNREACHABLE", "Could not reach the server. Check the connection and try again."));
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
      return;
    }
    const body = await res.json().catch(() => ({}));

    if (res.ok && body?.data?.requires_2fa) {
      setChallenge(body.data);
      setLoading(false);
      return;
    }

    const result = await finishSignIn(res.ok ? body : null, body);
    if (result?.error) {
      setSnackbarMessage(tt("msg.loginFailedPleaseCheckYour", "Login failed. Please check your credentials."));
      setSnackbarType("error");
      setOpen(true);
      setLoading(false);
    } else {
      await afterSignIn();
    }
    setLoading(false);
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

          {challenge && <section className={styles.codeStep}>
              <h2 className={styles.codeHeading}>
                {challenge.enrollment_required
                  ? tt("ui.2fa.setUpHeading", "Set up your authenticator")
                  : tt("ui.2fa.codeHeading", "Enter your code")}
              </h2>

              {challenge.enrollment_required
                ? <p className={styles.codeIntro}>
                    {challenge.enrollment_reason === "admin"
                      ? tt("ui.2fa.adminMustEnrol", "Admin accounts need an authenticator app. Add the key below to Google Authenticator, Authy or 1Password, then type the six digits it shows. You cannot sign in until this is done.")
                      : tt("ui.2fa.memberMustEnrol", "Add the key below to your authenticator app, then type the six digits it shows.")}
                  </p>
                : <p className={styles.codeIntro}>
                    {tt("ui.2fa.openYourApp", "Open your authenticator app and type the six digits it shows for V-ENT.")}
                  </p>}

              {challenge.secret && <div className={styles.secretBox}>
                  <span className={styles.secretLabel}>{tt("ui.2fa.setupKey", "Setup key")}</span>
                  <code className={styles.secret}>{challenge.secret}</code>
                </div>}

              <form onSubmit={submitCode} className={styles.codeForm}>
                <label htmlFor="totp" className={styles.codeLabel}>
                  {tt("ui.2fa.sixDigits", "Six-digit code")}
                </label>
                <input
                  id="totp"
                  name="totp"
                  className={styles.codeInput}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="000000"
                  aria-describedby="totp-help"
                />
                <p id="totp-help" className={styles.codeHelp}>
                  {tt("ui.2fa.codeChanges", "The code changes every 30 seconds.")}
                </p>
                <button type="submit" className={`btn grnBTN ${styles.codeSubmit}`} disabled={loading || code.length < 6}>
                  {loading ? <CircularProgress size={18} color="inherit" /> : tt("ui.2fa.confirm", "Confirm")}
                </button>
                <button type="button" className={styles.codeBack} onClick={() => {
                  setChallenge(null);
                  setCode("");
                }}>
                  {tt("ui.2fa.startOver", "Start again")}
                </button>
              </form>
            </section>}

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

          {!challenge && <form method="post" className={`${generalStyles.generalForm} ${styles.loginForm}`} onSubmit={handleSubmit}>
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
            }} /> : tt("ui.login.7b3c", "Log in")}
            </button>
          </form>}

          {/* Not offered mid-challenge. Somebody halfway through proving who
              they are should not be shown another way in beside it. */}
          {!challenge && <div className={generalStyles.alternativeAuthContainer}>
            <p>{tt("ui.sign.96ec", "Or sign in with")}</p>
            <AuthProviders mode="signin" disabled={loading} onBusy={setLoading} onError={msg => {
            setSnackbarMessage(msg);
            setSnackbarType('error');
            setOpen(true);
          }} />
          </div>}

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