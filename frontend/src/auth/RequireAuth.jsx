import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { BrandLogo } from "@/components/workspace/Brand";

export function AuthLoading({ error, onRetry }) {
  return (
    <div className="dk-auth-loading" data-testid="auth-loading">
      <BrandLogo className="dk-auth-logo" />
      {error ? (
        <div role="alert" className="dk-auth-loading-msg">
          <p>We couldn't reach DataKat. Try again.</p>
          <button type="button" className="dk-btn" onClick={onRetry} data-testid="auth-retry-button">
            Try again
          </button>
        </div>
      ) : (
        <p className="dk-support" role="status">Checking your sign-in…</p>
      )}
    </div>
  );
}

export function RequireAuth({ children }) {
  const auth = useAuth();
  const { status, verify } = auth;

  useEffect(() => {
    if (status === "unknown") verify();
  }, [status, verify]);

  if (status === "authenticated") return children;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  return <AuthLoading error={status === "error"} onRetry={verify} />;
}
