import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DataTable } from "../../components/DataTable.jsx";
import { SearchableDropdown } from "../../components/SearchableDropdown.jsx";
import { useUser } from "../../context/UserContext.jsx";
import { apiGet, paths } from "../../lib/api.js";

export function OpportunityDataEntryPage() {
  const { isAuthenticated, sessionLoading } = useUser();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [onlyMine, setOnlyMine] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [endUserId, setEndUserId] = useState("");
  const [leadQualificationId, setLeadQualificationId] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (onlyMine) qs.set("onlyMine", "true");
      if (customerId) qs.set("customerId", customerId);
      if (endUserId) qs.set("endUserId", endUserId);
      if (leadQualificationId) qs.set("leadQualificationId", leadQualificationId);
      const res = await apiGet(`${paths.opportunity}?${qs.toString()}`);
      setRows(res?.data?.items ?? []);
      setTotal(Number(res?.data?.total ?? 0));
    } catch (e) {
      setErr(e?.message ?? "Failed to load opportunities");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, onlyMine, customerId, endUserId, leadQualificationId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, orgRes] = await Promise.all([
          apiGet(paths.opportunityStatus),
          apiGet(paths.opportunityExternalOrg),
        ]);
        if (cancelled) return;
        setStatusOptions(
          (statusRes?.data?.items ?? []).map((x) => ({
            value: String(x.id),
            label: String(x.name ?? ""),
          })),
        );
        setOrgOptions(
          (orgRes?.data?.items ?? []).map((x) => ({
            value: String(x.id),
            label: String(x.name ?? ""),
          })),
        );
      } catch {
        if (!cancelled) {
          setStatusOptions([]);
          setOrgOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo(
    () => [
      {
        id: "owner",
        header: "Owner",
        cell: (row) => row.ownerName || row.ownerId || "-",
      },
      {
        id: "customer",
        header: "Customer",
        cell: (row) => row.customer?.customerName || "Unknown",
      },
      {
        id: "endUser",
        header: "End user",
        cell: (row) => row.endUser?.endUserName || "Unknown",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) =>
          statusOptions.find((x) => x.value === String(row.leadQualificationId))?.label || "-",
      },
      {
        id: "lineOfBusiness",
        header: "Line of business",
        cell: (row) => row.lineOfBusinessName || row.lineOfBusinessId || "-",
      },
      {
        id: "marketSegment",
        header: "Market segment",
        cell: (row) => row.marketSegmentName || row.marketSegmentId || "-",
      },
      {
        id: "probability",
        header: "Probability",
        align: "right",
        cell: (row) => `${Number(row.propability ?? 0)}%`,
      },
      {
        id: "createdAt",
        header: "Created",
        cell: (row) => {
          const dt = new Date(row.createdAt);
          if (Number.isNaN(dt.getTime())) return "-";
          return dt.toLocaleDateString();
        },
      },
    ],
    [statusOptions],
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
        <Link
          to="/"
          className="text-primary underline-offset-2 hover:underline"
        >
          ← Home
        </Link>
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Opportunity data entry
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Filter and browse opportunities from backend with pagination.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-600 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => {
              setOnlyMine(e.target.checked);
              setPage(1);
            }}
            className="rounded border-zinc-400"
          />
          My created opportunities
        </label>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Customer</p>
          <SearchableDropdown
            value={customerId}
            onChange={(next) => {
              setCustomerId(next);
              setPage(1);
            }}
            options={orgOptions}
            placeholder="All customers"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">End user</p>
          <SearchableDropdown
            value={endUserId}
            onChange={(next) => {
              setEndUserId(next);
              setPage(1);
            }}
            options={orgOptions}
            placeholder="All end users"
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-zinc-500">Status</p>
          <SearchableDropdown
            value={leadQualificationId}
            onChange={(next) => {
              setLeadQualificationId(next);
              setPage(1);
            }}
            options={statusOptions}
            placeholder="All statuses"
          />
        </div>
      </div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => {
            setOnlyMine(false);
            setCustomerId("");
            setEndUserId("");
            setLeadQualificationId("");
            setPage(1);
          }}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reset filters
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        loading={loading}
        error={err || null}
        emptyMessage="No opportunities match this filter."
        actions={(row) => (
          <Link
            to={`/opportunity/manage/${row.id}`}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            View
          </Link>
        )}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: (next) => setPage(next),
        }}
      />
    </div>
  );
}
