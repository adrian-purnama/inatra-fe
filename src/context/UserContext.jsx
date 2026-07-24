/* eslint-disable react-refresh/only-export-components -- context + hook module */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiGet,
  clearTemplateToken,
  getTemplateToken,
  paths,
  setTemplateToken,
} from "../lib/api.js";

const UserContext = createContext(null);

function mapMeUser(d) {
  if (!d || typeof d.id !== "string" || typeof d.email !== "string") {
    return null;
  }
  return {
    id: d.id,
    email: d.email,
    fullName: typeof d.fullName === "string" ? d.fullName : "",
    suffix: typeof d.suffix === "string" ? d.suffix : "",
    eSignFileId: typeof d.eSignFileId === "string" ? d.eSignFileId : null,
    isSuperAdmin: Boolean(d.isSuperAdmin),
    isAdmin: Boolean(d.isAdmin),
    permissionKeys: Array.isArray(d.permissionKeys)
      ? d.permissionKeys.filter((p) => typeof p === "string")
      : [],
  };
}

export function UserProvider({ children }) {
  const [token, setTokenState] = useState(() => getTemplateToken());
  /** From `GET /auth/validate` (same as `/auth/me` on the server) */
  const [user, setUser] = useState(null);
  /** True until we finish validating a stored token (or know there is none). */
  const [sessionLoading, setSessionLoading] = useState(
    () => Boolean(getTemplateToken()),
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!getTemplateToken()) {
        setUser(null);
        setSessionLoading(false);
        return;
      }

      setSessionLoading(true);
      try {
        const res = await apiGet(paths.authValidate);
        const next = mapMeUser(res?.data);
        if (!cancelled && next) {
          setUser(next);
          return;
        }
        if (!cancelled && getTemplateToken()) {
          clearTemplateToken();
          setTokenState("");
        }
        if (!cancelled) setUser(null);
      } catch {
        if (!cancelled && getTemplateToken()) {
          clearTemplateToken();
          setTokenState("");
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setSession = useCallback((newToken) => {
    setTemplateToken(newToken);
    setTokenState(getTemplateToken());
  }, []);

  const clearSession = useCallback(() => {
    clearTemplateToken();
    setTokenState("");
    setUser(null);
    setSessionLoading(false);
  }, []);

  const applyMeUser = useCallback((data) => {
    const next = mapMeUser(data);
    if (next) setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      sessionLoading,
      isAuthenticated: Boolean(user),
      userId: user?.id ?? null,
      email: user?.email ?? null,
      fullName: user?.fullName ?? "",
      suffix: user?.suffix ?? "",
      eSignFileId: user?.eSignFileId ?? null,
      isSuperAdmin: Boolean(user?.isSuperAdmin),
      isAdmin: Boolean(user?.isAdmin),
      permissionKeys: Array.isArray(user?.permissionKeys) ? user.permissionKeys : [],
      hasAnyPermission: (candidateKeys) => {
        if (Boolean(user?.isSuperAdmin)) {
          return true;
        }
        if (!Array.isArray(candidateKeys) || candidateKeys.length === 0) {
          return false;
        }
        const keySet = new Set(
          Array.isArray(user?.permissionKeys) ? user.permissionKeys : [],
        );
        return candidateKeys.some((key) => keySet.has(key));
      },
      setSession,
      clearSession,
      applyMeUser,
    }),
    [token, user, sessionLoading, setSession, clearSession, applyMeUser],
  );

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (ctx == null) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
