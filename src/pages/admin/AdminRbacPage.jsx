import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { DataTable } from "../../components/DataTable.jsx";
import { Modal } from "../../components/Modal.jsx";
import { useUser } from "../../context/UserContext.jsx";
import { AddRoutePermissionForm } from "../../forms/AddRoutePermissionForm.jsx";
import { CreateRoleForm } from "../../forms/CreateRoleForm.jsx";
import { EditPermissionForm } from "../../forms/EditPermissionForm.jsx";
import { EditRoleForm } from "../../forms/EditRoleForm.jsx";
import {
  apiDelete,
  apiGet,
  apiPost,
  paths,
} from "../../lib/api.js";
import { routeKey } from "../../lib/rbacRouteKey.js";

const ROLES_PAGE_SIZE = 10;

export function AdminRbacPage() {
  const { isAuthenticated, isAdmin, sessionLoading } = useUser();
  const [discoveredRoutes, setDiscoveredRoutes] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [problems, setProblems] = useState(null);
  const [rolesPayload, setRolesPayload] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesPage, setRolesPage] = useState(1);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState({});
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [editPermission, setEditPermission] = useState(null);
  /** @type {null | { path: string; method: string; suggestedName?: string }} */
  const [addPermRoute, setAddPermRoute] = useState(null);
  const [deletingPermId, setDeletingPermId] = useState(null);
  const [deletingRoleId, setDeletingRoleId] = useState(null);
  const [confirmDeletePermission, setConfirmDeletePermission] = useState(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(null);
  const [deletingAllOrphans, setDeletingAllOrphans] = useState(false);

  const loadRbacData = useCallback(async () => {
    const [routesRes, permsRes, problemsRes] = await Promise.all([
      apiGet(paths.adminRbacRoutes),
      apiGet(paths.adminRbacPermissions),
      apiGet(paths.adminRbacProblems),
    ]);
    setDiscoveredRoutes(routesRes?.data?.routes ?? []);
    setAllPermissions(permsRes?.data?.permissions ?? []);
    setProblems(problemsRes?.data ?? null);
  }, []);

  const loadRoles = useCallback(async (page) => {
    setRolesLoading(true);
    setErr("");
    try {
      const res = await apiGet(
        `${paths.adminRbacRoles}?page=${page}&limit=${ROLES_PAGE_SIZE}`,
      );
      const d = res?.data;
      setRolesPayload(d ?? null);
      setRolesPage(d?.page ?? page);
    } catch (e) {
      setErr(e?.message ?? "Failed to load roles");
      setRolesPayload(null);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      setErr("");
      try {
        const [routesRes, permsRes, problemsRes, rs] = await Promise.all([
          apiGet(paths.adminRbacRoutes),
          apiGet(paths.adminRbacPermissions),
          apiGet(paths.adminRbacProblems),
          apiGet(`${paths.adminRbacRoles}?page=1&limit=${ROLES_PAGE_SIZE}`),
        ]);
        if (!cancelled) {
          setDiscoveredRoutes(routesRes?.data?.routes ?? []);
          setAllPermissions(permsRes?.data?.permissions ?? []);
          setProblems(problemsRes?.data ?? null);
          setRolesPayload(rs?.data ?? null);
          setRolesPage(rs?.data?.page ?? 1);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message ?? "Failed to load");
          setDiscoveredRoutes([]);
          setAllPermissions([]);
          setProblems(null);
          setRolesPayload(null);
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAfterMutation() {
    await loadRbacData();
    await loadRoles(rolesPage);
  }

  async function createPermission(row) {
    const key = `${row.method}:${row.path}`;
    setCreating((c) => ({ ...c, [key]: true }));
    setErr("");
    try {
      await apiPost(paths.adminRbacPermissions, {
        mode: "auto",
        path: row.path,
        method: row.method,
      });
      await refreshAfterMutation();
    } catch (e) {
      setErr(e?.message ?? "Create failed");
    } finally {
      setCreating((c) => {
        const n = { ...c };
        delete n[key];
        return n;
      });
    }
  }

  async function deletePermission(permId) {
    setErr("");
    setDeletingPermId(permId);
    try {
      await apiDelete(`${paths.adminRbacPermissions}/${permId}`);
      await refreshAfterMutation();
      setConfirmDeletePermission(null);
    } catch (e) {
      setErr(e?.message ?? "Delete failed");
    } finally {
      setDeletingPermId(null);
    }
  }

  async function handleDeleteRole(role) {
    setErr("");
    setDeletingRoleId(role.id);
    try {
      await apiDelete(`${paths.adminRbacRoles}/${role.id}`);
      const total = (rolesPayload?.total ?? 1) - 1;
      const maxPage = Math.max(1, Math.ceil(Math.max(0, total) / ROLES_PAGE_SIZE));
      const nextPage = Math.min(rolesPage, maxPage);
      await loadRbacData();
      await loadRoles(nextPage);
      setRolesPage(nextPage);
      setConfirmDeleteRole(null);
    } catch (e) {
      setErr(e?.message ?? "Delete failed");
    } finally {
      setDeletingRoleId(null);
    }
  }

  async function handleDeleteAllOrphanPermissions() {
    const hasOrphans = (problems?.permissionsNotInApp?.length ?? 0) > 0;
    if (!hasOrphans || deletingAllOrphans) return;
    const confirmed = window.confirm(
      "Delete all orphaned permissions? They will also be removed from every role.",
    );
    if (!confirmed) return;

    setErr("");
    setDeletingAllOrphans(true);
    try {
      await apiDelete(paths.adminRbacDeleteOrphanPermissions);
      await refreshAfterMutation();
    } catch (e) {
      setErr(e?.message ?? "Delete failed");
    } finally {
      setDeletingAllOrphans(false);
    }
  }

  const mergedRouteRows = useMemo(() => {
    const byKey = new Map();
    for (const p of allPermissions) {
      const k = routeKey(p.path, p.method);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        source: p.source,
      });
    }
    return discoveredRoutes.map((r) => ({
      path: r.path,
      method: r.method,
      suggestedName: r.suggestedName,
      permissions: byKey.get(routeKey(r.path, r.method)) ?? [],
    }));
  }, [discoveredRoutes, allPermissions]);

  const roleColumns = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (row) => (
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {row.name}
          </span>
        ),
      },
      {
        id: "description",
        header: "Description",
        cell: (row) =>
          row.description ? (
            <span className="text-zinc-600 dark:text-zinc-400">
              {row.description}
            </span>
          ) : (
            <span className="text-zinc-400">—</span>
          ),
      },
      {
        id: "perms",
        header: "Permissions",
        align: "center",
        className: "tabular-nums",
        cell: (row) => row.permissionIds?.length ?? 0,
      },
      {
        id: "bundles",
        header: "Bundled roles",
        align: "center",
        className: "tabular-nums",
        cell: (row) => row.roleIds?.length ?? 0,
      },
      {
        id: "onRegister",
        header: "On register",
        align: "center",
        cell: (row) =>
          row.applyOnRegisterUser ? (
            <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
          ) : (
            <span className="text-zinc-400">No</span>
          ),
      },
    ],
    [],
  );

  const routeColumns = useMemo(
    () => [
      {
        id: "method",
        header: "Method",
        cell: (row) => (
          <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {row.method}
          </span>
        ),
      },
      {
        id: "path",
        header: "Path",
        cell: (row) => (
          <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
            {row.path}
          </span>
        ),
      },
      {
        id: "permissions",
        header: "Permissions",
        cell: (row) => {
          const permList = Array.isArray(row.permissions) ? row.permissions : [];
          if (permList.length === 0) {
            return (
              <span className="text-xs text-amber-800 dark:text-amber-300/90">
                No permissions — add at least one
              </span>
            );
          }
          return (
            <ul className="flex flex-col gap-2">
              {permList.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white/80 px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-900/60"
                >
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      p.source === "all_user" || p.source === "all_guest" || p.source === "all"
                        ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
                        : p.source === "auto"
                          ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                          : "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200"
                    }`}
                  >
                    {p.source === "all_guest"
                      ? "All users & guests"
                      : p.source === "all_user" || p.source === "all"
                        ? "All users"
                        : p.source === "auto"
                        ? "Auto"
                        : "Custom"}
                  </span>
                  <span
                    className="min-w-0 flex-1 font-mono text-[11px] text-zinc-800 dark:text-zinc-200"
                    title={p.description || p.name}
                  >
                    {p.name}
                  </span>
                  <button
                    type="button"
                    disabled={deletingPermId === p.id}
                    onClick={() =>
                      setConfirmDeletePermission({ id: p.id, label: p.name })
                    }
                    className="shrink-0 rounded px-1.5 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/50"
                    title="Remove permission"
                  >
                    {deletingPermId === p.id ? "…" : "Remove"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditPermission({
                        ...p,
                        path: row.path,
                        method: row.method,
                      })
                    }
                    className="shrink-0 rounded px-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    title="Edit permission"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          );
        },
      },
    ],
    [deletingPermId],
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

  const routes = mergedRouteRows;
  const orphanedRoutes = problems?.routesWithoutPermission ?? [];
  const permissions = allPermissions;
  const orphanPermissions = problems?.permissionsNotInApp ?? [];
  const roles = rolesPayload?.roles ?? [];
  const rolesTotal = rolesPayload?.total ?? 0;

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
        Routes &amp; permissions
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Each route can have <strong className="font-medium text-zinc-800 dark:text-zinc-200">multiple</strong>{" "}
        permissions. A user needs <strong className="font-medium text-zinc-800 dark:text-zinc-200">any one</strong> of
        them (OR), unless you add an <strong className="font-medium text-zinc-800 dark:text-zinc-200">All users</strong>{" "}
        rule (authenticated only) or an <strong className="font-medium text-zinc-800 dark:text-zinc-200">All users & guests</strong>{" "}
        rule (public). Assign permission names to roles
        below; super-admins get every name in the database.
      </p>

      {err ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      ) : null}

      {bootLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          <section className="mb-10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Roles
              </h2>
              <button
                type="button"
                onClick={() => setCreateRoleModalOpen(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Create role
              </button>
            </div>

            <DataTable
              columns={roleColumns}
              rows={roles}
              getRowKey={(r) => r.id}
              loading={rolesLoading}
              emptyMessage='No roles yet. Click "Create role".'
              pagination={{
                page: rolesPage,
                pageSize: ROLES_PAGE_SIZE,
                total: rolesTotal,
                onPageChange: (p) => {
                  setRolesPage(p);
                  loadRoles(p);
                },
              }}
              actions={(role) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole(role)}
                    className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRole(role)}
                    className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </div>
              )}
            />
          </section>

          {orphanedRoutes.length > 0 ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <span
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100"
                aria-hidden
              >
                !
              </span>
              <div>
                <p className="font-medium text-amber-950 dark:text-amber-100">
                  {orphanedRoutes.length} route
                  {orphanedRoutes.length === 1 ? "" : "s"} with no permissions yet
                </p>
                <p className="mt-0.5 text-sm text-amber-900/80 dark:text-amber-200/80">
                  Use <strong className="font-medium">Quick auto</strong> or{" "}
                  <strong className="font-medium">Add permission</strong> on a row below.
                </p>
              </div>
            </div>
          ) : null}

          <section className="mb-10">
            <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Route coverage
            </h2>
            <DataTable
              columns={routeColumns}
              rows={routes}
              getRowKey={(r) => `${r.method}:${r.path}`}
              emptyMessage="No discovered routes."
              actions={(r) => {
                const key = `${r.method}:${r.path}`;
                const busy = Boolean(creating[key]);
                const permList = Array.isArray(r.permissions) ? r.permissions : [];
                const missing = permList.length === 0;
                return (
                  <div className="flex flex-col items-end gap-1.5">
                    {missing ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                        onClick={() => createPermission(r)}
                      >
                        {busy ? "…" : "Quick auto"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setAddPermRoute({
                          path: r.path,
                          method: r.method,
                          suggestedName: r.suggestedName,
                        })
                      }
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Add permission…
                    </button>
                  </div>
                );
              }}
            />
          </section>


          {orphanPermissions.length > 0 ? (
            <section className="mb-10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  DB-only (no matching route)
                </h2>
                <button
                  type="button"
                  onClick={handleDeleteAllOrphanPermissions}
                  disabled={deletingAllOrphans}
                  className="rounded-md border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:border-red-800"
                >
                  {deletingAllOrphans ? "Deleting..." : "Delete all orphaned"}
                </button>
              </div>
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                These permission rows do not match any currently mounted route
                (renamed route or old entry).
              </p>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                {orphanPermissions.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900/40"
                  >
                    <span>
                      <span className="font-mono text-xs">{p.name}</span>
                      <span className="text-zinc-500"> — </span>
                      <span className="font-mono text-xs">
                        {p.method} {p.path}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={deletingPermId === p.id}
                      onClick={() =>
                        setConfirmDeletePermission({ id: p.id, label: p.name })
                      }
                      className="shrink-0 rounded-md border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPermission(p)}
                      className="shrink-0 rounded-md border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Modal
            open={createRoleModalOpen}
            onClose={() => setCreateRoleModalOpen(false)}
            title="Create role"
          >
            <CreateRoleForm
              permissions={allPermissions}
              roles={roles}
              onSuccess={async () => {
                setCreateRoleModalOpen(false);
                await refreshAfterMutation();
              }}
              onCancel={() => setCreateRoleModalOpen(false)}
            />
          </Modal>

          <Modal
            open={editRole != null}
            onClose={() => setEditRole(null)}
            title="Edit role"
          >
            {editRole ? (
              <EditRoleForm
                key={editRole.id}
                role={editRole}
                permissions={allPermissions}
                roles={roles}
                onSuccess={async () => {
                  setEditRole(null);
                  await refreshAfterMutation();
                }}
                onCancel={() => setEditRole(null)}
              />
            ) : null}
          </Modal>

          <Modal
            open={addPermRoute != null}
            onClose={() => setAddPermRoute(null)}
            title="Add permission to route"
          >
            {addPermRoute ? (
              <AddRoutePermissionForm
                key={`${addPermRoute.method}:${addPermRoute.path}`}
                path={addPermRoute.path}
                method={addPermRoute.method}
                suggestedName={addPermRoute.suggestedName}
                onSuccess={async () => {
                  setAddPermRoute(null);
                  await refreshAfterMutation();
                }}
                onCancel={() => setAddPermRoute(null)}
              />
            ) : null}
          </Modal>

          <Modal
            open={editPermission != null}
            onClose={() => setEditPermission(null)}
            title="Edit permission"
          >
            {editPermission ? (
              <EditPermissionForm
                key={editPermission.id}
                permission={editPermission}
                onSuccess={async () => {
                  setEditPermission(null);
                  await refreshAfterMutation();
                }}
                onCancel={() => setEditPermission(null)}
              />
            ) : null}
          </Modal>

          <Modal
            open={confirmDeletePermission != null}
            onClose={() => {
              if (deletingPermId == null) setConfirmDeletePermission(null);
            }}
            title="Delete permission"
          >
            {confirmDeletePermission ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Delete permission "{confirmDeletePermission.label}"? It will be
                  removed from all roles.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeletePermission(null)}
                    disabled={deletingPermId != null}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePermission(confirmDeletePermission.id)}
                    disabled={deletingPermId != null}
                    className="rounded-md border border-red-300 bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:border-red-800"
                  >
                    {deletingPermId != null ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : null}
          </Modal>

          <Modal
            open={confirmDeleteRole != null}
            onClose={() => {
              if (deletingRoleId == null) setConfirmDeleteRole(null);
            }}
            title="Delete role"
          >
            {confirmDeleteRole ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Delete role "{confirmDeleteRole.name}"? Users with this role
                  will lose it.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRole(null)}
                    disabled={deletingRoleId != null}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(confirmDeleteRole)}
                    disabled={deletingRoleId != null}
                    className="rounded-md border border-red-300 bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:border-red-800"
                  >
                    {deletingRoleId != null ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ) : null}
          </Modal>
        </>
      )}
    </div>
  );
}
