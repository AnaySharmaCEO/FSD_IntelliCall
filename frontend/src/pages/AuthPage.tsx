// AuthPage — Sign in & Sign up for IntelliCall.
// Primary options:
// 1. Email/Password (Sign in verifies directly; Sign up requires 6-digit OTP verification -> Onboarding)
// 2. Sign in with Google (branded SSO -> Onboarding if new, Dashboard if returning)
// 3. Sign in with Microsoft (branded SSO -> Onboarding if new, Dashboard if returning)

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useToast } from "../components/ui/Toast";

type AuthMode = "signin" | "signup" | "otp";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const initialMode: AuthMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP states
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpResendCountdown, setOtpResendCountdown] = useState(30);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === "otp" && otpResendCountdown > 0) {
      timer = setInterval(() => {
        setOtpResendCountdown(c => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, otpResendCountdown]);

  // Handle email sign in
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem("intellicall_auth_token", "sample_token_" + Date.now());
      localStorage.setItem("intellicall_user_email", email);
      toast("Signed in successfully.");
      navigate("/dashboard");
    }, 650);
  };

  // Handle email sign up -> move to OTP
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMode("otp");
      setOtp(["", "", "", "", "", ""]);
      setOtpResendCountdown(30);
      toast("Verification code sent to " + email);
      setTimeout(() => {
        otpInputs.current[0]?.focus();
      }, 100);
    }, 600);
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const cleanChar = val.slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = cleanChar;
    setOtp(nextOtp);

    if (cleanChar && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      localStorage.setItem("intellicall_auth_token", "sample_token_" + Date.now());
      localStorage.setItem("intellicall_user_email", email);
      toast("Account verified successfully.");
      // New accounts go through onboarding
      navigate("/onboarding");
    }, 700);
  };

  const handleResendOtp = () => {
    if (otpResendCountdown > 0) return;
    setOtpResendCountdown(30);
    toast("A new 6-digit verification code was sent.");
  };

  // Google SSO handler
  const handleGoogleSSO = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const isFirstTime = !localStorage.getItem("intellicall_has_onboarded");
      localStorage.setItem("intellicall_auth_token", "google_sso_" + Date.now());
      localStorage.setItem("intellicall_user_email", "google.user@example.com");
      toast("Signed in with Google.");
      if (isFirstTime) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    }, 500);
  };

  // Microsoft SSO handler
  const handleMicrosoftSSO = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const isFirstTime = !localStorage.getItem("intellicall_has_onboarded");
      localStorage.setItem("intellicall_auth_token", "microsoft_sso_" + Date.now());
      localStorage.setItem("intellicall_user_email", "microsoft.user@example.com");
      toast("Signed in with Microsoft.");
      if (isFirstTime) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    }, 500);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "var(--color-bg-primary)" }}
    >
      {/* Brand header */}
      <div className="mb-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[20px] font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          <span>IntelliCall</span>
        </Link>
        <p className="text-[12px] font-mono mt-1" style={{ color: "var(--color-text-muted)" }}>
          Explainable outbound AI qualification
        </p>
      </div>

      {/* Main Card */}
      <div
        className="w-full max-w-[440px] rounded-[var(--radius-lg)] p-8 relative"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border-subtle)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {mode !== "otp" ? (
          <>
            {/* Mode switch tabs */}
            <div className="flex rounded-[var(--radius-sm)] p-1 bg-[var(--color-bg-sunken)] mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={[
                  "flex-1 py-1.5 text-[13px] font-semibold rounded-[var(--radius-sm)] transition-all",
                  mode === "signin"
                    ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                ].join(" ")}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={[
                  "flex-1 py-1.5 text-[13px] font-semibold rounded-[var(--radius-sm)] transition-all",
                  mode === "signup"
                    ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                ].join(" ")}
              >
                Sign up
              </button>
            </div>

            {/* SSO Primary Providers */}
            <div className="flex flex-col gap-2.5 mb-6">
              {/* Google SSO Button */}
              <button
                type="button"
                onClick={handleGoogleSSO}
                disabled={loading}
                className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-sunken)] transition-colors flex items-center justify-center gap-3 text-[14px] font-semibold text-[var(--color-text-primary)] disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{mode === "signin" ? "Sign in with Google" : "Sign up with Google"}</span>
              </button>

              {/* Microsoft SSO Button */}
              <button
                type="button"
                onClick={handleMicrosoftSSO}
                disabled={loading}
                className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-sunken)] transition-colors flex items-center justify-center gap-3 text-[14px] font-semibold text-[var(--color-text-primary)] disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                <span>{mode === "signin" ? "Sign in with Microsoft" : "Sign up with Microsoft"}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div className="w-full border-t border-[var(--color-border-subtle)]" />
              </div>
              <span
                className="relative px-3 text-[11px] uppercase tracking-wider bg-[var(--color-bg-surface)]"
                style={{ color: "var(--color-text-muted)" }}
              >
                or continue with email
              </span>
            </div>

            {/* Error message */}
            {error && (
              <div
                className="p-3 mb-4 rounded-[var(--radius-sm)] text-[12px] flex items-center gap-2"
                style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            {mode === "signin" ? (
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <Input
                  label="Work email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <Input
                  label="Password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <Button type="submit" size="lg" loading={loading} className="w-full justify-center mt-2">
                  Sign in
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <Input
                  label="Work email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <Input
                  label="Create password"
                  type="password"
                  required
                  hint="Minimum 8 characters"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <Button type="submit" size="lg" loading={loading} className="w-full justify-center mt-2">
                  Continue to verification →
                </Button>
              </form>
            )}
          </>
        ) : (
          /* OTP Verification Screen */
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: "var(--color-action-secondary-bg)", color: "var(--color-action-primary)" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">
                Check your inbox
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
                We sent a 6-digit code to <strong className="text-[var(--color-text-primary)]">{email}</strong>
              </p>
            </div>

            {error && (
              <div
                className="p-3 rounded-[var(--radius-sm)] text-[12px] text-center"
                style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5 mt-2">
              {/* 6 OTP boxes */}
              <div className="flex justify-between gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (otpInputs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    className="w-12 h-13 text-center text-[20px] font-mono font-semibold rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-action-primary)] focus:ring-2 focus:ring-[var(--color-action-primary)]/20"
                  />
                ))}
              </div>

              <Button type="submit" size="lg" loading={loading} className="w-full justify-center">
                Verify and proceed →
              </Button>

              <div className="flex items-center justify-between text-[12px] pt-2 border-t border-[var(--color-border-subtle)]">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="hover:underline"
                  style={{ color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer" }}
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpResendCountdown > 0}
                  className="hover:underline disabled:opacity-50"
                  style={{ color: "var(--color-action-primary)", background: "none", border: "none", cursor: otpResendCountdown > 0 ? "default" : "pointer" }}
                >
                  {otpResendCountdown > 0 ? `Resend code in ${otpResendCountdown}s` : "Resend code"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Back to landing page */}
      <p className="mt-8 text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
        <Link to="/" className="hover:underline" style={{ color: "var(--color-action-primary)" }}>
          ← Back to IntelliCall home
        </Link>
      </p>
    </div>
  );
}
