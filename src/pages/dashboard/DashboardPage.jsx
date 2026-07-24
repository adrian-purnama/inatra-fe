import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useUser } from "../../context/UserContext.jsx";
import { apiGet, paths } from "../../lib/api.js";
import {
  formatMoney,
  quotationStatusColor,
  quotationStatusLabel,
} from "../../lib/formatters.js";

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

const SCOPE_CONFIG = {
  presales: {
    title: "Presales dashboard",
    subtitle: "Your pipeline, opportunities, and quotations.",
    apiPath: paths.dashboardPresales,
  },
  overall: {
    title: "Overall dashboard",
    subtitle: "Team-wide pipeline and quotation metrics.",
    apiPath: paths.dashboardOverall,
  },
};

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

function ChartPanel({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
    >
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      <div className="h-64 w-full">{children}</div>
    </section>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-600 dark:bg-zinc-800">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">
        {label ?? row.name ?? row.status ?? row.month ?? row.customerName ?? row.ownerName}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-zinc-600 dark:text-zinc-300">
          {entry.name}: {entry.dataKey === "value" ? formatMoney(entry.value) : entry.value}
        </p>
      ))}
      {row.count != null && !payload.some((e) => e.dataKey === "count") ? (
        <p className="text-zinc-600 dark:text-zinc-300">Count: {row.count}</p>
      ) : null}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
      {message}
    </div>
  );
}

export function DashboardPage({ scope }) {
  const config = SCOPE_CONFIG[scope] ?? SCOPE_CONFIG.presales;
  const { isAuthenticated, sessionLoading } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiGet(config.apiPath);
      setData(res?.data ?? null);
    } catch (e) {
      setErr(e?.message ?? "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [config.apiPath]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const summary = data?.summary ?? {};
  const winLossLabel = useMemo(() => {
    const won = Number(summary.closedWon ?? 0);
    const lost = Number(summary.closedLost ?? 0);
    const total = won + lost;
    if (total === 0) return "—";
    return `${won} won / ${lost} lost (${Math.round((won / total) * 100)}%)`;
  }, [summary.closedWon, summary.closedLost]);

  if (sessionLoading) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session…</p>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/"
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            ← Home
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {config.title}
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">{config.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading dashboard…</p>
      ) : null}

      {data ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Opportunities" value={summary.opportunityCount ?? 0} />
            <KpiCard
              label="Pipeline value"
              value={formatMoney(summary.pipelineValue)}
            />
            <KpiCard
              label="Weighted pipeline"
              value={formatMoney(summary.weightedPipeline)}
              hint="Value × probability"
            />
            <KpiCard label="Quotations" value={summary.quotationCount ?? 0} />
            <KpiCard
              label="Pending approval"
              value={summary.pendingApproval ?? 0}
            />
            <KpiCard label="Win / loss" value={winLossLabel} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartPanel title="Opportunities by lead qualification">
              {(data.opportunitiesByQualification ?? []).length === 0 ? (
                <EmptyChart message="No opportunity data" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.opportunitiesByQualification}
                    layout="vertical"
                    margin={{ left: 8, right: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis type="number" tickFormatter={formatMoney} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Pipeline by line of business">
              {(data.opportunitiesByLob ?? []).length === 0 ? (
                <EmptyChart message="No LOB data" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.opportunitiesByLob} margin={{ bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tickFormatter={formatMoney} width={72} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Quotations by status">
              {(data.quotationsByStatus ?? []).length === 0 ? (
                <EmptyChart message="No quotation data" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.quotationsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ status, count }) =>
                        `${quotationStatusLabel(status)} (${count})`
                      }
                    >
                      {(data.quotationsByStatus ?? []).map((row) => (
                        <Cell
                          key={row.status}
                          fill={quotationStatusColor(row.status)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, props) => [
                        value,
                        quotationStatusLabel(props?.payload?.status),
                      ]}
                    />
                    <Legend formatter={(value) => quotationStatusLabel(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Expected close (next 6 months)">
              {(data.pipelineByCloseMonth ?? []).length === 0 ? (
                <EmptyChart message="No close dates in range" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pipelineByCloseMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatMoney} width={72} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Top customers by pipeline">
              {(data.topCustomers ?? []).length === 0 ? (
                <EmptyChart message="No customer data" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topCustomers}
                    layout="vertical"
                    margin={{ left: 8, right: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                    <XAxis type="number" tickFormatter={formatMoney} />
                    <YAxis
                      type="category"
                      dataKey="customerName"
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            {scope === "overall" ? (
              <ChartPanel title="Pipeline by owner">
                {(data.pipelineByOwner ?? []).length === 0 ? (
                  <EmptyChart message="No owner data" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.pipelineByOwner} margin={{ bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                      <XAxis
                        dataKey="ownerName"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickFormatter={formatMoney} width={72} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                        {(data.pipelineByOwner ?? []).map((row, i) => (
                          <Cell key={row.ownerId} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
