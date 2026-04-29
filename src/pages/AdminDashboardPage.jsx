import { Link, Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext.jsx";

/** Placeholder cards — replace `to` with real routes as you add admin sections. */
const adminSections = [
  {
    id: "rbac",
    title: "Routes & permissions",
    description:
      "See which HTTP routes have a permission row, create missing ones, and assign them to roles.",
    to: "/admin/rbac",
  },
  {
    id: "users",
    title: "Users",
    description: "Search users by email and review account flags/roles.",
    to: "/admin/users",
  },
  {
    id: "settings",
    title: "App settings",
    description: "App name, logo URL, open login / open registration.",
    to: "/admin/app",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Analytics and exports (coming soon).",
    to: null,
  },
];

export function AdminDashboardPage() {
  const { isAuthenticated, isAdmin, sessionLoading } = useUser();

  if (sessionLoading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session…</p>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Admin dashboard
      </h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Shortcuts to admin tools. Add routes and wire cards when each section is
        ready.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <li key={section.id}>
            {section.to ? (
              <Link
                to={section.to}
                className="block h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              >
                <AdminCardInner section={section} />
              </Link>
            ) : (
              <div className="h-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/50">
                <AdminCardInner section={section} />
                <p className="mt-3 text-xs font-medium text-primary">
                  Link this card when the page exists
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminCardInner({ section }) {
  return (
    <>
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {section.title}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {section.description}
      </p>
    </>
  );
}
