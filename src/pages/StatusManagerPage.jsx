import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DataTable } from "../components/DataTable.jsx";
import { Modal } from "../components/Modal.jsx";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";
import { useUser } from "../context/UserContext.jsx";
import { StatusForm } from "../forms/StatusForm.jsx";
import { apiDelete, apiGet, paths } from "../lib/api.js";

export function StatusManagerPage() {
  const { isAuthenticated, sessionLoading } = useUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [err, setErr] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ includeInactive: "true" });
      if (category.trim()) qs.set("category", category.trim());
      const res = await apiGet(`${paths.adminStatus}?${qs.toString()}`);
      setRows(res?.data?.items ?? []);
    } catch (e) {
      setErr(e?.message ?? "Failed to load statuses");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCategoryLoading(true);
      try {
        const res = await apiGet(paths.adminStatusCategories);
        if (cancelled) return;
        const options = (res?.data?.items ?? []).map((value) => ({
          value: String(value),
          label: String(value),
        }));
        setCategoryOptions(options);
        setCategory((prev) => {
          if (prev) return prev;
          return options[0]?.value ?? "";
        });
      } catch {
        if (!cancelled) {
          setCategoryOptions([]);
        }
      } finally {
        if (!cancelled) setCategoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(item) {
    setErr("");
    setDeletingId(item.id);
    try {
      await apiDelete(`${paths.adminStatus}/${item.id}`);
      await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to delete status");
    } finally {
      setDeletingId("");
    }
  }

  const columns = useMemo(
    () => [
      { id: "name", header: "Name", cell: (row) => row.name },
      { id: "category", header: "Category", cell: (row) => row.category },
      {
        id: "color",
        header: "Color",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-full border border-zinc-300 dark:border-zinc-600"
              style={{ backgroundColor: row.color ?? "#6b7280" }}
            />
            <span className="font-mono text-xs">{row.color ?? "#6b7280"}</span>
          </div>
        ),
      },
      {
        id: "status",
        header: "State",
        cell: (row) =>
          row.isActive ? (
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Active</span>
          ) : (
            <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">Inactive</span>
          ),
      },
    ],
    [],
  );

  if (sessionLoading) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="w-full">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <Link to="/" className="text-primary underline-offset-2 hover:underline">← Home</Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Status manager
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage statuses by category and reuse them in forms.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Create status
        </button>
      </div>

      <div className="mb-4 max-w-sm">
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Category filter
        </label>
        <SearchableDropdown
          value={category}
          onChange={(next) => setCategory(next)}
          options={categoryOptions}
          disabled={categoryLoading}
          placeholder="Select category"
          searchPlaceholder="Search category..."
          emptyMessage="No categories."
        />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        loading={loading}
        error={err || null}
        emptyMessage='No statuses found. Click "Create status".'
        actions={(row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditItem(row)}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Edit...
            </button>
            <button
              type="button"
              disabled={deletingId === row.id}
              onClick={() => handleDelete(row)}
              className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              {deletingId === row.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create status">
        <StatusForm
          defaultCategory={category || categoryOptions[0]?.value || ""}
          onSuccess={async () => {
            setCreateOpen(false);
            await loadItems();
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal open={editItem != null} onClose={() => setEditItem(null)} title="Edit status">
        {editItem ? (
          <StatusForm
            initial={editItem}
            onSuccess={async () => {
              setEditItem(null);
              await loadItems();
            }}
            onCancel={() => setEditItem(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
