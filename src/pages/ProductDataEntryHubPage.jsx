import { Link, Navigate } from "react-router-dom";
import { CardCatalog } from "../components/CardCatalog.jsx";
import { useUser } from "../context/UserContext.jsx";

const productEntryCards = [
  {
    id: "product-folder",
    title: "Product folders",
    description: "Manage product folder hierarchy (SKU codes per tier).",
    to: "/data-entry/product-folder",
    icon: "productFolder",
    when: "auth",
    requiredAny: [
      "get_folder_node",
      "post_folder_node",
      "patch_folder_node",
      "delete_folder_node",
      "get_folders_namespace",
      "post_folders_namespace",
      "patch_folders_namespace_id",
      "delete_folders_namespace_id",
    ],
    category: "data-entry",
  },
  {
    id: "product",
    title: "Product data entry",
    description: "Create products and auto-generate SKU from folder + counter.",
    to: "/data-entry/product/items",
    icon: "product",
    when: "auth",
    requiredAny: [
      "get_dataentry_product",
      "post_dataentry_product",
      "patch_dataentry_product_id",
      "delete_dataentry_product_id",
    ],
    category: "data-entry",
  },
];

export function ProductDataEntryHubPage() {
  const { isAuthenticated, sessionLoading, hasAnyPermission } = useUser();

  if (sessionLoading) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="w-full">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <Link to="/" className="text-primary underline-offset-2 hover:underline">
          ← Home
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Product data entry
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Manage product folders and products.
      </p>
      <CardCatalog
        cards={productEntryCards}
        isAuthenticated={isAuthenticated}
        hasAnyPermission={hasAnyPermission}
        emptyMessage="No cards available for your current permissions."
        categoryOrder={["data-entry"]}
        categoryLabels={{ "data-entry": "Product" }}
      />
    </div>
  );
}

