import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiPost } from "../api.js";

const Login = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(false);
    try {
      await apiPost("/api/login", form);
      onSuccess();
    } catch (err) {
      setError(true);
    }
  };

  return (
    <section className="page auth-page">
      <h1>{t("auth.title")}</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>{t("auth.username")}</label>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <label>{t("auth.password")}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        {error ? <div className="error-text">{t("auth.error")}</div> : null}
        <button type="submit">{t("auth.signIn")}</button>
      </form>
    </section>
  );
};

export default Login;
