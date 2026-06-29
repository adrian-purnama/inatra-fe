import axios from "axios";

/** localStorage key — change only here if you rename the client storage key */
export const TEMPLATE_TOKEN_KEY = "template-token";

/**
 * Single place to change API origin (override with `VITE_API_BASE_URL` in `.env`).
 * @type {string}
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

/** Route paths (change here if backend routes move) */
export const paths = {
  authSendOtp: "/auth/send-otp",
  authRegister: "/auth/register",
  authLogin: "/auth/login",
  /** GET — requires Bearer; validates token + returns current user */
  authMe: "/auth/me",
  /** GET — same payload as `authMe` (alias for session checks) */
  authValidate: "/auth/validate",
  /** GET — public app name, logo, openRegister / openLogin */
  branding: "/branding",
  /** GET — public company/quotation profile info */
  appInfo: "/app/info",
  /** POST — resolve file ids to authorized signed URLs + metadata */
  publicFilesResolve: "/public-files/resolve",
  /** GET — Bearer + admin; discovered HTTP routes */
  adminRbacRoutes: "/admin/rbac/routes",
  /** GET — Bearer + admin; routes missing permissions + stale permission rows */
  adminRbacProblems: "/admin/rbac/problems",
  /** DELETE — Bearer + admin; remove all stale permission rows */
  adminRbacDeleteOrphanPermissions: "/admin/rbac/problems/orphan-permissions",
  adminRbacPermissions: "/admin/rbac/permissions",
  /** GET list / POST create role (Bearer + admin) */
  adminRbacRoles: "/admin/rbac/roles",
  /** GET — Bearer + admin; users list with optional email search */
  adminUsers: "/admin/users",
  /** GET | PATCH — Bearer + admin; app name, logo URL, openRegister, openLogin */
  adminApp: "/admin/app",
  /** POST multipart `file` — Bearer + admin; uploads logo to GridFS, sets `appLogo` */
  adminAppLogo: "/admin/app/logo",
  /** CRUD — Bearer + permission; opportunity line-of-business */
  opportunityLineOfBusiness: "/data-entry/line-of-business",
  /** CRUD — Bearer + permission; opportunity market-segment */
  opportunityMarketSegment: "/data-entry/market-segment",
  /** CRUD — Bearer + permission; opportunity external-org */
  opportunityExternalOrg: "/data-entry/external-org",
  /** GET — Bearer + permission; active opportunity statuses only */
  opportunityStatus: "/opportunity/status",
  /** GET — Bearer + permission; active vendor categories only */
  vendorCategory: "/data-entry/vendor-category",
  /** GET — Bearer + permission; opportunity headers only */
  opportunityHeaders: "/opportunity/headers",
  /** GET — Bearer + permission; opportunity details by ids */
  opportunityDetails: "/opportunity/details",
  /** CRUD — Bearer + permission; opportunity header + detail */
  opportunity: "/opportunity",
  /** POST multipart `file` — upload private opportunity attachment */
  opportunityAttachmentUpload: (opportunityId) =>
    `/opportunity/${encodeURIComponent(String(opportunityId))}/attachments/upload`,
  /** CRUD + sync — Bearer + permission; location master data */
  location: "/location",
  /** CRUD — Bearer + permission; statuses by category */
  adminStatus: "/data-entry/status",
  /** GET — Bearer + permission; list of available status categories */
  adminStatusCategories: "/data-entry/status/category",
  /** CRUD — Bearer + permission; vendor master data */
  vendor: "/data-entry/vendor",
  /** POST multipart — Bearer + permission; import vendors from CSV */
  vendorImport: "/data-entry/vendor/import",
  /** CRUD — Bearer + permission; product master data */
  dataEntryProduct: "/data-entry/product",
  /** CRUD — Bearer + permission; generic folder nodes */
  folderNode: "/folder-node",
  /** New folder API (namespace-scoped) */
  folders: (namespace) => `/folders/${encodeURIComponent(String(namespace))}`,
  foldersRenamePreview: (namespace, id) =>
    `/folders/${encodeURIComponent(String(namespace))}/${encodeURIComponent(String(id))}/rename-preview`,
  foldersRenameApply: (namespace, id) =>
    `/folders/${encodeURIComponent(String(namespace))}/${encodeURIComponent(String(id))}/rename-apply`,
  /** CRUD + workflow — Bearer + permission; quotation header/detail */
  quotation: "/quotation",
  /** GET approver candidates for quotation approval workflow */
  quotationApprovers: "/quotation/approvers",
  /** POST create draft quotation by opportunity id */
  quotationFromOpportunity: (opportunityId) =>
    `/quotation/from-opportunity/${encodeURIComponent(String(opportunityId))}`,
  /** POST submit quotation for approval */
  quotationSubmit: (quotationId) =>
    `/quotation/${encodeURIComponent(String(quotationId))}/submit`,
  /** POST approve quotation */
  quotationApprove: (quotationId) =>
    `/quotation/${encodeURIComponent(String(quotationId))}/approve`,
  /** POST reject quotation */
  quotationReject: (quotationId) =>
    `/quotation/${encodeURIComponent(String(quotationId))}/reject`,
  /** POST create revised quotation */
  quotationRevise: (quotationId) =>
    `/quotation/${encodeURIComponent(String(quotationId))}/revise`,
  /** GET — Bearer; PDF download (open, close, loss only) */
  quotationPdf: (quotationId) =>
    `/quotation/${encodeURIComponent(String(quotationId))}/pdf`,
  /** GET — Bearer + permission; presales dashboard (owner-scoped) */
  dashboardPresales: "/dashboard/presales",
  /** GET — Bearer + get_opportunity; overall dashboard (all data) */
  dashboardOverall: "/dashboard/overall",
};

