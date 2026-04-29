import { useState } from "react";
import { apiPost, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * @param {object} props
 * @param {Array<{ id: string; name: string }>} props.permissions
 * @param {Array<{ id: string; name: string }>} [props.roles]
 * @param {() => void} props.onSuccess — after successful create (e.g. refresh list + close modal)
 * @param {() => void} props.onCancel — close without saving
 */
export function CreateRoleForm({ permissions, roles = [], onSuccess, onCancel }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [permIds, setPermIds] = useState(() => new Set());
  const [includedRoleIds, setIncludedRoleIds] = useState(() => new Set());
  const [applyOnRegisterUser, setApplyOnRegisterUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const hiddenPermissionNames = new Set(["ALL", "ALL_USER", "ALL_GUEST"]);
  const visiblePermissions = permissions.filter(
    (p) => !hiddenPermissionNames.has(String(p.name).toUpperCase()),
  );
  const filteredPermissions = visiblePermissions.filter((p) =>
    String(p.name).toLowerCase().includes(permissionSearch.trim().toLowerCase()),
  );
  const filteredRoles = roles.filter((r) =>
    String(r.name).toLowerCase().includes(roleSearch.trim().toLowerCase()),
  );

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
      await apiPost(paths.adminRbacRoles, {
        name: n,
        description: description.trim(),
        permissionIds: [...permIds],
        roleIds: [...includedRoleIds],
        applyOnRegisterUser,
      });
      setName("");
      setDescription("");
      setPermIds(new Set());
      setIncludedRoleIds(new Set());
      setApplyOnRegisterUser(false);
      onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not create role");
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
          htmlFor="create-role-name"
          className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Name
        </label>
        <input
          id="create-role-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. content_editor"
          autoComplete="off"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="create-role-desc"
          className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Description{" "}
          <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="create-role-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What this role is for"
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
            Initial permissions{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
          </p>
          <input
            type="text"
            value={permissionSearch}
            onChange={(e) => setPermissionSearch(e.target.value)}
            placeholder="Search permissions..."
            autoComplete="off"
            className={`${inputClass} mb-2`}
          />
          <div className="max-h-40 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-600 dark:bg-zinc-950/50">
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

      {roles.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Include other roles{" "}
            <span className="font-normal text-zinc-500">(role bundle, optional)</span>
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
          {submitting ? "Creating…" : "Create role"}
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
