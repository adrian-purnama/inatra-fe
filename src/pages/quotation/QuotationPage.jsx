import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { SearchableDropdown } from "../../components/SearchableDropdown.jsx";
import { useUser } from "../../context/UserContext.jsx";
import {
  formatMoney,
  hexToRgba,
  prettyDate,
  quotationStatusColor,
  quotationStatusLabel,
} from "../../lib/formatters.js";
import { apiDelete, apiGet, apiPost, paths } from "../../lib/api.js";

const QUOTATION_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approved", label: "Pending approval" },
  { value: "rejected", label: "Rejected" },
  { value: "open", label: "Open" },
  { value: "close", label: "Close" },
  { value: "loss", label: "Loss" },
];

function locationSummary(row) {
  const parts = [];
  const n = row.locationNames;
  if (n?.provinceName) parts.push(n.provinceName);
  if (n?.regencyName) parts.push(n.regencyName);
  if (n?.districtName) parts.push(n.districtName);
  return parts.length > 0 ? parts.join(" / ") : "Unknown";
}

export function QuotationPage() {
  const navigate = useNavigate();
  const { isAuthenticated, sessionLoading, userId } = useUser();
  const [rows, setRows] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [revisingNo, setRevisingNo] = useState("");
  const [filters, setFilters] = useState({
    onlyMine: false,
    customerId: "",
    endUserId: "",
    quotationStatus: "",
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
      if (filters.quotationStatus) qs.set("quotationStatus", filters.quotationStatus);

      const [listRes, orgRes] = await Promise.all([
        apiGet(`${paths.quotation}?${qs.toString()}`),
        apiGet(paths.opportunityExternalOrg),
      ]);

      const items = listRes?.data?.items ?? [];
      setRows(
        items.map((h) => ({
          ...h,
          details: Array.isArray(h.details) ? h.details : [],
        })),
      );
      setTotal(Number(listRes?.data?.total ?? 0));
      setPage(Number(listRes?.data?.page ?? page));
      setLimit(Number(listRes?.data?.limit ?? limit));
      setOrgOptions(
        (orgRes?.data?.items ?? []).map((x) => ({
          value: String(x.id),
          label: String(x.name ?? ""),
        })),
      );
    } catch (e) {
      setErr(e?.message ?? "Failed to load quotations");
      setRows([]);
      setOrgOptions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = String(row.quotationNo ?? "").trim() || String(row.id);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    const out = [];
    for (const [quotationNo, revs] of map) {
      const sorted = [...revs].sort(
        (a, b) => Number(b.revisionNo ?? 0) - Number(a.revisionNo ?? 0),
      );
      out.push({
        quotationNo,
        revs: sorted,
        latest: sorted[0],
        openRev: sorted.find((r) => String(r.quotationStatus) === "open") ?? null,
      });
    }
    // ponytail: page order = first-seen latest; no cross-page group sort
    return out;
  }, [rows]);

  async function handleDelete(item) {
    setErr("");
    setDeletingId(item.id);
    try {
      await apiDelete(`${paths.quotation}/${encodeURIComponent(item.id)}`);
      await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to delete quotation");
    } finally {
      setDeletingId("");
    }
  }

  async function handleCreateRevision(group) {
    const openId = group.openRev?.id;
    if (!openId) return;
    setErr("");
    setRevisingNo(group.quotationNo);
    try {
      const res = await apiPost(paths.quotationRevise(openId), {});
      const nextId = String(res?.data?.item?.id ?? "");
      if (nextId) navigate(`/quotation/manage/${nextId}`);
      else await loadItems();
    } catch (e) {
      setErr(e?.message ?? "Failed to create revision");
    } finally {
      setRevisingNo("");
    }
  }

  const orgFilterOptions = useMemo(
    () => [{ value: "", label: "All" }, ...orgOptions],
    [orgOptions],
  );

  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, limit)));

  if (sessionLoading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session...</p>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

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
            Quotations
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Grouped by quotation number. Create new quotes from an opportunity detail page.
          </p>
        </div>
        <Link
          to="/opportunity/manage"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Opportunities
        </Link>
      </div>

      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={filters.onlyMine}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, onlyMine: e.target.checked }));
                setPage(1);
              }}
              className="rounded border-zinc-400"
            />
            My quotations only
          </label>
          <div>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Customer</p>
            <SearchableDropdown
              value={filters.customerId}
              onChange={(next) => {
                setFilters((prev) => ({ ...prev, customerId: next }));
                setPage(1);
              }}
              options={orgFilterOptions}
              placeholder="All customers"
              searchPlaceholder="Search customer..."
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">End user</p>
            <SearchableDropdown
              value={filters.endUserId}
              onChange={(next) => {
                setFilters((prev) => ({ ...prev, endUserId: next }));
                setPage(1);
              }}
              options={orgFilterOptions}
              placeholder="All end users"
              searchPlaceholder="Search end user..."
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Workflow status</p>
            <SearchableDropdown
              value={filters.quotationStatus}
              onChange={(next) => {
                setFilters((prev) => ({ ...prev, quotationStatus: next }));
                setPage(1);
              }}
              options={QUOTATION_STATUS_OPTIONS}
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
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              setFilters({
                onlyMine: false,
                customerId: "",
                endUserId: "",
                quotationStatus: "",
              });
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs dark:border-zinc-600"
          >
            Reset filters
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
          Loading quotations...
        </p>
      ) : groups.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          No quotations match your filters.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const row = group.latest;
            const status = String(row.quotationStatus ?? "");
            const statusColor = quotationStatusColor(status);
            const isOwner = String(row.ownerId) === String(userId ?? "");
            const canCreateRevision = isOwner && Boolean(group.openRev);

            return (
              <article
                key={group.quotationNo}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                style={{ borderTop: `3px solid ${statusColor}` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {group.quotationNo}
                      <span className="ml-2 font-normal text-zinc-500">
                        {group.revs.length} rev{group.revs.length === 1 ? "" : "s"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {row.customer?.customerName || "Unknown customer"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      Owner: {row.ownerName || row.ownerId || "-"}
                      {row.approverEmail ? ` · Approver: ${row.approverEmail}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/quotation/manage/${row.id}`}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      View latest
                    </Link>
                    {canCreateRevision ? (
                      <button
                        type="button"
                        disabled={revisingNo === group.quotationNo}
                        onClick={() => handleCreateRevision(group)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200"
                      >
                        {revisingNo === group.quotationNo
                          ? "Creating..."
                          : "Create revision"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {group.revs.map((rev) => {
                    const revStatus = String(rev.quotationStatus ?? "");
                    const revColor = quotationStatusColor(revStatus);
                    const canDelete = ["draft", "rejected"].includes(revStatus);
                    const revOwner = String(rev.ownerId) === String(userId ?? "");
                    return (
                      <div
                        key={rev.id}
                        className="flex flex-wrap items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 dark:border-zinc-700"
                      >
                        <Link
                          to={`/quotation/manage/${rev.id}`}
                          className="text-xs font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
                        >
                          Rev {rev.revisionNo}
                        </Link>
                        <span
                          className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize"
                          style={{
                            color: revColor,
                            backgroundColor: hexToRgba(revColor, 0.14),
                            borderColor: hexToRgba(revColor, 0.42),
                          }}
                        >
                          {quotationStatusLabel(revStatus)}
                        </span>
                        {canDelete ? (
                          <button
                            type="button"
                            disabled={deletingId === rev.id || !revOwner}
                            onClick={() => handleDelete(rev)}
                            className="rounded border border-red-300 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:text-red-300"
                            title={!revOwner ? "Only owner can delete" : undefined}
                          >
                            {deletingId === rev.id ? "…" : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 grid gap-2 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2 lg:grid-cols-3">
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">Latest status:</span>{" "}
                    <span
                      className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium capitalize"
                      style={{
                        color: statusColor,
                        backgroundColor: hexToRgba(statusColor, 0.14),
                        borderColor: hexToRgba(statusColor, 0.42),
                      }}
                    >
                      {quotationStatusLabel(status)}
                    </span>
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
                    {row.lineOfBusinessName || "-"}
                  </p>
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">Market segment:</span>{" "}
                    {row.marketSegmentName || "-"}
                  </p>
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">Grand total:</span>{" "}
                    {formatMoney(row.grandTotal)} {row.currency || "IDR"}
                  </p>
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">Tax:</span>{" "}
                    {Number(row.taxRate ?? 0)}% ({formatMoney(row.taxAmount)})
                  </p>
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">Valid until:</span>{" "}
                    {prettyDate(row.validUntil)}
                  </p>
                  <p>
                    <span className="text-zinc-500 dark:text-zinc-400">Location:</span>{" "}
                    {locationSummary(row)}
                  </p>
                  {row.opportunityId ? (
                    <p>
                      <span className="text-zinc-500 dark:text-zinc-400">Opportunity:</span>{" "}
                      <Link
                        to={`/opportunity/manage/${encodeURIComponent(row.opportunityId)}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        View source
                      </Link>
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}

          <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <span className="text-zinc-600 dark:text-zinc-300">
              Page {page} / {totalPages} — {total} quotation(s)
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
    </div>
  );
}