export function getTemplateToken() {
  try {
    return localStorage.getItem(TEMPLATE_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Persist JWT / session token for authenticated requests */
export function setTemplateToken(token) {
  try {
    if (token) {
      localStorage.setItem(TEMPLATE_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TEMPLATE_TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearTemplateToken() {
  setTemplateToken("");
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  validateStatus: () => true,
});

apiClient.interceptors.request.use((config) => {
  const token = getTemplateToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Normalizes backend `{ success, code, message, data }` and HTTP errors.
 * @param {import('axios').AxiosResponse} res
 */
function handleResponse(res) {
  const data = res.data;
  const httpOk = res.status >= 200 && res.status < 300;
  const bodyOk = data == null || data.success !== false;
  if (httpOk && bodyOk) {
    return data;
  }
  const message =
    typeof data?.message === "string" && data.message
      ? data.message
      : res.statusText || "Request failed";
  const err = new Error(message);
  err.status = res.status;
  err.code = data?.code;
  err.data = data?.data;
  err.response = res;
  throw err;
}

/**
 * GET — path is appended to `API_BASE_URL` (e.g. `/auth/profile`).
 * @param {string} path
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export async function apiGet(path, config) {
  const res = await apiClient.get(path, config);
  return handleResponse(res);
}

/**
 * POST JSON body.
 * @param {string} path
 * @param {unknown} [body]
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export async function apiPost(path, body, config) {
  const res = await apiClient.post(path, body, config);
  return handleResponse(res);
}

/**
 * POST `multipart/form-data` (e.g. file upload). Do not set `Content-Type` manually — boundary is set automatically.
 * @param {string} path
 * @param {FormData} formData
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export async function apiPostFormData(path, formData, config) {
  const res = await apiClient.post(path, formData, {
    ...config,
    transformRequest: [
      (data, headers) => {
        if (data instanceof FormData) {
          delete headers["Content-Type"];
        }
        return data;
      },
    ],
  });
  return handleResponse(res);
}

/**
 * PATCH JSON body.
 * @param {string} path
 * @param {unknown} [body]
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export async function apiPatch(path, body, config) {
  const res = await apiClient.patch(path, body, config);
  return handleResponse(res);
}

/**
 * DELETE resource.
 * @param {string} path
 * @param {import('axios').AxiosRequestConfig} [config]
 */
export async function apiDelete(path, config) {
  const res = await apiClient.delete(path, config);
  return handleResponse(res);
}

/**
 * Download quotation PDF (blob). Triggers a browser file save.
 * @param {string} quotationId
 * @param {string} [filename] suggested download name
 */
export async function downloadQuotationPdf(quotationId, filename) {
  const res = await apiClient.get(paths.quotationPdf(quotationId), {
    responseType: "blob",
  });
  if (res.status < 200 || res.status >= 300) {
    let message = res.statusText || "PDF download failed";
    try {
      const text = await res.data.text();
      const parsed = JSON.parse(text);
      if (typeof parsed?.message === "string" && parsed.message) {
        message = parsed.message;
      }
    } catch {
      /* ignore */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  const blob = res.data;
  const name =
    filename ||
    `Quotation_${String(quotationId).replace(/[/\\?%*:|"<>]/g, "-")}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Raw axios instance if you need custom verbs; prefer `apiGet` / `apiPost`. */
export { apiClient };
