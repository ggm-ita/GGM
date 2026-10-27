import { db, isSupabaseConfigured } from "@/api/supabaseClient";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { safeReturnTo } from "@/lib/authReturnTo";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* "dilan.fernando@ggm.it" -> "Dilan". Only used to greet the person who typed
   the address; nothing is looked up on the server at this step. */
function localWords(email) {
  return String(email)
    .split("@")[0]
    .split(/[._\-+]+/)
    .filter(Boolean);
}

function greetingName(email) {
  const word = localWords(email)[0] || "";
  return word ? word.replace(/^\w/, (c) => c.toUpperCase()) : "";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Step 1 collects the address, then the card turns over to step 2.
  const [step, setStep] = useState("email");
  // Post-login destination (a page may send users here with returnTo so its
  // flow can resume). Same-origin paths only.
  const returnTo = safeReturnTo();

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const name = useMemo(() => greetingName(email), [email]);
  const initials = useMemo(() => {
    const letters = localWords(email)
      .slice(0, 2)
      .map((word) => word[0])
      .join("");
    return (letters || "?").toUpperCase();
  }, [email]);

  const onPasswordStep = step === "password";

  /* Move the caret to the field the user is looking at once the card settles. */
  useEffect(() => {
    const id = window.setTimeout(() => {
      const target = onPasswordStep ? passwordRef.current : emailRef.current;
      target?.focus({ preventScroll: true });
    }, 320);
    return () => window.clearTimeout(id);
  }, [onPasswordStep]);

  const handleEmailStep = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setEmail(value);
    setStep("password");
  };

  const handleBack = () => {
    setError("");
    setPassword("");
    setShowPassword(false);
    setStep("email");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await db.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      /* Always the same message: the raw backend error would reveal whether
         an address has an account. Configuration problems stay visible. */
      setError(isSupabaseConfigured ? "Invalid email or password." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const errorAlert = error && (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Sign in to follow up your retailers"
      footer="Accounts are created by an administrator — contact yours for access."
    >
      {/* Step dots */}
      <div className="mb-5 flex items-center gap-2" aria-hidden="true">
        <span
          className={`h-1 flex-1 rounded-full transition-colors ${
            onPasswordStep ? "bg-border" : "bg-primary"
          }`}
        />
        <span
          className={`h-1 flex-1 rounded-full transition-colors ${
            onPasswordStep ? "bg-primary" : "bg-border"
          }`}
        />
      </div>

      <div className="flip-scene">
        <div className={`flip-card ${onPasswordStep ? "is-flipped" : ""}`}>
          {/* ------------------------ Step 1: email ------------------------ */}
          <div
            className="flip-face"
            aria-hidden={onPasswordStep || undefined}
            inert={onPasswordStep ? "" : undefined}
          >
            {errorAlert}
            <form onSubmit={handleEmailStep} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="email"
                    ref={emailRef}
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full font-medium shadow-lg shadow-primary/20"
              >
                Continue
              </Button>
            </form>
          </div>

          {/* ---------------------- Step 2: password ---------------------- */}
          <div
            className="flip-face flip-face-back"
            aria-hidden={onPasswordStep ? undefined : true}
            inert={onPasswordStep ? undefined : ""}
          >
            {errorAlert}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 p-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                >
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {name ? `Hi ${name}, welcome back` : "Welcome back"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="ml-auto flex-none rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full font-medium shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Logging in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Use a different email
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
