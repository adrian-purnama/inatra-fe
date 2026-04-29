import { useMemo, useState } from "react";
import { apiPatch, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * @param {object} props
 * @param {{ id: string; email: string; isActive: boolean; isAdmin: boolean; isSuperAdmin: boolean; roleIds: string[] }} props.user
 * @param {Array<{ id: string; name: string }>} props.roles
 * @param {() => Promise<void> | void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function EditUserForm({ user, roles, onSuccess, onCancel }) {
  const [isActive, setIsActive] = useState(Boolean(user.isActive));
  const [isAdmin, setIsAdmin] = useState(Boolean(user.isAdmin));
  const [isSuperAdmin, setIsSuperAdmin] = useState(Boolean(user.isSuperAdmin));
  const [selectedRoleIds, setSelectedRoleIds] = useState(() => new Set(user.roleIds ?? []));
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

  const roleOptions = useMemo(
    () => (roles ?? []).map((r) => ({ id: r.id, name: r.name })),
    [roles],
  );

  function toggleRole(id, checked) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setSubmitting(true);
    try {
      const body = {
        isActive,
        isAdmin,
        isSuperAdmin,
        roleIds: [...selectedRoleIds],
      };
      const pw = password.trim();
      if (pw) {
        body.password = pw;
      }
      await apiPatch(`${paths.adminUsers}/${user.id}`, body);
      await onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not update user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        <span className="font-medium">User:</span>{" "}
        <span className="font-mono text-xs">{user.email}</span>
      </p>

      {formErr ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </p>
      ) : null}

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-zinc-400"
          />
          <span>Active account</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="rounded border-zinc-400"
          />
          <span>Admin</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={isSuperAdmin}
            onChange={(e) => setIsSuperAdmin(e.target.checked)}
            className="rounded border-zinc-400"
          />
          <span>Super admin</span>
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Reset password <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="Leave blank to keep current password"
          autoComplete="new-password"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Roles
        </p>
        {roleOptions.length === 0 ? (
          <p className="text-sm text-zinc-500">No roles available.</p>
        ) : (
          <div className="max-h-44 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50/80 p-2 dark:border-zinc-600 dark:bg-zinc-950/50">
            <div className="grid gap-1 sm:grid-cols-2">
              {roleOptions.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.has(r.id)}
                    onChange={(e) => toggleRole(r.id, e.target.checked)}
                    className="rounded border-zinc-400"
                  />
                  <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    {r.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save user"}
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
