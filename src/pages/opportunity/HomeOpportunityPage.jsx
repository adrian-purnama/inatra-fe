import { Link, Navigate } from "react-router-dom";
import { useUser } from "../../context/UserContext.jsx";
import { CardCatalog } from "../../components/CardCatalog.jsx";

export function HomeOpportunityPage() {
  const { isAuthenticated, sessionLoading, hasAnyPermission } = useUser();

  if (sessionLoading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (hasAnyPermission(["get_opportunity", "post_opportunity"])) {
    return <Navigate to="/opportunity/manage" replace />;
  }
  return <Navigate to="/" replace />;
}
