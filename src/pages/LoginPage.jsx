import { Link } from "react-router-dom";
import { AuthBranding } from "../components/AuthBranding.jsx";
import { LoginForm } from "../forms/LoginForm.jsx";
import { useApp } from "../context/AppContext.jsx";

export function LoginPage() {
  const { branding, brandingLoaded } = useApp();

  if (!brandingLoaded) {
    return (
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  const loginClosed = branding != null && branding.openLogin === false;
  const registerOpen = branding == null || branding.openRegister !== false;

  return (
    <div className="mx-auto w-full max-w-md">
      <AuthBranding />
      {loginClosed ? (
        <>
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-medium">Sign-in is not open</p>
            <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
              Contact an administrator if you need access.
            </p>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link
              to="/"
              className="font-medium text-primary transition-colors hover:text-primary-2"
            >
              Back to home
            </Link>
          </p>
        </>
      ) : (
        <>
          <LoginForm />
          {registerOpen ? (
            <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
              No account?{" "}
              <Link
                to="/register"
                className="font-medium text-primary transition-colors hover:text-primary-2"
              >
                Register
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
              Need an account? Registration is closed — contact an
              administrator.
            </p>
          )}
        </>
      )}
    </div>
  );
}
