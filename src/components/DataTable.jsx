/**
 * Generic data table: columns, optional row actions, loading/empty states, optional pagination.
 * @param {object} props
 * @param {Array<{ id: string; header: string; align?: 'left' | 'right' | 'center'; className?: string; cell: (row: object) => import('react').ReactNode }>} props.columns
 * @param {object[]} props.rows
 * @param {(row: object) => string} props.getRowKey
 * @param {boolean} [props.loading]
 * @param {string | null} [props.error]
 * @param {string} [props.emptyMessage]
 * @param {(row: object) => import('react').ReactNode} [props.actions] — render for last column (e.g. Edit / Delete)
 * @param {{ page: number; pageSize: number; total: number; onPageChange: (page: number) => void } | null} [props.pagination]
 */
export function DataTable({
  columns,
  rows,
  getRowKey,
  loading = false,
  error = null,
  emptyMessage = "No rows to display.",
  actions = null,
  pagination = null,
}) {
  const showActions = typeof actions === "function";
  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;
  const currentPage = pagination?.page ?? 1;

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={`px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100 ${
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left"
                  } ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
              {showActions ? (
                <th className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-zinc-100">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (showActions ? 1 : 0)}
                  className="px-3 py-8 text-center text-zinc-500"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showActions ? 1 : 0)}
                  className="px-3 py-8 text-center text-zinc-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={`px-3 py-2 align-middle text-zinc-800 dark:text-zinc-200 ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left"
                      } ${col.className ?? ""}`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                  {showActions ? (
                    <td className="px-3 py-2 text-right align-middle">
                      {actions(row)}
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && rows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Page {currentPage} of {totalPages}
            <span className="text-zinc-400 dark:text-zinc-500">
              {" "}
              ({pagination.total} total)
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => pagination.onPageChange(currentPage - 1)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => pagination.onPageChange(currentPage + 1)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
