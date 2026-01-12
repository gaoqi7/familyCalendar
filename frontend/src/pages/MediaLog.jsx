import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiUpload } from "../api.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const MediaLog = () => {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({
    memberId: "",
    logDate: "",
    mediaType: "photo",
    note: "",
    file: null
  });

  const load = async () => {
    const [memberData, logData] = await Promise.all([
      apiGet("/api/members"),
      apiGet("/api/media-logs")
    ]);
    setMembers(memberData);
    setLogs(logData);
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.file) {
      return;
    }
    const formData = new FormData();
    formData.append("file", form.file);
    formData.append("memberId", form.memberId);
    formData.append("logDate", form.logDate);
    formData.append("mediaType", form.mediaType);
    formData.append("note", form.note);
    await apiUpload("/api/media-logs", formData);
    setForm({ memberId: "", logDate: "", mediaType: "photo", note: "", file: null });
    await load();
  };

  return (
    <section className="page">
      <h1>{t("media.title")}</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>{t("common.member")}</label>
          <select
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            required
          >
            <option value="">{t("common.select")}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>{t("common.date")}</label>
          <input
            type="date"
            value={form.logDate}
            onChange={(e) => setForm({ ...form, logDate: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <label>{t("common.type")}</label>
          <select
            value={form.mediaType}
            onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
          >
            <option value="photo">Photo</option>
            <option value="video">Video ({'<=60s'})</option>
          </select>
        </div>
        <div className="form-row">
          <label>{t("media.note")}</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label>{t("common.file")}</label>
          <input
            type="file"
            accept={form.mediaType === "photo" ? "image/*" : "video/*"}
            onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
            required
          />
        </div>
        <button type="submit">{t("media.addMedia")}</button>
      </form>

      <div className="media-grid">
        {logs.map((log) => (
          <div key={log.id} className="media-card">
            {log.media_type === "photo" ? (
              <img src={`${API_BASE}${log.file_path}`} alt="Daily" />
            ) : (
              <video controls src={`${API_BASE}${log.file_path}`} />
            )}
            <div className="media-meta">
              <div>{log.log_date}</div>
              <div>{log.note}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MediaLog;
