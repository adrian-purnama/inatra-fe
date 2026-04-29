import { Link } from "react-router-dom";
import { AuthBranding } from "../components/AuthBranding.jsx";
import { RegisterForm } from "../forms/RegisterForm.jsx";
import { useApp } from "../context/AppContext.jsx";

export function RegisterPage() {
  const { branding, brandingLoaded } = useApp();

  if (!brandingLoaded) {
    return (
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (branding != null && branding.openRegister === false) {
    return (
      <div className="mx-auto w-full max-w-md">
        <AuthBranding />
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">Registration is not open</p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
            Contact an administrator if you need an account.
          </p>
        </div>
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            to="/"
            className="font-medium text-primary transition-colors hover:text-primary-2"
          >
            Back to home
          </Link>
          {" · "}
          <Link
            to="/login"
            className="font-medium text-primary transition-colors hover:text-primary-2"
          >
            Log in
          </Link>
        </p>
      </div>
    );
  }

  const loginOpen = branding == null || branding.openLogin !== false;

  return (
    <div className="mx-auto w-full max-w-md">
      <AuthBranding />
      <RegisterForm />
      {loginOpen ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary transition-colors hover:text-primary-2"
          >
            Log in
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Sign-in may be limited — contact an administrator.
        </p>
      )}
    </div>
  );
}
