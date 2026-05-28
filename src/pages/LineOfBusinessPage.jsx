import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LineOfBusinessForm } from "../forms/LineOfBusinessForm.jsx";
import { apiDelete, apiGet, paths } from "../lib/api.js";
import { DataTable } from "../components/DataTable.jsx";
import { Modal } from "../components/Modal.jsx";
import { useUser } from "../context/UserContext.jsx";

export function LineOfBusinessPage() {
  const { isAuthenticated, sessionLoading } = useUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiGet(paths.opportunityLineOfBusiness);
      setRows(res?.data?.items ?? []);
    } catch (e) {
      setErr(e?.message ?? "Failed to load line of business");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDelete(item) {
    setErr("");
    setDeletingId(item.id);
    try {
      await apiDelete(`${paths.opportunityLineOfBusiness}/${item.id}`);
      await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to delete line of business");
    } finally {
      setDeletingId("");
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "code",
        header: "Code",
        cell: (row) => (
          <span className="font-mono text-xs text-zinc-800 dark:text-zinc-100">{row.code}</span>
        ),
      },
      { id: "name", header: "Name", cell: (row) => row.name },
      { id: "description", header: "Description", cell: (row) => row.description },
      {
        id: "status",
        header: "Status",
        cell: (row) =>
          row.isActive ? (
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              Active
            </span>
          ) : (
            <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
              Inactive
            </span>
          ),
      },
    ],
    [],
  );

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
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <Link to="/" className="text-primary underline-offset-2 hover:underline">
          ← Home
        </Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Line of business
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage line of business records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Create line of business
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        loading={loading}
        error={err || null}
        emptyMessage='No line of business rows yet. Click "Create line of business".'
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create line of business"
      >
        <LineOfBusinessForm
          onSuccess={async () => {
            setCreateOpen(false);
            await loadItems();
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal
        open={editItem != null}
        onClose={() => setEditItem(null)}
        title="Edit line of business"
      >
        {editItem ? (
          <LineOfBusinessForm
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
