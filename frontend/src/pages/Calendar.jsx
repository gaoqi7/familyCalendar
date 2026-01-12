import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiDelete, apiGet, apiPatch, apiPost } from "../api.js";
import usePoll from "../hooks/usePoll.js";

const Calendar = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    memberId: "",
    title: "",
    startAt: "",
    endAt: "",
    note: "",
    repeatRule: "never",
    repeatUntil: "",
    customFrequency: "daily",
    customInterval: "1"
  });
  const [editingId, setEditingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const load = async () => {
    const [eventsData, membersData] = await Promise.all([
      apiGet("/api/events"),
      apiGet("/api/members")
    ]);
    setEvents(eventsData);
    setMembers(membersData);
  };

  usePoll(load, 30000);

  const deriveRepeatUntil = (repeatRule, repeatUntil, endAt, startAt) => {
    if (repeatRule === "never") return null;
    if (repeatUntil) return repeatUntil;
    const base = endAt || startAt;
    if (!base) return null;
    return new Date(base).toISOString().slice(0, 10);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedRepeatUntil = deriveRepeatUntil(
      form.repeatRule,
      form.repeatUntil,
      form.endAt,
      form.startAt
    );
    const payload = {
      memberId: form.memberId ? Number(form.memberId) : null,
      title: form.title,
      startAt: form.startAt,
      endAt: form.endAt || null,
      note: form.note || null,
      repeatRule: form.repeatRule || null,
      repeatUntil: form.repeatRule !== "never" ? normalizedRepeatUntil : null,
      customFrequency:
        form.repeatRule === "custom" ? form.customFrequency : null,
      customInterval: form.repeatRule === "custom" ? form.customInterval : null
    };
    if (editingId) {
      await apiPatch(`/api/events/${editingId}`, payload);
    } else {
      await apiPost("/api/events", payload);
    }
    setEditingId(null);
    setForm({
      memberId: "",
      title: "",
      startAt: "",
      endAt: "",
      note: "",
      repeatRule: "never",
      repeatUntil: "",
      customFrequency: "daily",
      customInterval: "1"
    });
    await load();
  };

  const parseRecurrence = (value) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };

  const getRepeatSummary = (item) => {
    const rule = parseRecurrence(item.recurrence_rule);
    if (!rule) {
      return t("events.never");
    }
    const preset = rule.preset || "custom";
    const presetLabelMap = {
      every_day: t("events.everyDay"),
      every_week: t("events.everyWeek"),
      every_2_weeks: t("events.everyTwoWeeks"),
      every_month: t("events.everyMonth"),
      every_year: t("events.everyYear"),
      custom: t("events.custom")
    };
    const base = presetLabelMap[preset] || t("events.custom");
    if (preset !== "custom") {
      return item.recurrence_until
        ? `${base} · ${t("events.repeatUntil")}: ${item.recurrence_until}`
        : base;
    }
    const interval = rule.interval || 1;
    const frequency = rule.frequency || "daily";
    const unit =
      frequency === "daily"
        ? t("events.dayUnit")
        : frequency === "weekly"
        ? t("events.weekUnit")
        : frequency === "monthly"
        ? t("events.monthUnit")
        : t("events.yearUnit");
    const customLabel = `${t("events.interval")} ${interval} ${unit}`;
    return item.recurrence_until
      ? `${customLabel} · ${t("events.repeatUntil")}: ${item.recurrence_until}`
      : customLabel;
  };
  const formatDateTime = (value) =>
    value
      ? new Date(value).toLocaleString(i18n.language, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        })
      : "";

  const handleEdit = (item) => {
    const rule = parseRecurrence(item.recurrence_rule);
    const preset = rule?.preset || "never";
    setEditingId(item.id);
    setForm({
      memberId: item.member_id ? String(item.member_id) : "",
      title: item.title,
      startAt: item.start_at ? new Date(item.start_at).toISOString().slice(0, 16) : "",
      endAt: item.end_at ? new Date(item.end_at).toISOString().slice(0, 16) : "",
      note: item.note || "",
      repeatRule: preset || "never",
      repeatUntil: item.recurrence_until || "",
      customFrequency: rule?.frequency || "daily",
      customInterval: rule?.interval ? String(rule.interval) : "1"
    });
  };

  const handleDeleteOne = async (itemId) => {
    await apiDelete(`/api/events/${itemId}`);
    setDeleteTargetId(null);
    setEditingId(null);
    await load();
  };

  const handleDeleteSeries = async (itemId) => {
    await apiDelete(`/api/events/${itemId}/series`);
    setDeleteTargetId(null);
    setEditingId(null);
    await load();
  };

  return (
    <section className="page">
      <h1>{t("calendar.title")}</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>{t("common.member")}</label>
          <select
            value={form.memberId}
            onChange={(e) => setForm({ ...form, memberId: e.target.value })}
          >
            <option value="">{t("common.all")}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>{t("common.title")}</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <label>{t("common.start")}</label>
          <input
            type="datetime-local"
            value={form.startAt}
            onChange={(e) => setForm({ ...form, startAt: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <label>{t("common.end")}</label>
          <input
            type="datetime-local"
            value={form.endAt}
            onChange={(e) => setForm({ ...form, endAt: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label>{t("common.note")}</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="form-row">
          <label>{t("events.repeat")}</label>
          <select
            value={form.repeatRule}
            onChange={(e) =>
              setForm({ ...form, repeatRule: e.target.value })
            }
          >
            <option value="never">{t("events.never")}</option>
            <option value="every_day">{t("events.everyDay")}</option>
            <option value="every_week">{t("events.everyWeek")}</option>
            <option value="every_2_weeks">{t("events.everyTwoWeeks")}</option>
            <option value="every_month">{t("events.everyMonth")}</option>
            <option value="every_year">{t("events.everyYear")}</option>
            <option value="custom">{t("events.custom")}</option>
          </select>
        </div>
        {form.repeatRule === "custom" ? (
          <>
            <div className="form-row">
              <label>{t("events.frequency")}</label>
              <select
                value={form.customFrequency}
                onChange={(e) =>
                  setForm({ ...form, customFrequency: e.target.value })
                }
              >
                <option value="daily">{t("events.daily")}</option>
                <option value="weekly">{t("events.weekly")}</option>
                <option value="monthly">{t("events.monthly")}</option>
                <option value="yearly">{t("events.yearly")}</option>
              </select>
            </div>
            <div className="form-row">
              <label>{t("events.interval")}</label>
              <div className="inline-form">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.customInterval}
                  onChange={(e) =>
                    setForm({ ...form, customInterval: e.target.value })
                  }
                  required
                />
                <span className="interval-unit">
                  {form.customFrequency === "daily"
                    ? t("events.dayUnit")
                    : form.customFrequency === "weekly"
                    ? t("events.weekUnit")
                    : form.customFrequency === "monthly"
                    ? t("events.monthUnit")
                    : t("events.yearUnit")}
                </span>
              </div>
            </div>
          </>
        ) : null}
        {form.repeatRule !== "never" ? (
          <div className="form-row">
            <label>{t("events.repeatUntil")}</label>
            <input
              type="date"
              value={
                form.repeatUntil ||
                deriveRepeatUntil(
                  form.repeatRule,
                  "",
                  form.endAt,
                  form.startAt
                ) ||
                ""
              }
              onChange={(e) =>
                setForm({ ...form, repeatUntil: e.target.value })
              }
              required
            />
          </div>
        ) : null}
        <div className="form-actions">
          <button type="submit">
            {editingId ? t("events.save") : t("calendar.addEvent")}
          </button>
          {editingId ? (
            <div className="delete-options">
              {deleteTargetId === editingId ? (
                <>
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    onClick={() => handleDeleteOne(editingId)}
                  >
                    {t("events.deleteOne")}
                  </button>
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    onClick={() => handleDeleteSeries(editingId)}
                  >
                    {t("events.deleteSeries")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ghost-button danger-button"
                  onClick={() => setDeleteTargetId(editingId)}
                >
                  {t("events.delete")}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </form>

      <div className="list">
        {events.map((item) => (
          <div key={item.id} className="list-item">
            <div className="list-content">
              <div className="list-title">{item.title}</div>
              <div className="list-meta">
                {formatDateTime(item.start_at)}
                {item.end_at ? ` - ${formatDateTime(item.end_at)}` : ""}
              </div>
              <div className="list-meta">{getRepeatSummary(item)}</div>
            </div>
            <button
              type="button"
              className="ghost-button list-edit"
              onClick={() => handleEdit(item)}
            >
              {t("events.edit")}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Calendar;
