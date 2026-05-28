import { Link } from "react-router-dom";
import {
  Boxes,
  BriefcaseBusiness,
  FileText,
  FolderTree,
  Globe,
  MapPin,
  Shield,
  SlidersHorizontal,
  Tags,
  Truck,
  Users,
} from "lucide-react";

const defaultCategoryOrder = ["normal", "setting", "data-entry"];
const defaultCategoryLabels = {
  normal: "Normal",
  setting: "Setting",
  "data-entry": "Data entry",
};

/**
 * Shared card template:
 * { id, title, description, to, category, requiredAny, when, icon }
 */
export function CardCatalog({
  cards,
  isAuthenticated,
  hasAnyPermission,
  emptyMessage = "No cards available.",
  categoryOrder = defaultCategoryOrder,
  categoryLabels = defaultCategoryLabels,
}) {
  const visibleCards = cards.filter((card) => {
    if (card.when === "guest") {
      return !isAuthenticated;
    }
    if (card.when === "auth" && !isAuthenticated) {
      return false;
    }
    if (!Array.isArray(card.requiredAny) || card.requiredAny.length === 0) {
      return true;
    }
    return hasAnyPermission(card.requiredAny);
  });

  const groupedCards = categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category] ?? category,
      cards: visibleCards.filter(
        (card) => (card.category ?? "normal") === category,
      ),
    }))
    .filter((group) => group.cards.length > 0);

  const uncategorizedCards = visibleCards.filter(
    (card) => !categoryOrder.includes(card.category ?? "normal"),
  );

  if (groupedCards.length === 0 && uncategorizedCards.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-8">
      {groupedCards.map((group) => (
        <section key={group.category}>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {group.label}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.cards.map((card) => (
              <CardItem key={card.id} card={card} />
            ))}
          </ul>
        </section>
      ))}

      {uncategorizedCards.length > 0 ? (
        <section>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uncategorizedCards.map((card) => (
              <CardItem key={card.id} card={card} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CardItem({ card }) {
  const Icon = iconForCard(card?.icon);
  return (
    <li>
      {card.to ? (
        <Link
          to={card.to}
          className="block h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex items-start gap-3">
            {Icon ? (
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <Icon className="size-5" />
              </span>
            ) : null}
            <div className="min-w-0">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {card.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {card.description}
              </p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="h-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/50">
          <div className="flex items-start gap-3">
            {Icon ? (
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                <Icon className="size-5" />
              </span>
            ) : null}
            <div className="min-w-0">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {card.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {card.description}
              </p>
              <p className="mt-3 text-xs font-medium text-primary">
                Link this card when the page exists
              </p>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function iconForCard(icon) {
  const key = String(icon ?? "").trim();
  if (!key) return null;
  const map = {
    opportunity: BriefcaseBusiness,
    quotation: FileText,
    product: Boxes,
    productFolder: FolderTree,
    users: Users,
    rbac: Shield,
    appSettings: SlidersHorizontal,
    status: Tags,
    externalOrg: Globe,
    lineOfBusiness: SlidersHorizontal,
    marketSegment: Tags,
    vendor: Truck,
    location: MapPin,
  };
  return map[key] ?? null;
}
