import { useUser } from "../context/UserContext.jsx";
import { CardCatalog } from "../components/CardCatalog.jsx";

const homeCards = [
  {
    id: "opportunity",
    title: "opportunity",
    description: "Manage everythinig to do with opportunity",
    to: "/opportunity",
    when: "auth",
    requiredAny: ["post_opportunity_lineofbusiness"],
    category: "normal",
  },
  {
    id: "admin-rbac",
    title: "Routes & permissions",
    description: "Manage route permissions and role mappings.",
    to: "/admin/rbac",
    when: "auth",
    requiredAny: ["get_admin_rbac_routes", "get_admin_rbac_permissions"],
    category: "setting",
  },
  {
    id: "admin-users",
    title: "Users",
    description: "Review users and role assignments.",
    to: "/admin/users",
    when: "auth",
    requiredAny: ["get_admin_users"],
    category: "setting",
  },
  {
    id: "admin-app",
    title: "App settings",
    description: "Edit branding and registration/login availability.",
    to: "/admin/app",
    when: "auth",
    requiredAny: ["get_admin_app"],
    category: "setting",
  },
  {
    id: "status-manager",
    title: "Status manager",
    description: "Manage status list by category for form dropdowns.",
    to: "/data-entry/status-manager",
    when: "auth",
    requiredAny: [
      "get_dataentry_status",
      "post_dataentry_status",
      "get_admin_status",
      "post_admin_status",
    ],
    category: "data-entry",
  },
  {
    id: "external-org",
    title: "External Organization",
    description: "Create and manage external organizations.",
    to: "/data-entry/external-org",
    when: "auth",
    requiredAny: [
      "get_dataentry_externalorg",
      "post_dataentry_externalorg",
      "get_opportunity_externalorg",
      "post_opportunity_externalorg",
    ],
    category: "data-entry",
  },
  {
    id: "line-of-business",
    title: "Line of business data entry",
    description: "Create and maintain line of business records.",
    to: "/data-entry/line-of-business",
    when: "auth",
    requiredAny: [
      "get_dataentry_lineofbusiness",
      "post_dataentry_lineofbusiness",
      "get_opportunity_lineofbusiness",
      "post_opportunity_lineofbusiness",
    ],
    category: "data-entry",
  },
  {
    id: "market-segment",
    title: "Market segment data entry",
    description: "Create and maintain market segment records.",
    to: "/data-entry/market-segment",
    when: "auth",
    requiredAny: [
      "get_dataentry_marketsegment",
      "post_dataentry_marketsegment",
      "get_opportunity_marketsegment",
      "post_opportunity_marketsegment",
    ],
    category: "data-entry",
  },
  {
    id: "vendor",
    title: "Vendor data entry",
    description: "Create, maintain, and import vendor records.",
    to: "/data-entry/vendor",
    when: "auth",
    requiredAny: [
      "get_dataentry_vendor",
      "post_dataentry_vendor",
      "post_dataentry_vendor_import",
    ],
    category: "data-entry",
  },
  {
    id: "location-manager",
    title: "Location data entry",
    description: "Manage provinsi, kabupaten, kecamatan and run auto sync.",
    to: "/location",
    when: "auth",
    requiredAny: ["get_location", "post_location", "post_location_sync"],
    category: "data-entry",
  },
];

export function HomePage() {
  const { isAuthenticated, email, isSuperAdmin, hasAnyPermission } = useUser();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Home
      </h1>
      <p className="mb-6 text-zinc-600 dark:text-zinc-400">
        {isAuthenticated
          ? `Signed in${email ? ` as ${email}` : ""}${isSuperAdmin ? " (super admin)" : ""}. Session validated with the server.`
          : "You are not logged in."}
      </p>
      <CardCatalog
        cards={homeCards}
        isAuthenticated={isAuthenticated}
        hasAnyPermission={hasAnyPermission}
        emptyMessage="No cards available for your current permissions."
      />
    </div>
  );
}
