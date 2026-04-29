import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";
import { useUser } from "./context/UserContext.jsx";
import { publicAssetUrlForDisplay } from "./lib/publicAssetDisplayUrl.js";
import { AdminFab } from "./components/AdminFab.jsx";
import { AdminRbacPage } from "./pages/admin/AdminRbacPage.jsx";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage.jsx";
import { AdminAppPage } from "./pages/admin/AdminAppPage.jsx";
import { LocationPage } from "./pages/LocationPage.jsx";
import { HomeOpportunityPage } from "./pages/opportunity/HomeOpportunityPage.jsx";
import { ExternalOrgPage } from "./pages/ExternalOrgPage.jsx";
import { OpportunityPage } from "./pages/opportunity/OpportunityPage.jsx";
import { OpportunityDetailPage } from "./pages/opportunity/OpportunityDetailPage.jsx";
import { OpportunityDataEntryPage } from "./pages/opportunity/OpportunityDataEntryPage.jsx";
import { StatusManagerPage } from "./pages/StatusManagerPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { MarketSegmentPage } from "./pages/MarketSegmentPage.jsx";
import { VendorPage } from "./pages/VendorPage.jsx";

const navLinkClass = ({ isActive }) =>
  `rounded-md px-2 py-1.5 text-sm transition-colors ${
    isActive
      ? "font-medium text-primary"
      : "text-zinc-600 hover:text-primary dark:text-zinc-400"
  }`;

function AppShell() {
  const { apiBaseUrl, branding, brandingLoaded } = useApp();
  const { isAuthenticated, email, clearSession } = useUser();

  const appTitle = branding?.appName ?? "Template";
  const showLoginLink =
    !brandingLoaded || branding == null || branding.openLogin !== false;
  const showRegisterLink =
    !brandingLoaded || branding == null || branding.openRegister !== false;

  return (
    <div className="flex min-h-dvh flex-col text-left">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <NavLink
          to="/"
          className="flex items-center gap-2 font-semibold text-zinc-900 transition-colors hover:text-primary dark:text-zinc-100"
        >
          {branding?.appLogo ? (
            <img
              src={publicAssetUrlForDisplay(branding.appLogo)}
              alt=""
              className="size-8 rounded-md object-cover"
              width={32}
              height={32}
            />
          ) : null}
          <span>{appTitle}</span>
        </NavLink>
        <nav className="flex flex-wrap items-center gap-2 sm:gap-4">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          {!isAuthenticated ? (
            <>
              {showLoginLink ? (
                <NavLink to="/login" className={navLinkClass}>
                  Log in
                </NavLink>
              ) : null}
              {showRegisterLink ? (
                <NavLink to="/register" className={navLinkClass}>
                  Register
                </NavLink>
              ) : null}
            </>
          ) : (
            <>
              {email ? (
                <span
                  className="max-w-[12rem] truncate text-sm text-zinc-600 dark:text-zinc-400"
                  title={email}
                >
                  {email}
                </span>
              ) : null}
              <button
                type="button"
                className="text-sm text-primary underline-offset-2 transition-colors hover:text-primary-2 hover:underline"
                onClick={() => clearSession()}
              >
                Log out
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin/rbac" element={<AdminRbacPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/app" element={<AdminAppPage />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/opportunity" element={<HomeOpportunityPage />} />
          <Route path="/opportunity/manage" element={<OpportunityPage />} />
          <Route path="/opportunity/manage/:id" element={<OpportunityDetailPage />} />
          <Route path="/data-entry/line-of-business" element={<OpportunityDataEntryPage />} />
          <Route path="/data-entry/external-org" element={<ExternalOrgPage />} />
          <Route path="/data-entry/market-segment" element={<MarketSegmentPage />} />
          <Route path="/data-entry/vendor" element={<VendorPage />} />
          <Route path="/data-entry/status-manager" element={<StatusManagerPage />} />
        </Routes>
      </main>
      <AdminFab />
      <footer className="border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        API:{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.8rem] dark:bg-zinc-800">
          {apiBaseUrl}
        </code>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
