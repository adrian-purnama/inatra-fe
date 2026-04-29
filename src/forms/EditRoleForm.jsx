import { useEffect, useState } from "react";
import { apiPatch, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * @param {object} props
 * @param {{ id: string; name: string; description?: string; permissionIds?: string[]; roleIds?: string[]; applyOnRegisterUser?: boolean }} props.role
 * @param {Array<{ id: string; name: string }>} props.permissions — full catalog for checkboxes
 * @param {Array<{ id: string; name: string }>} [props.roles] — full catalog for role bundle checkboxes
 * @param {() => void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function EditRoleForm({ role, permissions, roles = [], onSuccess, onCancel }) {
  const hiddenPermissionNames = new Set(["ALL", "ALL_USER", "ALL_GUEST"]);
  const visiblePermissions = permissions.filter(
    (p) => !hiddenPermissionNames.has(String(p.name).toUpperCase()),
  );
  const [permissionSearch, setPermissionSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const visiblePermissionIds = new Set(visiblePermissions.map((p) => p.id));
  const availableRoles = roles.filter((r) => r.id !== role.id);
  const availableRoleIds = new Set(availableRoles.map((r) => r.id));
  const filteredPermissions = visiblePermissions.filter((p) =>
    String(p.name).toLowerCase().includes(permissionSearch.trim().toLowerCase()),
  );
  const filteredRoles = availableRoles.filter((r) =>
    String(r.name).toLowerCase().includes(roleSearch.trim().toLowerCase()),
  );
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [permIds, setPermIds] = useState(
    () =>
      new Set(
        (role.permissionIds ?? []).filter((id) => visiblePermissionIds.has(id)),
      ),
  );
  const [includedRoleIds, setIncludedRoleIds] = useState(
    () =>
      new Set((role.roleIds ?? []).filter((id) => availableRoleIds.has(id))),
  );
  const [applyOnRegisterUser, setApplyOnRegisterUser] = useState(
    () => Boolean(role.applyOnRegisterUser),
  );
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    setName(role.name);
    setDescription(role.description ?? "");
    setPermIds(
      new Set(
        (role.permissionIds ?? []).filter((id) => visiblePermissionIds.has(id)),
      ),
    );
    setIncludedRoleIds(
      new Set((role.roleIds ?? []).filter((id) => availableRoleIds.has(id))),
    );
    setApplyOnRegisterUser(Boolean(role.applyOnRegisterUser));
  }, [role, permissions, roles]);

  function togglePerm(id, checked) {
    setPermIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleRole(id, checked) {
    setIncludedRoleIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setFormErr("Role name is required");
      return;
    }
    setFormErr("");
    setSubmitting(true);
    try {
      await apiPatch(`${paths.adminRbacRoles}/${role.id}`, {
        name: n,
        description: description.trim(),
        permissionIds: [...permIds],
        roleIds: [...includedRoleIds],
        applyOnRegisterUser,
      });
      onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not update role");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formErr ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </p>
      ) : null}

      <div>
        <label
          htmlFor={`edit-role-name-${role.id}`}
          className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Name
        </label>
        <input
          id={`edit-role-name-${role.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor={`edit-role-desc-${role.id}`}
          className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Description{" "}
          <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id={`edit-role-desc-${role.id}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`${inputClass} resize-y`}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
        <input
          type="checkbox"
          checked={applyOnRegisterUser}
          onChange={(e) => setApplyOnRegisterUser(e.target.checked)}
          className="rounded border-zinc-400"
        />
        <span>Assign this role to new users on registration</span>
      </label>

      {visiblePermissions.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Permissions
          </p>
          <input
            type="text"
            value={permissionSearch}
            onChange={(e) => setPermissionSearch(e.target.value)}
            placeholder="Search permissions..."
            autoComplete="off"
            className={`${inputClass} mb-2`}
          />
          <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-600 dark:bg-zinc-950/50">
            <div className="grid gap-1 sm:grid-cols-2">
              {filteredPermissions.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={permIds.has(p.id)}
                    onChange={(e) => togglePerm(p.id, e.target.checked)}
                    className="rounded border-zinc-400"
                  />
                  <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {p.name}
                  </span>
                </label>
              ))}
            </div>
            {filteredPermissions.length === 0 ? (
              <p className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                No permissions found.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {availableRoles.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Included roles (bundle)
          </p>
          <input
            type="text"
            value={roleSearch}
            onChange={(e) => setRoleSearch(e.target.value)}
            placeholder="Search roles..."
            autoComplete="off"
            className={`${inputClass} mb-2`}
          />
          <div className="max-h-40 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-600 dark:bg-zinc-950/50">
            <div className="grid gap-1 sm:grid-cols-2">
              {filteredRoles.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={includedRoleIds.has(r.id)}
                    onChange={(e) => toggleRole(r.id, e.target.checked)}
                    className="rounded border-zinc-400"
                  />
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">
                    {r.name}
                  </span>
                </label>
              ))}
            </div>
            {filteredRoles.length === 0 ? (
              <p className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                No roles found.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={onCancel}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
