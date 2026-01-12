import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";
import Habits from "./pages/Habits.jsx";
import MediaLog from "./pages/MediaLog.jsx";
import Settings from "./pages/Settings.jsx";
import Login from "./pages/Login.jsx";
import { apiGet } from "./api.js";
import { setLanguage } from "./i18n.js";

const App = () => {
  const { t } = useTranslation();
  const [authState, setAuthState] = useState({
    loading: true,
    authenticated: false
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("language");
    if (stored) {
      return;
    }
    apiGet("/api/household")
      .then((household) => {
        if (household?.default_language) {
          setLanguage(household.default_language);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    apiGet("/api/session")
      .then((data) => {
        setAuthState({ loading: false, authenticated: data.authenticated });
      })
      .catch(() => {
        setAuthState({ loading: false, authenticated: false });
      });
  }, []);

  if (authState.loading) {
    return <div className="page">Loading...</div>;
  }

  if (!authState.authenticated) {
    return (
      <Login
        onSuccess={() => setAuthState({ loading: false, authenticated: true })}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header" aria-hidden="true" />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/media" element={<MediaLog />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      {location.pathname === "/settings" ? (
        <button
          type="button"
          className="settings-fab"
          aria-label={t("calendarMonth.back")}
          onClick={() => navigate("/")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7.4 6.4L2 11.8l5.4 5.4 1.4-1.4-3-3H22v-2H5.8l3-3-1.4-1.4Z" />
          </svg>
        </button>
      ) : (
        <NavLink to="/settings" className="settings-fab" aria-label={t("nav.settings")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Zm8.6 3.5c0-.5-.04-1-.12-1.47l-2.2-.34a6.8 6.8 0 0 0-.84-2.02l1.33-1.79a9.3 9.3 0 0 0-2.08-2.08l-1.79 1.33c-.64-.36-1.33-.64-2.02-.84l-.34-2.2A8.7 8.7 0 0 0 12 2c-.5 0-1 .04-1.47.12l-.34 2.2c-.7.2-1.38.48-2.02.84L6.38 3.83a9.3 9.3 0 0 0-2.08 2.08l1.33 1.79c-.36.64-.64 1.33-.84 2.02l-2.2.34A8.7 8.7 0 0 0 2 12c0 .5.04 1 .12 1.47l2.2.34c.2.7.48 1.38.84 2.02l-1.33 1.79a9.3 9.3 0 0 0 2.08 2.08l1.79-1.33c.64.36 1.33.64 2.02.84l.34 2.2c.48.08.98.12 1.47.12s1-.04 1.47-.12l.34-2.2c.7-.2 1.38-.48 2.02-.84l1.79 1.33a9.3 9.3 0 0 0 2.08-2.08l-1.33-1.79c.36-.64.64-1.33.84-2.02l2.2-.34c.08-.48.12-.98.12-1.47Z" />
          </svg>
        </NavLink>
      )}
    </div>
  );
};

export default App;
