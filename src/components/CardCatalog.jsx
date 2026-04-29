import { Link } from "react-router-dom";

const defaultCategoryOrder = ["normal", "setting", "data-entry"];
const defaultCategoryLabels = {
  normal: "Normal",
  setting: "Setting",
  "data-entry": "Data entry",
};

/**
 * Shared card template:
 * { id, title, description, to, category, requiredAny, when }
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
  return (
    <li>
      {card.to ? (
        <Link
          to={card.to}
          className="block h-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
        >
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {card.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {card.description}
          </p>
        </Link>
      ) : (
        <div className="h-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-600 dark:bg-zinc-900/50">
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
      )}
    </li>
  );
}
