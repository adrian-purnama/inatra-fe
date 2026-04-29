import { useState } from "react";
import { apiPost } from "../lib/api.js";
import { useApp } from "../context/AppContext.jsx";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

const btnPrimaryClass =
  "inline-flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-2 active:bg-primary-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-zinc-950";

const btnSecondaryClass =
  "inline-flex w-full justify-center rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 active:bg-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-zinc-950";

export function RegisterForm() {
  const { paths } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [otpHint, setOtpHint] = useState("");

  async function sendOtp(e) {
    e.preventDefault();
    setError("");
    setOtpHint("");
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await apiPost(paths.authSendOtp, { email: email.trim() });
      setOtpHint(res?.message || "Check your inbox for the code.");
    } catch (err) {
      setError(err?.message || "Could not send code");
    } finally {
      setOtpLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);
    try {
      const res = await apiPost(paths.authRegister, {
        email: email.trim(),
        password,
        otp: otp.trim(),
      });
      setOk(res?.message || "Account created");
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Create account
      </h2>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
          {ok}
        </p>
      ) : null}
      {otpHint ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{otpHint}</p>
      ) : null}

      <label className="block text-left">
        <span className={labelClass}>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <div>
        <button
          type="button"
          className={btnSecondaryClass}
          onClick={sendOtp}
          disabled={otpLoading}
        >
          {otpLoading ? "Sending…" : "Send verification code"}
        </button>
      </div>

      <label className="block text-left">
        <span className={labelClass}>Verification code (6 digits)</span>
        <input
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className={inputClass}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
        />
      </label>

      <label className="block text-left">
        <span className={labelClass}>Password (8–72 characters)</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <button type="submit" className={btnPrimaryClass} disabled={loading}>
        {loading ? "Creating account…" : "Register"}
      </button>
    </form>
  );
}
