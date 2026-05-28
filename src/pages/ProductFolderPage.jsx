import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen, Package } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Modal } from "../components/Modal.jsx";
import { useUser } from "../context/UserContext.jsx";
import { apiDelete, apiGet, apiPatch, apiPost, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

function sortNodes(list) {
  return [...list].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}

export function ProductFolderPage() {
  const { isAuthenticated, sessionLoading } = useUser();
  const [all, setAll] = useState([]);
  const [leafItemsByFolderId, setLeafItemsByFolderId] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState(null);
  const [createName, setCreateName] = useState("");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [renamePreviewLoading, setRenamePreviewLoading] = useState(false);
  const [renameApplyLoading, setRenameApplyLoading] = useState(false);
  const [renamePreviewErr, setRenamePreviewErr] = useState("");
  const [renamePreview, setRenamePreview] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ includeInactive: "true", includeItems: "true" });
      const res = await apiGet(`${paths.folders("product")}?${qs.toString()}`);
      setAll(res?.data?.items ?? []);
      setLeafItemsByFolderId(res?.data?.leafItems ?? {});
    } catch (e) {
      setErr(e?.message ?? "Failed to load folders");
      setAll([]);
      setLeafItemsByFolderId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

  useEffect(() => {
    // Expand roots by default.
    setExpandedIds((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set();
      for (const r of tree.byParent.get(null) ?? []) next.add(String(r.id));
      return next;
    });
  }, [tree]);

  async function doCreate() {
    const name = createName.trim();
    if (!name) return;
    setErr("");
    try {
      await apiPost(paths.folders("product"), {
        parentId: createParentId,
        name,
        isActive: true,
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateParentId(null);
      await loadAll();
    } catch (e) {
      setErr(e?.message ?? "Failed to create folder");
    }
  }

  async function doRenamePreview() {
    if (!renameItem?.id) return;
    const name = renameName.trim();
    if (!name) return;
    setRenamePreviewErr("");
    setRenamePreview(null);
    setRenamePreviewLoading(true);
    try {
      const res = await apiPost(paths.foldersRenamePreview("product", renameItem.id), { name });
      setRenamePreview(res?.data ?? null);
    } catch (e) {
      setRenamePreviewErr(e?.message ?? "Failed to preview SKU changes");
    } finally {
      setRenamePreviewLoading(false);
    }
  }

  async function doRenameApply() {
    if (!renameItem?.id) return;
    const name = renameName.trim();
    if (!name) return;
    setRenamePreviewErr("");
    setRenameApplyLoading(true);
    try {
      await apiPost(paths.foldersRenameApply("product", renameItem.id), { name });
      setRenameOpen(false);
      setRenameItem(null);
      setRenamePreview(null);
      await loadAll();
    } catch (e) {
      setRenamePreviewErr(e?.message ?? "Failed to rename folder");
    } finally {
      setRenameApplyLoading(false);
    }
  }

  async function doDelete() {
    if (!deleteItem?.id) return;
    setDeleting(true);
    setErr("");
    try {
      await apiDelete(`${paths.folders("product")}/${deleteItem.id}`);
      setDeleteOpen(false);
      setDeleteItem(null);
      await loadAll();
    } catch (e) {
      setErr(e?.message ?? "Failed to delete folder");
    } finally {
      setDeleting(false);
    }
  }

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
    const leafItems = leafItemsByFolderId[String(n.id)] ?? [];
    return (
      <div key={n.id} className="space-y-1">
        <div className="relative">
          {depth > 0 ? (
            <div
              className="pointer-events-none absolute left-0 top-1/2 h-px bg-zinc-200 dark:bg-zinc-700"
              style={{ width: 12, transform: "translateY(-50%)", marginLeft: indent - 12 }}
            />
          ) : null}
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            style={{ paddingLeft: indent }}
          >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => toggleExpanded(n.id)}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded text-zinc-600 dark:text-zinc-300"
              aria-label={expanded ? "Collapse folder" : "Expand folder"}
              title={hasChildren ? (expanded ? "Collapse" : "Expand") : "Expand"}
            >
              <span className={`text-xs transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
            </button>
            <FolderOpen
              className="size-4 shrink-0 text-amber-600/80 dark:text-amber-400/80"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {n.name}{" "}
                <span className="font-mono text-[11px] font-normal text-zinc-500">[{n.code3}]</span>
              </p>
              {hasChildren ? (
                <p className="text-xs text-zinc-500">{children.length} subfolder(s)</p>
              ) : (
                <p className="text-xs text-zinc-500">No subfolders</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateParentId(n.id);
                setCreateOpen(true);
                setCreateName("");
                setExpandedIds((prev) => new Set(prev).add(String(n.id)));
              }}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Add child
            </button>
            <button
              type="button"
              onClick={() => {
                setRenameItem(n);
                setRenameName(n.name ?? "");
                setRenameOpen(true);
                setRenamePreview(null);
                setRenamePreviewErr("");
              }}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteItem(n);
                setDeleteOpen(true);
              }}
              className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Delete
            </button>
          </div>
          </div>
        </div>
        {hasChildren && expanded ? (
          <div
            className="space-y-1 border-l border-zinc-200 dark:border-zinc-700"
            style={{ marginLeft: indent + 8, paddingLeft: 10 }}
          >
            {children.map((c) => renderNode(c, depth + 1))}
          </div>
        ) : null}

        {!hasChildren && expanded && Array.isArray(leafItems) && leafItems.length > 0 ? (
          <div
            className="space-y-1 border-l border-zinc-200 dark:border-zinc-700"
            style={{ marginLeft: indent + 8, paddingLeft: 10 }}
          >
            {leafItems.map((p) => (
              <div
                key={`prod-${p.id}`}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <Package className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {p.name}
                  </p>
                  <p className="font-mono text-xs text-zinc-500">{p.sku}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const roots = useMemo(() => sortNodes(tree.byParent.get(null) ?? []), [tree]);

  if (sessionLoading) return <p className="text-sm text-zinc-500">Loading session...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="w-full">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <Link to="/data-entry/product" className="text-primary underline-offset-2 hover:underline">
          ← Product hub
        </Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Product folders
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage folder hierarchy. Each node gets a stable 3-letter code for SKU.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateParentId(null);
            setCreateName("");
            setCreateOpen(true);
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Create root folder
        </button>
      </div>

      {err ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      ) : null}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : roots.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No folders yet. Create a root folder.
          </p>
        ) : (
          roots.map((n) => renderNode(n, 0))
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create folder">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Folder name
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className={inputClass}
              placeholder="Electronics"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => void doCreate()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename folder">
        <div className="space-y-3">
          {renamePreviewErr ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {renamePreviewErr}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              New name
            </label>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              className={inputClass}
            />
          </div>
          {renamePreview ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/40">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">SKU changes</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Folder code3: <span className="font-mono">{renamePreview.oldCode3}</span> →{" "}
                <span className="font-mono">{renamePreview.newCode3}</span>
                {" · "}Products affected: <span className="font-medium">{renamePreview.total}</span>
                {renamePreview.truncated ? " (preview truncated)" : ""}
              </p>
              {Array.isArray(renamePreview.changes) && renamePreview.changes.length > 0 ? (
                <div className="mt-2 max-h-56 overflow-auto rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Product</th>
                        <th className="px-2 py-1.5 font-medium">Old SKU</th>
                        <th className="px-2 py-1.5 font-medium">New SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renamePreview.changes.map((c) => (
                        <tr key={c.productId} className="border-t border-zinc-100 dark:border-zinc-800">
                          <td className="px-2 py-1.5">{c.productName}</td>
                          <td className="px-2 py-1.5 font-mono">{c.oldSku}</td>
                          <td className="px-2 py-1.5 font-mono">{c.newSku}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">No products affected.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Click Preview to see which product SKUs will be renamed.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={renamePreviewLoading || renameApplyLoading}
              onClick={() => void doRenamePreview()}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {renamePreviewLoading ? "Previewing..." : "Preview"}
            </button>
            <button
              type="button"
              disabled={!renamePreview || renameApplyLoading || renamePreviewLoading}
              onClick={() => void doRenameApply()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {renameApplyLoading ? "Renaming..." : "Confirm rename"}
            </button>
            <button
              type="button"
              disabled={renamePreviewLoading || renameApplyLoading}
              onClick={() => {
                setRenameOpen(false);
                setRenamePreview(null);
                setRenamePreviewErr("");
              }}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete folder">
        <div className="space-y-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            Delete folder <span className="font-medium">{deleteItem?.name ?? "-"}</span>?
          </p>
          <p className="text-xs text-zinc-500">
            This will fail if the folder has child folders or products.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={deleting}
              onClick={() => void doDelete()}
              className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

