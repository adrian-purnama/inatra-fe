import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen, Package, Search, X } from "lucide-react";
import { Modal } from "./Modal.jsx";
import { apiGet, paths } from "../lib/api.js";

function sortNodes(list) {
  return [...list].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}

/**
 * Product picker that opens a modal with the product folder tree.
 *
 * @param {object} props
 * @param {string} [props.value] - Selected product id
 * @param {string} [props.sku] - Display fallback SKU
 * @param {string} [props.name] - Display fallback product name
 * @param {(selection: { productId: string; sku: string; name: string } | null) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.allowClear] - Allow "free text / no SKU"
 * @param {string} [props.className]
 */
export function ProductSkuPicker({
  value = "",
  sku = "",
  name = "",
  onChange,
  disabled = false,
  allowClear = true,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [all, setAll] = useState([]);
  const [leafItemsByFolderId, setLeafItemsByFolderId] = useState({});
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [filter, setFilter] = useState("");

  const loadTree = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ includeInactive: "true", includeItems: "true" });
      const res = await apiGet(`${paths.folders("product")}?${qs.toString()}`);
      const items = res?.data?.items ?? [];
      setAll(items);
      setLeafItemsByFolderId(res?.data?.leafItems ?? {});
      setExpandedIds((prev) => {
        if (prev.size > 0) return prev;
        const next = new Set();
        for (const n of items) {
          if (!n.parentId) next.add(String(n.id));
        }
        return next;
      });
    } catch (e) {
      setErr(e?.message ?? "Failed to load product folders");
      setAll([]);
      setLeafItemsByFolderId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadTree();
  }, [open, loadTree]);

  const tree = useMemo(() => {
    const nodes = Array.isArray(all) ? all : [];
    const byParent = new Map();
    for (const n of nodes) {
      const pid = n.parentId ?? null;
      const list = byParent.get(pid) ?? [];
      list.push(n);
      byParent.set(pid, list);
    }
    for (const [k, v] of byParent.entries()) byParent.set(k, sortNodes(v));
    return { byParent };
  }, [all]);

  const productById = useMemo(() => {
    const map = new Map();
    for (const list of Object.values(leafItemsByFolderId)) {
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        map.set(String(p.id), {
          id: String(p.id),
          sku: String(p.sku ?? ""),
          name: String(p.name ?? ""),
          unit: String(p.unit ?? ""),
        });
      }
    }
    return map;
  }, [leafItemsByFolderId]);

  const allProducts = useMemo(() => {
    const list = [...productById.values()];
    return list.sort((a, b) =>
      `${a.sku} ${a.name}`.localeCompare(`${b.sku} ${b.name}`, undefined, { sensitivity: "base" }),
    );
  }, [productById]);

  const filteredProducts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return [];
    return allProducts.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        `${p.sku} ${p.name}`.toLowerCase().includes(q),
    );
  }, [allProducts, filter]);

  const selectedId = String(value ?? "");
  const selectedFromTree = selectedId ? productById.get(selectedId) : null;
  const displayLabel = selectedId
    ? selectedFromTree
      ? `${selectedFromTree.sku} — ${selectedFromTree.name}`
      : sku
        ? `${sku}${name ? ` — ${name}` : ""}`
        : "Product selected"
    : allowClear
      ? "Free text (no SKU)"
      : "Select product…";

  function toggleExpanded(id) {
    const key = String(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectProduct(p) {
    onChange?.({
      productId: String(p.id),
      sku: String(p.sku ?? ""),
      name: String(p.name ?? ""),
      unit: String(p.unit ?? ""),
    });
    setOpen(false);
    setFilter("");
  }

  function clearSelection() {
    onChange?.(null);
    setOpen(false);
    setFilter("");
  }

  function renderProductRow(p, depth, { isSelected = false } = {}) {
    const indent = depth * 18;
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => selectProduct(p)}
        className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-primary/10 dark:hover:bg-primary/20 ${
          isSelected ? "bg-primary/15 ring-1 ring-primary/40 dark:bg-primary/25" : ""
        }`}
        style={{ paddingLeft: indent + 8 }}
      >
        <Package className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
          <span className="font-mono text-xs text-zinc-500">
            {p.sku}
            {p.unit ? ` · ${p.unit}` : ""}
          </span>
        </span>
      </button>
    );
  }

  function renderNode(n, depth) {
    const children = tree.byParent.get(n.id) ?? [];
    const hasChildren = children.length > 0;
    const expanded = expandedIds.has(String(n.id));
    const indent = depth * 18;
    const leafItems = leafItemsByFolderId[String(n.id)] ?? [];
    const hasProducts = !hasChildren && Array.isArray(leafItems) && leafItems.length > 0;

    return (
      <div key={n.id} className="space-y-0.5">
        <div
          className="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          style={{ paddingLeft: indent }}
        >
          <button
            type="button"
            onClick={() => toggleExpanded(n.id)}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded text-zinc-600 dark:text-zinc-300"
            aria-label={expanded ? "Collapse folder" : "Expand folder"}
          >
            <span className={`text-xs transition-transform ${expanded ? "rotate-90" : ""}`}>
              ▶
            </span>
          </button>
          <FolderOpen className="size-4 shrink-0 text-amber-600/80 dark:text-amber-400/80" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {n.name}{" "}
              <span className="font-mono text-[11px] font-normal text-zinc-500">[{n.code3}]</span>
            </p>
          </div>
        </div>

        {expanded && hasChildren ? (
          <div
            className="space-y-0.5 border-l border-zinc-200 dark:border-zinc-700"
            style={{ marginLeft: indent + 8, paddingLeft: 8 }}
          >
            {children.map((c) => renderNode(c, depth + 1))}
          </div>
        ) : null}

        {expanded && hasProducts ? (
          <div
            className="space-y-0.5 border-l border-zinc-200 dark:border-zinc-700"
            style={{ marginLeft: indent + 8, paddingLeft: 4 }}
          >
            {leafItems.map((p) =>
              renderProductRow(p, depth + 1, { isSelected: String(p.id) === selectedId }),
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-900 shadow-sm transition-colors hover:border-primary/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 ${className}`}
      >
        <span className={`min-w-0 truncate ${!selectedId ? "text-zinc-500" : ""}`}>{displayLabel}</span>
        <span className="shrink-0 text-xs text-zinc-400">Browse…</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Select product (SKU)">
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              aria-hidden
            />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by SKU or name…"
              className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-9 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              autoFocus
            />
            {filter ? (
              <button
                type="button"
                onClick={() => setFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {err ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              {err}
            </p>
          ) : null}

          <div className="max-h-[min(24rem,55vh)] overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
            {loading ? (
              <p className="px-2 py-4 text-center text-sm text-zinc-500">Loading folders…</p>
            ) : filter.trim() ? (
              filteredProducts.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredProducts.map((p) =>
                    renderProductRow(p, 0, { isSelected: String(p.id) === selectedId }),
                  )}
                </div>
              ) : (
                <p className="px-2 py-4 text-center text-sm text-zinc-500">No products match your search.</p>
              )
            ) : (tree.byParent.get(null) ?? []).length > 0 ? (
              <div className="space-y-0.5">
                {(tree.byParent.get(null) ?? []).map((n) => renderNode(n, 0))}
              </div>
            ) : (
              <p className="px-2 py-4 text-center text-sm text-zinc-500">
                No product folders yet. Add folders and products in Product data entry.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            {allowClear ? (
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Free text (no SKU)
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
