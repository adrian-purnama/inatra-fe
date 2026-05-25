import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Modal } from "../../components/Modal.jsx";
import { SearchableDropdown } from "../../components/SearchableDropdown.jsx";
import { useUser } from "../../context/UserContext.jsx";
import { OpportunityWizardForm } from "../../forms/OpportunityWizardForm.jsx";
import { apiDelete, apiGet, apiPost, paths } from "../../lib/api.js";

function hexToRgba(hex, alpha) {
  const normalized = String(hex ?? "").trim();
  const raw = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(107, 114, 128, ${alpha})`;
  const int = Number.parseInt(raw, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function OpportunityPage() {
  const { isAuthenticated, sessionLoading, userId } = useUser();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [statusItems, setStatusItems] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [filters, setFilters] = useState({
    onlyMine: false,
    customerId: "",
    endUserId: "",
    leadQualificationId: "",
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filters.onlyMine) qs.set("onlyMine", "true");
      if (filters.customerId) qs.set("customerId", filters.customerId);
      if (filters.endUserId) qs.set("endUserId", filters.endUserId);
      if (filters.leadQualificationId) {
        qs.set("leadQualificationId", filters.leadQualificationId);
      }
      const [listRes, statusRes, orgRes] = await Promise.all([
        apiGet(`${paths.opportunity}?${qs.toString()}`),
        apiGet(`${paths.adminStatus}?category=opportunity&includeInactive=true`),
        apiGet(paths.opportunityExternalOrg),
      ]);
      const headers = listRes?.data?.items ?? [];
      const totalRes = Number(listRes?.data?.total ?? 0);
      const pageRes = Number(listRes?.data?.page ?? page);
      const limitRes = Number(listRes?.data?.limit ?? limit);
      setRows(
        headers.map((h) => {
          const details = Array.isArray(h.details) ? h.details : [];
          return {
            ...h,
            details,
            totalPrice: Number(
              h.grandTotal ??
                details.reduce(
                  (sum, d) => sum + Number(d.quantity ?? 0) * Number(d.price ?? 0),
                  0,
                ),
            ),
          };
        }),
      );
      setTotal(totalRes);
      setPage(pageRes);
      setLimit(limitRes);
      setStatusItems(statusRes?.data?.items ?? []);
      setOrgOptions(
        (orgRes?.data?.items ?? []).map((x) => ({
          value: String(x.id),
          label: String(x.name ?? ""),
        })),
      );
    } catch (e) {
      setErr(e?.message ?? "Failed to load opportunities");
      setRows([]);
      setStatusItems([]);
      setOrgOptions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDelete(item) {
    setErr("");
    setDeletingId(item.id);
    try {
      await apiDelete(`${paths.opportunity}/${item.id}`);
      await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to delete opportunity");
    } finally {
      setDeletingId("");
    }
  }

  async function handleCreateQuotationFromOpportunity(opportunityId) {
    setErr("");
    try {
      const res = await apiPost(paths.quotationFromOpportunity(opportunityId), {});
      const quotationId = String(res?.data?.item?.id ?? "");
      if (quotationId) {
        navigate(`/quotation/manage/${quotationId}`);
      }
    } catch (e) {
      setErr(e?.message ?? "Failed to create quotation from opportunity");
    }
  }

  const statusMap = useMemo(() => {
    return new Map(
      statusItems.map((item) => [
        String(item.id),
        {
          name: String(item.name ?? ""),
          color: String(item.color ?? "#6b7280"),
        },
      ]),
    );
  }, [statusItems]);
  const statusOptions = useMemo(
    () =>
      statusItems.map((item) => ({
        value: String(item.id),
        label: String(item.name ?? ""),
      })),
    [statusItems],
  );
  const orgFilterOptions = useMemo(
    () => [{ value: "", label: "All" }, ...orgOptions],
    [orgOptions],
  );
  const statusFilterOptions = useMemo(
    () => [{ value: "", label: "All" }, ...statusOptions],
    [statusOptions],
  );
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, limit)));

  if (sessionLoading) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="w-full">
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <Link to="/opportunity" className="text-primary underline-offset-2 hover:underline">← Opportunity home</Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Opportunity CRUD</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Create and update opportunities with step-by-step form.</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
          Create opportunity
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={filters.onlyMine}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  onlyMine: e.target.checked,
                }));
                setPage(1);
              }}
              className="rounded border-zinc-400"
            />
            My created only
          </label>
          <div>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Customer</p>
            <SearchableDropdown
              value={filters.customerId}
              onChange={(next) =>
                {
                  setFilters((prev) => ({ ...prev, customerId: next }));
                  setPage(1);
                }
              }
              options={orgFilterOptions}
              placeholder="All customers"
              searchPlaceholder="Search customer..."
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">End user</p>
            <SearchableDropdown
              value={filters.endUserId}
              onChange={(next) =>
                {
                  setFilters((prev) => ({ ...prev, endUserId: next }));
                  setPage(1);
                }
              }
              options={orgFilterOptions}
              placeholder="All end users"
              searchPlaceholder="Search end user..."
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Status</p>
            <SearchableDropdown
              value={filters.leadQualificationId}
              onChange={(next) =>
                {
                  setFilters((prev) => ({
                  ...prev,
                  leadQualificationId: next,
                  }));
                  setPage(1);
                }
              }
              options={statusFilterOptions}
              placeholder="All statuses"
              searchPlaceholder="Search status..."
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Page size</p>
            <select
              value={String(limit)}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const reset = {
                onlyMine: false,
                customerId: "",
                endUserId: "",
                leadQualificationId: "",
              };
              setFilters(reset);
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-600"
          >
            Reset
          </button>
        </div>
      </div>

      {err ? (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
          {err}
        </p>
      ) : null}
      {loading ? (
        <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Loading opportunities...
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          No opportunities yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.customer?.customerName || "Unknown"}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Opportunity ID: <span className="font-mono">{String(row.id).slice(-8)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Owner: {row.ownerName || row.ownerId || "-"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/opportunity/manage/${row.id}`}
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditItem(row)}
                    disabled={String(row.ownerId) !== String(userId ?? "")}
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    title={
                      String(row.ownerId) !== String(userId ?? "")
                        ? "Only owner can edit"
                        : "Edit opportunity"
                    }
                  >
                    Edit...
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateQuotationFromOpportunity(row.id)}
                    className="rounded-md border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
                  >
                    Create quotation
                  </button>
                  <button type="button" disabled={deletingId === row.id} onClick={() => handleDelete(row)} className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30">
                    {deletingId === row.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2 lg:grid-cols-3">
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Status:</span>{" "}
                  {statusMap.get(String(row.leadQualificationId)) ? (
                    <span
                      className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium"
                      style={{
                        color: statusMap.get(String(row.leadQualificationId)).color,
                        backgroundColor: hexToRgba(statusMap.get(String(row.leadQualificationId)).color, 0.14),
                        borderColor: hexToRgba(statusMap.get(String(row.leadQualificationId)).color, 0.42),
                      }}
                    >
                      {statusMap.get(String(row.leadQualificationId)).name}
                    </span>
                  ) : (
                    "-"
                  )}
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">End user:</span>{" "}
                  {row.endUser?.endUserName || "Unknown"}
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Contact:</span>{" "}
                  {row.contact?.contactName || "-"}
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Line of business:</span>{" "}
                  {row.lineOfBusinessName || row.lineOfBusinessId || "-"}
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Market segment:</span>{" "}
                  {row.marketSegmentName || row.marketSegmentId || "-"}
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Probability:</span>{" "}
                  {Number(row.propability ?? 0)}%
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Detail rows:</span>{" "}
                  {(row.details ?? []).length}
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Total price:</span>{" "}
                  {Number(row.totalPrice ?? 0).toLocaleString()}
                </p>
                <p>
                  <span className="text-zinc-500 dark:text-zinc-400">Location:</span>{" "}
                  {[row.location?.provinceId, row.location?.regencyId, row.location?.districtId].some(
                    Boolean,
                  )
                    ? "Set"
                    : "Unknown"}
                </p>
              </div>
              {(row.details ?? []).length > 0 ? (
                <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full min-w-[420px] text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Detail</th>
                        <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                        <th className="px-2 py-1.5 text-right font-medium">Price</th>
                        <th className="px-2 py-1.5 text-right font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.details.map((d) => (
                        <tr key={d.id} className="border-t border-zinc-200 dark:border-zinc-700">
                          <td className="px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                            {d.description || "-"}
                          </td>
                          <td className="px-2 py-1.5 text-right text-zinc-700 dark:text-zinc-200">
                            {Number(d.quantity ?? 0)}
                          </td>
                          <td className="px-2 py-1.5 text-right text-zinc-700 dark:text-zinc-200">
                            {Number(d.price ?? 0).toLocaleString()}
                          </td>
                          <td className="px-2 py-1.5 text-right text-zinc-800 dark:text-zinc-100">
                            {(Number(d.quantity ?? 0) * Number(d.price ?? 0)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          ))}
          <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <span className="text-zinc-600 dark:text-zinc-300">
              Page {page} / {totalPages} - {total} item(s)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50 dark:border-zinc-600"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50 dark:border-zinc-600"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        closeOnOverlayClick={false}
        title="Create opportunity"
      >
        <OpportunityWizardForm
          currentUserId={userId ?? ""}
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
        closeOnOverlayClick={false}
        title="Edit opportunity"
      >
        {editItem ? (
          <OpportunityWizardForm
            initial={editItem}
            currentUserId={userId ?? ""}
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
