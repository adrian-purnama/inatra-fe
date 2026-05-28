import { useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { apiGet, apiPatch, apiPost, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

function sortNodes(list) {
  return [...list].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}

function FolderTreePicker({ nodes, value, onChange }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const tree = useMemo(() => {
    const byParent = new Map();
    for (const n of nodes ?? []) {
      const pid = n.parentId ?? null;
      const list = byParent.get(pid) ?? [];
      list.push(n);
      byParent.set(pid, list);
    }
    for (const [k, v] of byParent.entries()) byParent.set(k, sortNodes(v));
    return { byParent };
  }, [nodes]);

  useEffect(() => {
    // Expand roots by default; also expand the current selected node's ancestors if present.
    setExpandedIds((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set();
      for (const r of tree.byParent.get(null) ?? []) next.add(String(r.id));
      return next;
    });
  }, [tree]);

  function isExpanded(id) {
    return expandedIds.has(String(id));
  }

  function toggleExpanded(id) {
    const key = String(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderNode(n, depth) {
    const children = tree.byParent.get(n.id) ?? [];
    const hasChildren = children.length > 0;
    const expanded = isExpanded(n.id);
    const indent = depth * 18;
    const selected = String(value || "") === String(n.id);
    return (
      <div key={n.id} className="space-y-0.5">
        <div
          className={`flex items-center gap-1 rounded-md px-1 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
            selected ? "bg-primary/10 ring-1 ring-primary/30 dark:bg-primary/15" : ""
          }`}
          style={{ paddingLeft: indent }}
        >
          <button
            type="button"
            onClick={() => toggleExpanded(n.id)}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded text-zinc-600 dark:text-zinc-300"
            aria-label={expanded ? "Collapse folder" : "Expand folder"}
            title={hasChildren ? (expanded ? "Collapse" : "Expand") : "No subfolders"}
          >
            <span
              className={`text-xs transition-transform ${expanded ? "rotate-90" : ""} ${
                hasChildren ? "" : "opacity-30"
              }`}
            >
              ▶
            </span>
          </button>
          <FolderOpen
            className="size-4 shrink-0 text-amber-600/80 dark:text-amber-400/80"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => onChange(String(n.id))}
            className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left ${
              selected ? "text-primary" : "text-zinc-800 dark:text-zinc-200"
            }`}
          >
            <span className="truncate text-sm font-medium">
              {n.name}{" "}
              <span className="font-mono text-[11px] font-normal text-zinc-500">[{n.code3}]</span>
            </span>
            {hasChildren ? (
              <span className="shrink-0 text-xs text-zinc-500">{children.length}</span>
            ) : null}
          </button>
        </div>
        {hasChildren && expanded ? (
          <div
            className="space-y-0.5 border-l border-zinc-200 dark:border-zinc-700"
            style={{ marginLeft: indent + 8, paddingLeft: 8 }}
          >
            {children.map((c) => renderNode(c, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  }

  const roots = tree.byParent.get(null) ?? [];
  return (
    <div className="max-h-72 overflow-auto rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
      {roots.length === 0 ? (
        <p className="px-2 py-2 text-sm text-zinc-500">No folders yet.</p>
      ) : (
        roots.map((n) => renderNode(n, 0))
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {{ id?: string; name?: string; folderId?: string | null; sku?: string; skuHistory?: string[] } | null} [props.initial]
 * @param {() => Promise<void> | void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function ProductForm({ initial = null, onSuccess, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [folderId, setFolderId] = useState(initial?.folderId ?? "");
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    setName(initial?.name ?? "");
    setUnit(initial?.unit ?? "");
    setFolderId(initial?.folderId ?? "");
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFolders(true);
      try {
        const res = await apiGet(`${paths.folders("product")}?${new URLSearchParams({ includeInactive: "true" })}`);
        if (!cancelled) setFolders(res?.data?.items ?? []);
      } catch {
        if (!cancelled) setFolders([]);
      } finally {
        if (!cancelled) setLoadingFolders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const skuHistory = useMemo(
    () => (Array.isArray(initial?.skuHistory) ? initial.skuHistory : []),
    [initial],
  );

  async function onSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setSubmitting(true);
    try {
      const body = { name: name.trim(), folderId, unit: unit.trim() };
      if (isEdit) {
        await apiPatch(`${paths.dataEntryProduct}/${initial.id}`, body);
      } else {
        await apiPost(paths.dataEntryProduct, body);
      }
      await onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not save product");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formErr ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </p>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Product name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Asus B650"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Unit
        </label>
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={inputClass}
          placeholder="pcs, set, box…"
          maxLength={32}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Default unit for this SKU — auto-filled on opportunity and quotation lines.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Product folder
        </label>
        {loadingFolders ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-200">
            Loading folders…
          </p>
        ) : (
          <FolderTreePicker nodes={folders} value={folderId} onChange={setFolderId} />
        )}
        <p className="mt-1 text-xs text-zinc-500">
          SKU is auto-generated from folder path + counter.
        </p>
      </div>

      {isEdit ? (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">SKU</p>
            <span className="font-mono text-xs text-zinc-800 dark:text-zinc-100">
              {initial?.sku ?? "-"}
            </span>
          </div>
          {skuHistory.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                SKU history
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-zinc-700 dark:text-zinc-200">
                {skuHistory.slice().reverse().map((s, idx) => (
                  <li key={`${s}-${idx}`} className="font-mono">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving..." : isEdit ? "Save product" : "Create product"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

