import { useApp } from "../context/AppContext.jsx";
import { publicAssetUrlForDisplay } from "../lib/publicAssetDisplayUrl.js";

/** App name + logo from `GET /branding` (via `AppContext`). */
export function AuthBranding() {
  const { branding } = useApp();
  const appName = branding?.appName ?? "Template";

  return (
    <div className="mb-6 flex flex-col items-center gap-3 text-center">
      {branding?.appLogo ? (
        <img
          src={publicAssetUrlForDisplay(branding.appLogo)}
          alt=""
          className="size-14 rounded-xl object-cover shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
          width={56}
          height={56}
        />
      ) : null}
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {appName}
      </h1>
    </div>
  );
}
