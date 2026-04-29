import { useEffect, useState } from "react";
import { SearchableDropdown } from "../components/SearchableDropdown.jsx";
import { apiGet, apiPatch, apiPost, paths } from "../lib/api.js";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

/**
 * @param {object} props
 * @param {(
 *   {
 *     id?: string;
 *     vendorName?: string;
 *     vendorCategoryIds?: string[];
 *     vendorCategoryNames?: string[];
 *     description?: string;
 *     address?: string;
 *     location?: { countryId?: string | null; provinceId?: string | null; regencyId?: string | null; districtId?: string | null };
 *     contactPerson?: string;
 *     contactNumber?: string;
 *     email?: string;
 *     isSubcon?: boolean;
 *     coverageArea?: string;
 *     isActive?: boolean;
 *   } | null
 * )} [props.initial]
 * @param {() => Promise<void> | void} props.onSuccess
 * @param {() => void} props.onCancel
 */
export function VendorForm({ initial = null, onSuccess, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const [vendorName, setVendorName] = useState(initial?.vendorName ?? "");
  const [vendorCategoryIds, setVendorCategoryIds] = useState(initial?.vendorCategoryIds ?? []);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [countryId, setCountryId] = useState(initial?.location?.countryId ?? "");
  const [provinceId, setProvinceId] = useState(initial?.location?.provinceId ?? "");
  const [regencyId, setRegencyId] = useState(initial?.location?.regencyId ?? "");
  const [districtId, setDistrictId] = useState(initial?.location?.districtId ?? "");
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson ?? "");
  const [contactNumber, setContactNumber] = useState(initial?.contactNumber ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [coverageArea, setCoverageArea] = useState(initial?.coverageArea ?? "");
  const [isSubcon, setIsSubcon] = useState(initial?.isSubcon ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [regencyOptions, setRegencyOptions] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet(paths.vendorCategory);
        const locRes = await apiGet(`${paths.location}/choices`);
        if (cancelled) return;
        const options = (res?.data?.items ?? []).map((item) => ({
          value: String(item.id),
          label: String(item.name ?? ""),
        }));
        setCategoryOptions(options);
        const countries = locRes?.data?.countries ?? [];
        const provinces = locRes?.data?.provinces ?? [];
        setCountryOptions(countries.map((x) => ({ value: x.id, label: x.name })));
        setProvinceOptions(provinces.map((x) => ({ value: x.id, label: x.name })));
      } catch {
        if (!cancelled) {
          setCategoryOptions([]);
          setCountryOptions([]);
          setProvinceOptions([]);
          setRegencyOptions([]);
          setDistrictOptions([]);
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
      setProvinceId("");
      setRegencyId("");
      setDistrictId("");
      setProvinceOptions([]);
      setRegencyOptions([]);
      setDistrictOptions([]);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({ countryId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (cancelled) return;
        const provinces = res?.data?.provinces ?? [];
        setProvinceOptions(provinces.map((x) => ({ value: x.id, label: x.name })));
      } catch {
        if (!cancelled) setProvinceOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  useEffect(() => {
    let cancelled = false;
    if (!provinceId) {
      setRegencyId("");
      setDistrictId("");
      setRegencyOptions([]);
      setDistrictOptions([]);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({ provinceId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (cancelled) return;
        const regencies = res?.data?.regencies ?? [];
        setRegencyOptions(regencies.map((x) => ({ value: x.id, label: x.name })));
      } catch {
        if (!cancelled) setRegencyOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provinceId]);

  useEffect(() => {
    let cancelled = false;
    if (!regencyId) {
      setDistrictId("");
      setDistrictOptions([]);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const qs = new URLSearchParams({ regencyId });
        const res = await apiGet(`${paths.location}/choices?${qs.toString()}`);
        if (cancelled) return;
        const districts = res?.data?.districts ?? [];
        setDistrictOptions(districts.map((x) => ({ value: x.id, label: x.name })));
      } catch {
        if (!cancelled) setDistrictOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [regencyId]);

  async function onSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setSubmitting(true);
    try {
      const body = {
        vendorName: vendorName.trim(),
        vendorCategoryIds,
        description: description.trim(),
        address: address.trim(),
        countryId: countryId || undefined,
        provinceId: provinceId || undefined,
        regencyId: regencyId || undefined,
        districtId: districtId || undefined,
        contactPerson: contactPerson.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim() || undefined,
        coverageArea: coverageArea.trim(),
        isSubcon,
        isActive,
      };
      if (isEdit) {
        await apiPatch(`${paths.vendor}/${initial.id}`, body);
      } else {
        await apiPost(paths.vendor, body);
      }
      await onSuccess();
    } catch (err) {
      setFormErr(err?.message ?? "Could not save vendor");
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
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Vendor name
        </label>
        <input
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          className={inputClass}
          placeholder="Vendor name"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Vendor categories
        </label>
        <SearchableDropdown
          value=""
          onChange={(next) =>
            setVendorCategoryIds((prev) => (prev.includes(next) ? prev : [...prev, next]))
          }
          options={categoryOptions.filter((opt) => !vendorCategoryIds.includes(opt.value))}
          placeholder="Search and add category"
          searchPlaceholder="Search category..."
          emptyMessage="No more categories."
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {vendorCategoryIds.map((id) => {
            const label = categoryOptions.find((x) => x.value === id)?.label || id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setVendorCategoryIds((prev) => prev.filter((x) => x !== id))}
                className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                title="Remove"
              >
                {label} ×
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Contact person
          </label>
          <input
            type="text"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Contact number
          </label>
          <input
            type="text"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Country
          </label>
          <SearchableDropdown value={countryId} onChange={setCountryId} options={countryOptions} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Province
          </label>
          <SearchableDropdown
            value={provinceId}
            onChange={setProvinceId}
            options={provinceOptions}
            disabled={!countryId}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Regency
          </label>
          <SearchableDropdown
            value={regencyId}
            onChange={setRegencyId}
            options={regencyOptions}
            disabled={!provinceId}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
            District
          </label>
          <SearchableDropdown
            value={districtId}
            onChange={setDistrictId}
            options={districtOptions}
            disabled={!regencyId}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Email
        </label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Address
        </label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={`${inputClass} min-h-20`}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-20`}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Coverage area
        </label>
        <input
          type="text"
          value={coverageArea}
          onChange={(e) => setCoverageArea(e.target.value)}
          className={inputClass}
          placeholder="Leave empty for now"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={isSubcon}
            onChange={(e) => setIsSubcon(e.target.checked)}
            className="rounded border-zinc-400"
          />
          <span>Subcontractor</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-zinc-400"
          />
          <span>Active</span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Saving..." : isEdit ? "Save vendor" : "Create vendor"}
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
