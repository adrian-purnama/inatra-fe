import { Link, Navigate } from "react-router-dom";
import { useUser } from "../../context/UserContext.jsx";
import { CardCatalog } from "../../components/CardCatalog.jsx";

const opportunityCards = [
  {
    id: "opportunity-data-entry",
    title: "Opportunity",
    description: "Create and maintain opportunity records with step form.",
    category: "normal",
    when: "auth",
    requiredAny: ["post_opportunity"],
    to: "/opportunity/manage",
  },
  {
    id: "opportunity-reports",
    title: "Opportunity reports",
    description: "View opportunity insights and exports.",
    category: "normal",
    when: "auth",
    to: null,
  },
  {
    id: "quotation-manage",
    title: "Quotation",
    description: "Manage quotation drafts, approvals, and revisions.",
    category: "normal",
    when: "auth",
    requiredAny: ["get_quotation", "post_quotation"],
    to: "/quotation/manage",
  },
];

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

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Opportunity
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Folder page for opportunity features and data entry tools.
          </p>
        </div>
        <Link
          to="/"
          className="text-sm font-medium text-primary transition-colors hover:text-primary-2"
        >
          Back to home
        </Link>
      </div>

      <CardCatalog
        cards={opportunityCards}
        isAuthenticated={isAuthenticated}
        hasAnyPermission={hasAnyPermission}
        emptyMessage="No opportunity cards available for your current permissions."
      />
    </div>
  );
}
