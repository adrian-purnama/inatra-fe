import { Link, Navigate } from "react-router-dom";
import { ProfileForm } from "../forms/ProfileForm.jsx";
import { useUser } from "../context/UserContext.jsx";

export function ProfilePage() {
  const { isAuthenticated, sessionLoading } = useUser();

  if (sessionLoading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session…</p>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="w-full">
      <p className="mb-4">
        <Link
          to="/"
          className="text-sm font-medium text-primary hover:text-primary-2"
        >
          ← Home
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Profile
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Update your name and e-sign.
      </p>
      <div className="max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <ProfileForm />
      </div>
    </div>
  );
}
