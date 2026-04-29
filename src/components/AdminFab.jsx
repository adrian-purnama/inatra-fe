import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext.jsx";

/** Fixed shortcut to home admin cards — only when admin + super-admin. */
export function AdminFab() {
  const { isAuthenticated, isAdmin, isSuperAdmin } = useUser();

  if (!isAuthenticated || (!isAdmin && !isSuperAdmin)) {
    return null;
  }

  return (
    <Link
      to="/"
      className="fixed bottom-6 right-6 z-50 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-2 active:bg-primary-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 dark:ring-offset-zinc-950"
    >
      Admin
    </Link>
  );
}
