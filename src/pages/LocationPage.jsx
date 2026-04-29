import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { DataTable } from "../components/DataTable.jsx";
import { Modal } from "../components/Modal.jsx";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";
import { useUser } from "../context/UserContext.jsx";
import { LocationForm } from "../forms/LocationForm.jsx";
import { apiDelete, apiGet, apiPost, paths } from "../lib/api.js";

export function LocationPage() {
  const { isAuthenticated, sessionLoading } = useUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [level, setLevel] = useState("country");
  const [parentId, setParentId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const levelOptions = [
    { value: "country", label: "Country" },
    { value: "province", label: "Province" },
    { value: "regency", label: "Regency" },
    { value: "district", label: "District" },
  ];

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ includeInactive: "true", level });
      if (parentId.trim()) qs.set("parentId", parentId.trim());
      const res = await apiGet(`${paths.location}?${qs.toString()}`);
      setRows(res?.data?.items ?? []);
    } catch (e) {
      setErr(e?.message ?? "Failed to load locations");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [level, parentId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleSync() {
    setErr("");
    setSyncing(true);
    try {
      await apiPost(`${paths.location}/sync`);
      await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to sync locations");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(item) {
    setErr("");
    setDeletingId(item.id);
    try {
      await apiDelete(`${paths.location}/${item.id}`);
      await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to delete location");
    } finally {
      setDeletingId("");
    }
  }

  const columns = useMemo(
    () => [
      { id: "name", header: "Name", cell: (row) => row.name },
      { id: "level", header: "Level", cell: (row) => row.level },
      {
        id: "parentId",
        header: "Parent",
        cell: (row) =>
          row.parentId ? <span className="font-mono text-xs">{row.parentId}</span> : "-",
      },
      {
        id: "status",
        header: "Status",
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Location manager</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Country, province, regency, district master data + auto sync.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleSync} disabled={syncing} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
            {syncing ? "Syncing..." : "Auto sync"}
          </button>
          <button type="button" onClick={() => setCreateOpen(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
            Create location
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Level</label>
          <SearchableDropdown
            value={level}
            onChange={(next) => setLevel(next)}
            options={levelOptions}
            placeholder="Select level"
            searchPlaceholder="Search level..."
            emptyMessage="No level found."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Parent id filter</label>
          <input value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100" />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        loading={loading}
        error={err || null}
        emptyMessage='No locations found.'
        actions={(row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setEditItem(row)} className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
              Edit...
            </button>
            <button type="button" disabled={deletingId === row.id} onClick={() => handleDelete(row)} className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30">
              {deletingId === row.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create location">
        <LocationForm onSuccess={async () => { setCreateOpen(false); await loadItems(); }} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={editItem != null} onClose={() => setEditItem(null)} title="Edit location">
        {editItem ? (
          <LocationForm initial={editItem} onSuccess={async () => { setEditItem(null); await loadItems(); }} onCancel={() => setEditItem(null)} />
        ) : null}
      </Modal>
    </div>
  );
}
