import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import wordmark from "../assets/datakat-wordmark.png";

export default function AuthPlaceholder({ mode }) {
  const isSignin = mode === "signin";
  return (
    <div
      className="flex min-h-screen flex-col bg-abyss px-6 font-sans"
      data-testid={isSignin ? "login-page" : "signup-page"}
    >
      <header className="py-6">
        <Link to="/" data-testid="auth-logo" aria-label="DataKat home">
          <img src={wordmark} alt="DataKat" className="h-7 w-auto" />
        </Link>
      </header>
      <main className="flex flex-1 items-center pb-24">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand">
            {isSignin ? "Sign in" : "Get started"}
          </p>
          <h1 className="mt-4 text-3xl font-medium tracking-tight text-ink md:text-4xl">
            {isSignin ? "Welcome back." : "Meet your AI data analyst."}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-mist">
            DataKat access is rolling out in stages. Authentication opens with
            product access — this page is the destination for{" "}
            {isSignin ? "signing in" : "getting started"}.
          </p>
          <Link
            to="/"
            data-testid="auth-back-home"
            className="mt-10 inline-flex items-center gap-2 text-sm text-white/70 transition-colors duration-300 hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to DataKat
          </Link>
        </div>
      </main>
    </div>
  );
}
