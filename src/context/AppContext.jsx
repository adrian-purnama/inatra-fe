/* eslint-disable react-refresh/only-export-components -- context + hook module */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_BASE_URL, apiGet, paths } from "../lib/api.js";

const AppContext = createContext(null);

/** @typedef {{ appName: string; appLogo: string; openRegister: boolean; openLogin: boolean }} Branding */

export function AppProvider({ children }) {
  /** @type {[Branding | null, import('react').Dispatch<import('react').SetStateAction<Branding | null>>]} */
  const [branding, setBranding] = useState(null);
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiGet(paths.branding);
        const d = res?.data;
        if (
          !cancelled &&
          d &&
          typeof d.appName === "string" &&
          typeof d.appLogo === "string"
        ) {
          setBranding({
            appName: d.appName,
            appLogo: d.appLogo,
            openRegister: Boolean(d.openRegister),
            openLogin: Boolean(d.openLogin),
          });
        }
      } catch {
        if (!cancelled) setBranding(null);
      } finally {
        if (!cancelled) setBrandingLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshBranding = useCallback(async () => {
    try {
      const res = await apiGet(paths.branding);
      const d = res?.data;
      if (
        d &&
        typeof d.appName === "string" &&
        typeof d.appLogo === "string"
      ) {
        setBranding({
          appName: d.appName,
          appLogo: d.appLogo,
          openRegister: Boolean(d.openRegister),
          openLogin: Boolean(d.openLogin),
        });
      }
    } catch {
      setBranding(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      apiBaseUrl: API_BASE_URL,
      paths,
      /** From `GET /branding` — `null` if not loaded yet or request failed */
      branding,
      /** `true` after the first branding fetch attempt finishes */
      brandingLoaded,
      /** Re-fetch public branding after admin updates app settings */
      refreshBranding,
    }),
    [branding, brandingLoaded, refreshBranding],
  );

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (ctx == null) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
