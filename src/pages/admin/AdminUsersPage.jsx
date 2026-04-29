import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DataTable } from "../../components/DataTable.jsx";
import { Modal } from "../../components/Modal.jsx";
import { useUser } from "../../context/UserContext.jsx";
import { EditUserForm } from "../../forms/EditUserForm.jsx";
import { apiGet, apiPatch, paths } from "../../lib/api.js";

const USERS_PAGE_SIZE = 10;

export function AdminUsersPage() {
  const { isAuthenticated, isAdmin, sessionLoading } = useUser();
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [roles, setRoles] = useState([]);
  const [editUser, setEditUser] = useState(null);

  const loadUsers = useCallback(async (nextPage, nextQuery) => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(USERS_PAGE_SIZE),
      });
      if (nextQuery.trim()) {
        qs.set("search", nextQuery.trim());
      }
      const res = await apiGet(`${paths.adminUsers}?${qs.toString()}`);
      const data = res?.data ?? {};
      setRows(data.users ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? nextPage);
    } catch (e) {
      setErr(e?.message ?? "Failed to load users");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers(1, query);
  }, [loadUsers, query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet(`${paths.adminRbacRoles}?page=1&limit=100`);
        if (!cancelled) {
          setRoles(res?.data?.roles ?? []);
        }
      } catch {
        if (!cancelled) {
          setRoles([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleUserActive(row) {
    setErr("");
    setUpdatingUserId(row.id);
    try {
      await apiPatch(`${paths.adminUsers}/${row.id}`, {
        isActive: !Boolean(row.isActive),
      });
      await loadUsers(page, query);
    } catch (e) {
      setErr(e?.message ?? "Failed to update user");
    } finally {
      setUpdatingUserId("");
    }
  }

  const columns = useMemo(
    () => [
      {
        id: "email",
        header: "Email",
        cell: (row) => (
          <span className="font-mono text-xs text-zinc-800 dark:text-zinc-100">
            {row.email}
          </span>
        ),
      },
      {
        id: "flags",
        header: "Flags",
        cell: (row) => (
          <div className="flex flex-wrap gap-1.5">
            {row.isSuperAdmin ? (
              <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-900 dark:bg-violet-950 dark:text-violet-200">
                Super admin
              </span>
            ) : null}
            {row.isAdmin ? (
              <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                Admin
              </span>
            ) : null}
            {row.isActive ? (
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                Active
              </span>
            ) : (
              <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
                Inactive
              </span>
            )}
          </div>
        ),
      },
      {
        id: "roles",
        header: "Role IDs",
        className: "tabular-nums",
        align: "center",
        cell: (row) => row.roleIds?.length ?? 0,
      },
      {
        id: "created",
        header: "Created",
        cell: (row) => {
          if (!row.createdAt) return <span className="text-zinc-400">—</span>;
          const d = new Date(row.createdAt);
          return (
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()}
            </span>
          );
        },
      },
    ],
    [],
  );

  if (sessionLoading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading session…</p>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
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
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Users
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Search users by email.
      </p>

      <form
        className="mb-4 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(searchInput.trim());
          setPage(1);
        }}
      >
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search email..."
          className="w-full max-w-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Search
        </button>
        {query ? (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setQuery("");
              setPage(1);
            }}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
        ) : null}
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
        loading={loading}
        error={err || null}
        emptyMessage="No users found."
        actions={(row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={updatingUserId === row.id}
              onClick={() => toggleUserActive(row)}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {updatingUserId === row.id
                ? "Saving…"
                : row.isActive
                  ? "Disable"
                  : "Enable"}
            </button>
            <button
              type="button"
              onClick={() => setEditUser(row)}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Edit…
            </button>
          </div>
        )}
        pagination={{
          page,
          pageSize: USERS_PAGE_SIZE,
          total,
          onPageChange: (nextPage) => {
            setPage(nextPage);
            loadUsers(nextPage, query);
          },
        }}
      />

      <Modal
        open={editUser != null}
        onClose={() => setEditUser(null)}
        title="Edit user"
      >
        {editUser ? (
          <EditUserForm
            key={editUser.id}
            user={editUser}
            roles={roles}
            onSuccess={async () => {
              setEditUser(null);
              await loadUsers(page, query);
            }}
            onCancel={() => setEditUser(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
