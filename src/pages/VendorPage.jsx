import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DataTable } from "../components/DataTable.jsx";
import { Modal } from "../components/Modal.jsx";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";
import { useUser } from "../context/UserContext.jsx";
import { VendorForm } from "../forms/VendorForm.jsx";
import { apiDelete, apiGet, apiPostFormData, paths } from "../lib/api.js";

export function VendorPage() {
  const { isAuthenticated, sessionLoading } = useUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [categoryFilterIds, setCategoryFilterIds] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiGet(paths.vendor);
      setRows(res?.data?.items ?? []);
    } catch (e) {
      setErr(e?.message ?? "Failed to load vendors");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet(paths.vendorCategory);
        if (cancelled) return;
        setCategoryOptions(
          (res?.data?.items ?? []).map((item) => ({
            value: String(item.id),
            label: String(item.name ?? ""),
          })),
        );
      } catch {
        if (!cancelled) setCategoryOptions([]);
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
      await apiDelete(`${paths.vendor}/${item.id}`);
      await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to delete vendor");
    } finally {
      setDeletingId("");
    }
  }

  async function handleImport() {
    if (!importFile) {
      setErr("Please select a CSV file first");
      return;
    }
    setImporting(true);
    setErr("");
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await apiPostFormData(paths.vendorImport, formData);
      setImportSummary(res?.data ?? null);
      await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to import vendors");
    } finally {
      setImporting(false);
    }
  }

  const columns = useMemo(
    () => [
      { id: "vendorName", header: "Vendor", cell: (row) => row.vendorName },
      {
        id: "vendorCategoryNames",
        header: "Category",
        cell: (row) =>
          Array.isArray(row.vendorCategoryNames) && row.vendorCategoryNames.length > 0
            ? row.vendorCategoryNames.join(", ")
            : "-",
      },
      {
        id: "location",
        header: "Location",
        cell: (row) => {
          const loc = row.location ?? {};
          return [loc.countryId, loc.provinceId, loc.regencyId, loc.districtId].some(Boolean)
            ? "Mapped"
            : "-";
        },
      },
      { id: "contactPerson", header: "Contact", cell: (row) => row.contactPerson || "-" },
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

  const filteredRows = useMemo(() => {
    if (categoryFilterIds.length === 0) return rows;
    return rows.filter((row) =>
      Array.isArray(row.vendorCategoryIds)
        ? row.vendorCategoryIds
            .map(String)
            .some((id) => categoryFilterIds.includes(String(id)))
        : false,
    );
  }, [rows, categoryFilterIds]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilterIds, rows.length]);

  if (sessionLoading) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>;
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
            Vendor
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage vendor records and import vendor CSV data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Create vendor
        </button>
      </div>

      <div className="mb-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
        <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">Import from CSV</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="button"
            disabled={importing}
            onClick={handleImport}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {importing ? "Importing..." : "Upload CSV"}
          </button>
        </div>
        {importSummary ? (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
            Import summary — created: {Number(importSummary.created ?? 0)}, updated:{" "}
            {Number(importSummary.updated ?? 0)}, skipped: {Number(importSummary.skipped ?? 0)},
            errors: {Number(importSummary.errors ?? 0)}, total: {Number(importSummary.total ?? 0)}
          </p>
        ) : null}
      </div>

      <div className="mb-4 max-w-sm">
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Category filter
        </label>
        <SearchableDropdown
          multiple
          value=""
          onChange={() => {}}
          values={categoryFilterIds}
          onValuesChange={(next) => setCategoryFilterIds(next)}
          options={categoryOptions}
          placeholder="All categories"
          searchPlaceholder="Search category..."
          emptyMessage="No categories."
        />
      </div>

      <DataTable
        columns={columns}
        rows={pagedRows}
        getRowKey={(r) => r.id}
        loading={loading}
        error={err || null}
        emptyMessage="No vendors match this filter."
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
        pagination={{
          page,
          pageSize,
          total: filteredRows.length,
          onPageChange: (next) => setPage(next),
        }}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create vendor">
        <VendorForm
          onSuccess={async () => {
            setCreateOpen(false);
            await loadItems();
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal open={editItem != null} onClose={() => setEditItem(null)} title="Edit vendor">
        {editItem ? (
          <VendorForm
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
