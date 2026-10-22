import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/api";
import { useAuth } from "@/auth/AuthContext";
import { AuthLoading } from "@/auth/RequireAuth";
import { BrandLogo } from "@/components/workspace/Brand";
import { PreviewIndicator } from "@/components/workspace/Preview";
import { CatMotif } from "@/components/workspace/CatMotif";
import { MARKETING_URL } from "@/config";

const TRANSPORT = "We couldn't reach DataKat. Try again.";

function PasswordField({ value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="dk-field">
      <label htmlFor="login-password">Password</label>
      <div className="dk-password">
        <input
          id="login-password"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="dk-input"
          data-testid="login-password-input"
        />
        <button
          type="button"
          className="dk-pw-toggle"
          aria-pressed={show}
          aria-controls="login-password"
          onClick={() => setShow((s) => !s)}
          data-testid="login-password-toggle"
        >
          {show ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          <span className="sr-only">Show password</span>
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const auth = useAuth();
  const [initialDone, setInitialDone] = useState(auth.status === "unauthenticated" || auth.status === "error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [waitUntil, setWaitUntil] = useState(0);
  const busy = useRef(false);
  const { verify } = auth;

  useEffect(() => {
    if (!initialDone) verify().finally(() => setInitialDone(true));
  }, [initialDone, verify]);

  useEffect(() => {
    if (!waitUntil) return undefined;
    const t = setTimeout(() => setWaitUntil(0), Math.max(0, waitUntil - Date.now()));
    return () => clearTimeout(t);
  }, [waitUntil]);

  if (auth.status === "authenticated") return <Navigate to="/app" replace />;
  if (!initialDone) return <AuthLoading />;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy.current || waitUntil) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.login({ email, password });
      if (r.status >= 200 && r.status < 300) {
        const v = await verify();
        if (!v.ok) setError(v.reason === "unauthenticated" ? "We couldn't confirm your sign-in. Try again." : TRANSPORT);
      } else if (r.status === 401) setError("Invalid email or password.");
      else if (r.status === 429) {
        setError("Too many sign-in attempts. Try again shortly.");
        if (r.retryAfter) setWaitUntil(Date.now() + r.retryAfter * 1000);
      } else setError("We couldn't sign you in. Try again.");
    } catch {
      setError(TRANSPORT);
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="dk-login-page" data-testid="login-page">
      <div className="dk-login-top">
        <PreviewIndicator scope="login" testId="preview-indicator" />
      </div>
      <main className="dk-login">
        <div className="dk-login-brand">
          <BrandLogo className="dk-login-logo" />
          <CatMotif size={40} />
        </div>
        <h1 className="dk-headline">Sign in to DataKat</h1>
        <p className="dk-login-support">Your AI Data Analyst.</p>
        {auth.sessionEnded && !error && (
          <p className="dk-inline-notice dk-inline-warning" data-testid="session-ended-notice">Your session has ended. Sign in to continue.</p>
        )}
        <form className="dk-login-form" onSubmit={onSubmit} data-testid="login-form">
          <div className="dk-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="dk-input" data-testid="login-email-input" />
          </div>
          <PasswordField value={password} onChange={setPassword} />
          {error && <p role="alert" className="dk-form-error" data-testid="login-error">{error}</p>}
          <button type="submit" className="dk-btn dk-btn-primary dk-btn-block" disabled={submitting || Boolean(waitUntil)} data-testid="login-submit-button">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="dk-support">Need access? Contact your DataKat administrator.</p>
        <a href={MARKETING_URL} className="dk-text-link" data-testid="back-to-datakat-link">Back to DataKat</a>
      </main>
    </div>
  );
}
