import { useUser } from "../context/UserContext.jsx";
import { CardCatalog } from "../components/CardCatalog.jsx";

const homeCards = [
  {
    id: "opportunity",
    title: "opportunity",
    description: "Manage everythinig to do with opportunity",
    to: "/opportunity",
    icon: "opportunity",
    when: "auth",
    requiredAny: ["get_opportunity"],
    category: "normal",
  },
  {
    id: "admin-rbac",
    title: "Routes & permissions",
    description: "Manage route permissions and role mappings.",
    to: "/admin/rbac",
    icon: "rbac",
    when: "auth",
    requiredAny: ["get_admin_rbac_routes", "get_admin_rbac_permissions"],
    category: "setting",
  },
  {
    id: "admin-users",
    title: "Users",
    description: "Review users and role assignments.",
    to: "/admin/users",
    icon: "users",
    when: "auth",
    requiredAny: ["get_admin_users"],
    category: "setting",
  },
  {
    id: "admin-app",
    title: "App settings",
    description: "Edit branding and registration/login availability.",
    to: "/admin/app",
    icon: "appSettings",
    when: "auth",
    requiredAny: ["get_admin_app"],
    category: "setting",
  },
  {
    id: "status-manager",
    title: "Status manager",
    description: "Manage status list by category for form dropdowns.",
    to: "/data-entry/status-manager",
    icon: "status",
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
    icon: "externalOrg",
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
    icon: "lineOfBusiness",
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
    icon: "marketSegment",
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
    icon: "vendor",
    when: "auth",
    requiredAny: [
      "get_dataentry_vendor",
      "post_dataentry_vendor",
      "post_dataentry_vendor_import",
    ],
    category: "data-entry",
  },
  {
    id: "product-entry",
    title: "Product data entry",
    description: "Manage product folders and products (auto SKU).",
    to: "/data-entry/product",
    icon: "product",
    when: "auth",
    requiredAny: [
      "get_folder_node",
      "post_folder_node",
      "patch_folder_node",
      "delete_folder_node",
      "get_dataentry_product",
      "post_dataentry_product",
      "patch_dataentry_product_id",
      "delete_dataentry_product_id",
    ],
    category: "data-entry",
  },
  {
    id: "location-manager",
    title: "Location data entry",
    description: "Manage provinsi, kabupaten, kecamatan and run auto sync.",
    to: "/location",
    icon: "location",
    when: "auth",
    requiredAny: ["get_location", "post_location", "post_location_sync"],
    category: "data-entry",
  },
  {
    id: "quotation",
    title: "Quotation",
    description: "Create, revise, approve, and track quotation workflow.",
    to: "/quotation/manage",
    icon: "quotation",
    when: "auth",
    requiredAny: ["get_quotation", "post_quotation"],
    category: "normal",
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
