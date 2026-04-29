import { useEffect, useMemo, useState } from "react";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";
import { apiGet, apiPatch, apiPost, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * @param {object} props
 * @param {{ id?: string; name?: string; level?: string; parentId?: string | null; isActive?: boolean } | null} [props.initial]
 * @param {() => Promise<void> | void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function LocationForm({ initial = null, onSuccess, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? "");
  const [level, setLevel] = useState(initial?.level ?? "country");
  const [countryId, setCountryId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [regencyId, setRegencyId] = useState("");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [allLocationsById, setAllLocationsById] = useState(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const levelOptions = [
    { value: "country", label: "Country (Negara)" },
    { value: "province", label: "Province (Provinsi)" },
    { value: "regency", label: "Regency (Kabupaten)" },
    { value: "district", label: "District (Kecamatan)" },
  ];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [choicesRes, allRes] = await Promise.all([
          apiGet(`${paths.location}/choices?includeInactive=true`),
          apiGet(`${paths.location}?includeInactive=true`),
        ]);
        if (!cancelled) {
          const countryList = (choicesRes?.data?.countries ?? []).map((c) => ({
            value: c.id,
            label: c.name,
          }));
          setCountries(countryList);
          const allLocations = allRes?.data?.items ?? [];
          setAllLocationsById(new Map(allLocations.map((x) => [x.id, x])));
        }
      } catch {
        if (!cancelled) {
          setCountries([]);
          setAllLocationsById(new Map());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!countryId) {
      setProvinces([]);
      setRegencies([]);
      if (level === "province") setProvinceId("");
      if (level === "regency" || level === "district") {
        setProvinceId("");
        setRegencyId("");
      }
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({
          includeInactive: "true",
          countryId,
        });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (!cancelled) {
          const list = (res?.data?.provinces ?? []).map((p) => ({
            value: p.id,
            label: p.name,
          }));
          setProvinces(list);
        }
      } catch {
        if (!cancelled) setProvinces([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryId, level]);

  useEffect(() => {
    let cancelled = false;
    if (!provinceId) {
      setRegencies([]);
      if (level === "district") setRegencyId("");
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({
          includeInactive: "true",
          provinceId,
        });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (!cancelled) {
          const list = (res?.data?.regencies ?? []).map((r) => ({
            value: r.id,
            label: r.name,
          }));
          setRegencies(list);
        }
      } catch {
        if (!cancelled) setRegencies([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provinceId, level]);

  useEffect(() => {
    if (!isEdit || !initial?.id || allLocationsById.size === 0) return;
    const current = allLocationsById.get(initial.id);
    if (!current) return;
    const parent = current.parentId ? allLocationsById.get(current.parentId) : null;
    const grandParent = parent?.parentId ? allLocationsById.get(parent.parentId) : null;
    const greatGrandParent =
      grandParent?.parentId ? allLocationsById.get(grandParent.parentId) : null;

    if (current.level === "province") {
      setCountryId(parent?.id ?? "");
    } else if (current.level === "regency") {
      setProvinceId(parent?.id ?? "");
      setCountryId(grandParent?.id ?? "");
    } else if (current.level === "district") {
      setRegencyId(parent?.id ?? "");
      setProvinceId(grandParent?.id ?? "");
      setCountryId(greatGrandParent?.id ?? "");
    }
  }, [isEdit, initial?.id, allLocationsById]);

  const parentId = useMemo(() => {
    if (level === "country") return "";
    if (level === "province") return countryId;
    if (level === "regency") return provinceId;
    return regencyId;
  }, [level, countryId, provinceId, regencyId]);

  async function onSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setSubmitting(true);
    try {
      if (level !== "country" && !parentId) {
        setFormErr("Please select parent location");
        setSubmitting(false);
        return;
      }
      const body = {
        name: name.trim(),
        level,
        parentId: parentId || undefined,
        isActive,
      };
      if (isEdit) {
        await apiPatch(`${paths.location}/${initial.id}`, body);
      } else {
        await apiPost(paths.location, body);
      }
      await onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not save location");
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
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">Level</label>
        <SearchableDropdown
          value={level}
          onChange={(next) => {
            setLevel(next);
            if (next === "country") {
              setCountryId("");
              setProvinceId("");
              setRegencyId("");
            } else if (next === "province") {
              setProvinceId("");
              setRegencyId("");
            } else if (next === "regency") {
              setRegencyId("");
            }
          }}
          options={levelOptions}
          placeholder="Select level"
          searchPlaceholder="Search level..."
          emptyMessage="No level found."
        />
      </div>
      {level !== "country" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Country (Negara)
          </label>
          <SearchableDropdown
            value={countryId}
            onChange={(next) => {
              setCountryId(next);
              setProvinceId("");
              setRegencyId("");
            }}
            options={countries}
            placeholder="Select country"
            searchPlaceholder="Search country..."
            emptyMessage="No countries."
          />
        </div>
      ) : null}
      {(level === "regency" || level === "district") ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Province (Provinsi)
          </label>
          <SearchableDropdown
            value={provinceId}
            onChange={(next) => {
              setProvinceId(next);
              setRegencyId("");
            }}
            options={provinces}
            placeholder={countryId ? "Select province" : "Select country first"}
            searchPlaceholder="Search province..."
            emptyMessage="No provinces."
            disabled={!countryId}
          />
        </div>
      ) : null}
      {level === "district" ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Regency (Kabupaten)
          </label>
          <SearchableDropdown
            value={regencyId}
            onChange={(next) => setRegencyId(next)}
            options={regencies}
            placeholder={provinceId ? "Select regency" : "Select province first"}
            searchPlaceholder="Search regency..."
            emptyMessage="No regencies."
            disabled={!provinceId}
          />
        </div>
      ) : null}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-zinc-400" />
        <span>Active</span>
      </label>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50">
          {submitting ? "Saving..." : isEdit ? "Save location" : "Create location"}
        </button>
        <button type="button" disabled={submitting} onClick={onCancel} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
          Cancel
        </button>
      </div>
    </form>
  );
}
