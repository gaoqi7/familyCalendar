import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiDelete, apiGet, apiPatch, apiPost } from "../api.js";

const getMonthMatrix = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push(date);
  }
  return days;
};

const toDateKey = (dateString) => dateString?.slice(0, 10);

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [view, setView] = useState("month");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const nextDayRef = useRef(null);
  const [eventForm, setEventForm] = useState({
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
  const [habitForm, setHabitForm] = useState({
    memberId: "",
    name: "",
    frequency: "daily"
  });

  useEffect(() => {
    const load = async () => {
      const [eventsData, habitsData, habitLogData, membersData] =
        await Promise.all([
          apiGet("/api/events"),
          apiGet("/api/habits"),
          apiGet("/api/habit-logs"),
          apiGet("/api/members")
        ]);
      setEvents(eventsData);
      setHabits(habitsData);
      setHabitLogs(habitLogData);
      setMembers(membersData);
    };
    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (view !== "day") {
      return;
    }
    if (nextDayRef.current) {
      nextDayRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest"
      });
    }
  }, [view, selectedDate]);

  useEffect(() => {
    const hideSettings = showEventForm || view === "day";
    document.body.classList.toggle("hide-settings-fab", hideSettings);
    document.body.classList.toggle("day-view-active", view === "day");
    return () => {
      document.body.classList.remove("hide-settings-fab");
      document.body.classList.remove("day-view-active");
    };
  }, [showEventForm, view]);

  const eventsByDate = useMemo(() => {
    const grouped = {};
    events.forEach((event) => {
      const key = toDateKey(event.start_at);
      if (!key) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    return grouped;
  }, [events]);

  const monthLabel = monthDate.toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long"
  });
  const monthDays = getMonthMatrix(monthDate);
  const weekdayLabels = Array.from({ length: 7 }).map((_, index) => {
    const base = new Date(2024, 0, 1 + index);
    return base.toLocaleDateString(i18n.language, { weekday: "short" });
  });
  const memberMap = useMemo(() => {
    const map = {};
    members.forEach((member) => {
      map[member.id] = member.name;
    });
    return map;
  }, [members]);
  const memberAvatarMap = useMemo(() => {
    const map = {};
    members.forEach((member) => {
      map[member.id] = member.avatar_path || "";
    });
    return map;
  }, [members]);
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
  const formatDateTimeLocal = (date, hour) => {
    const copy = new Date(date);
    copy.setHours(hour, 0, 0, 0);
    return copy.toISOString().slice(0, 16);
  };
  const toDateTimeLocal = (value) =>
    value ? new Date(value).toISOString().slice(0, 16) : "";
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
    if (preset !== "custom") {
      return item.recurrence_until
        ? `${presetLabelMap[preset] || t("events.custom")} ${t(
            "events.untilShort"
          )} ${item.recurrence_until}`
        : presetLabelMap[preset] || t("events.custom");
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
    const base = `${t("events.interval")} ${interval} ${unit}`;
    return item.recurrence_until
      ? `${base} ${t("events.untilShort")} ${item.recurrence_until}`
      : base;
  };

  if (view === "day") {
    const dayKey = selectedDate.toISOString().slice(0, 10);
    const dayEvents = eventsByDate[dayKey] || [];
    const groupedEvents = dayEvents.reduce((acc, event) => {
      const key = event.member_id ? String(event.member_id) : "all";
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});
    const dayHabitLogs = habitLogs.filter((log) => log.log_date === dayKey);
    const habitStatus = new Map(
      dayHabitLogs.map((log) => [log.habit_id, log.status])
    );
    const dayLabel = selectedDate.toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const weekdayLabel = selectedDate.toLocaleDateString(i18n.language, {
      weekday: "long"
    });
    const weekBase = new Date(selectedDate);
    weekBase.setDate(weekBase.getDate() - 7);
    const weekDays = Array.from({ length: 28 }).map((_, index) => {
      const date = new Date(weekBase);
      date.setDate(weekBase.getDate() + index);
      return date;
    });
    const nextDayKey = new Date(selectedDate);
    nextDayKey.setDate(nextDayKey.getDate() + 1);
    const nextDayKeyString = nextDayKey.toISOString().slice(0, 10);
    const deriveRepeatUntil = (repeatRule, repeatUntil, endAt, startAt) => {
      if (repeatRule === "never") return null;
      if (repeatUntil) return repeatUntil;
      const base = endAt || startAt;
      if (!base) return null;
      return new Date(base).toISOString().slice(0, 10);
    };

    const handleEventSubmit = async (event) => {
      event.preventDefault();
      const normalizedRepeatUntil = deriveRepeatUntil(
        eventForm.repeatRule,
        eventForm.repeatUntil,
        eventForm.endAt,
        eventForm.startAt
      );
      const payload = {
        ...eventForm,
        memberId: eventForm.memberId ? Number(eventForm.memberId) : null,
        repeatRule: eventForm.repeatRule || null,
        repeatUntil:
          eventForm.repeatRule !== "never" ? normalizedRepeatUntil : null,
        customFrequency:
          eventForm.repeatRule === "custom" ? eventForm.customFrequency : null,
        customInterval:
          eventForm.repeatRule === "custom" ? eventForm.customInterval : null
      };
      if (editingEventId) {
        await apiPatch(`/api/events/${editingEventId}`, payload);
      } else {
        await apiPost("/api/events", payload);
      }
      setEventForm({
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
      setEditingEventId(null);
      setShowEventForm(false);
      const eventsData = await apiGet("/api/events");
      setEvents(eventsData);
    };
    const handleHabitSubmit = async (event) => {
      event.preventDefault();
      await apiPost("/api/habits", {
        ...habitForm,
        memberId: habitForm.memberId ? Number(habitForm.memberId) : null
      });
      setHabitForm({ memberId: "", name: "", frequency: "daily" });
      setShowHabitForm(false);
      const habitsData = await apiGet("/api/habits");
      setHabits(habitsData);
    };
    const handleHabitLog = async (habitId, status, memberId) => {
      await apiPost("/api/habit-logs", {
        habitId,
        memberId: memberId ?? null,
        logDate: dayKey,
        status
      });
      const logsData = await apiGet("/api/habit-logs");
      setHabitLogs(logsData);
    };
    const handleDeleteOne = async (itemId) => {
      await apiDelete(`/api/events/${itemId}`);
      setDeleteTargetId(null);
      const eventsData = await apiGet("/api/events");
      setEvents(eventsData);
    };
    const handleDeleteSeries = async (itemId) => {
      await apiDelete(`/api/events/${itemId}/series`);
      setDeleteTargetId(null);
      const eventsData = await apiGet("/api/events");
      setEvents(eventsData);
    };
    const handleEditEvent = (eventItem) => {
      const rule = parseRecurrence(eventItem.recurrence_rule);
      const preset = rule?.preset || "never";
      setEditingEventId(eventItem.id);
      setEventForm({
        memberId: eventItem.member_id ? String(eventItem.member_id) : "",
        title: eventItem.title,
        startAt: toDateTimeLocal(eventItem.start_at),
        endAt: eventItem.end_at ? toDateTimeLocal(eventItem.end_at) : "",
        note: eventItem.note || "",
        repeatRule: preset || "never",
        repeatUntil: eventItem.recurrence_until || "",
        customFrequency: rule?.frequency || "daily",
        customInterval: rule?.interval ? String(rule.interval) : "1"
      });
      setShowEventForm(true);
    };
    return (
      <section className="page">
        <div className="day-header">
          <h1>
            {dayLabel}
            <span className="weekday-label"> · {weekdayLabel}</span>
          </h1>
        </div>
        <div className="day-layout">
          <div className="day-main">
            <div className="day-actions mobile-only">
              <button
                type="button"
                onClick={() => {
                  setEventForm((prev) => ({
                    ...prev,
                    startAt: formatDateTimeLocal(selectedDate, 9),
                    endAt: formatDateTimeLocal(selectedDate, 10)
                  }));
                  setShowEventForm((prev) => !prev);
                }}
              >
                {t("calendar.addEvent")}
              </button>
              <button
                type="button"
                onClick={() => setShowHabitForm((prev) => !prev)}
              >
                {t("habits.addHabit")}
              </button>
              <button type="button" onClick={() => setView("month")}>
                {t("calendarMonth.back")}
              </button>
            </div>

            {showEventForm ? (
              <form className="card form" onSubmit={handleEventSubmit}>
            <div className="form-row">
              <label>{t("common.member")}</label>
              <select
                value={eventForm.memberId}
                onChange={(e) =>
                  setEventForm({ ...eventForm, memberId: e.target.value })
                }
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
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <label>{t("common.start")}</label>
              <input
                type="datetime-local"
                value={eventForm.startAt}
                onChange={(e) =>
                  setEventForm({ ...eventForm, startAt: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <label>{t("common.end")}</label>
              <input
                type="datetime-local"
                value={eventForm.endAt}
                onChange={(e) =>
                  setEventForm({ ...eventForm, endAt: e.target.value })
                }
              />
            </div>
            <div className="form-row">
              <label>{t("common.note")}</label>
              <textarea
                value={eventForm.note}
                onChange={(e) =>
                  setEventForm({ ...eventForm, note: e.target.value })
                }
              />
            </div>
            <div className="form-row">
              <label>{t("events.repeat")}</label>
              <select
                value={eventForm.repeatRule}
                onChange={(e) =>
                  setEventForm({ ...eventForm, repeatRule: e.target.value })
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
            {eventForm.repeatRule === "custom" ? (
              <>
                <div className="form-row">
                  <label>{t("events.frequency")}</label>
                  <select
                    value={eventForm.customFrequency}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        customFrequency: e.target.value
                      })
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
                      value={eventForm.customInterval}
                      onChange={(e) =>
                        setEventForm({
                          ...eventForm,
                          customInterval: e.target.value
                        })
                      }
                      required
                    />
                    <span className="interval-unit">
                      {eventForm.customFrequency === "daily"
                        ? t("events.dayUnit")
                        : eventForm.customFrequency === "weekly"
                        ? t("events.weekUnit")
                        : eventForm.customFrequency === "monthly"
                        ? t("events.monthUnit")
                        : t("events.yearUnit")}
                    </span>
                  </div>
                </div>
              </>
            ) : null}
            {eventForm.repeatRule !== "never" ? (
              <div className="form-row">
                <label>{t("events.repeatUntil")}</label>
                <input
                  type="date"
                  value={
                    eventForm.repeatUntil ||
                    deriveRepeatUntil(
                      eventForm.repeatRule,
                      "",
                      eventForm.endAt,
                      eventForm.startAt
                    ) ||
                    ""
                  }
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      repeatUntil: e.target.value
                    })
                  }
                  required
                />
              </div>
            ) : null}
            <button type="submit">
              {editingEventId ? t("events.save") : t("calendar.addEvent")}
            </button>
          </form>
        ) : null}

            {showHabitForm ? (
              <form className="card form" onSubmit={handleHabitSubmit}>
            <div className="form-row">
              <label>{t("common.member")}</label>
              <select
                value={habitForm.memberId}
                onChange={(e) =>
                  setHabitForm({ ...habitForm, memberId: e.target.value })
                }
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
              <label>{t("common.name")}</label>
              <input
                value={habitForm.name}
                onChange={(e) =>
                  setHabitForm({ ...habitForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <label>{t("common.frequency")}</label>
              <select
                value={habitForm.frequency}
                onChange={(e) =>
                  setHabitForm({ ...habitForm, frequency: e.target.value })
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <button type="submit">{t("habits.addHabit")}</button>
              </form>
            ) : null}

            <div className="day-sections">
              <div className="day-section">
            <h2>{t("nav.calendar")}</h2>
            <div className="day-list">
              {dayEvents.length === 0 ? (
                <div className="card empty-state">
                  {t("calendarMonth.emptyDay")}
                </div>
              ) : (
                Object.entries(groupedEvents).map(([memberId, items]) => (
                  <div key={memberId} className="member-group">
                    <div className="member-badge">
                      {memberId !== "all" && memberAvatarMap[memberId] ? (
                        <img
                          src={`${apiBase}${memberAvatarMap[memberId]}`}
                          alt={memberMap[memberId] || t("common.member")}
                        />
                      ) : (
                        <div className="member-avatar placeholder">
                          {(memberMap[memberId] || t("common.all"))
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="member-name">
                        {memberId === "all"
                          ? t("common.all")
                          : memberMap[memberId] || t("common.member")}
                      </div>
                    </div>
                    <div className="member-events">
                      {items.map((event) => (
                        <div key={event.id} className="card event-card">
                          <div className="event-info">
                            <div className="list-title">{event.title}</div>
                            <div className="list-meta">
                              {formatDateTime(event.start_at)}
                              {event.end_at
                                ? ` - ${formatDateTime(event.end_at)}`
                                : ""}
                            </div>
                            <div className="list-meta">
                              {getRepeatSummary(event)}
                            </div>
                            {event.note ? (
                              <div className="list-meta">{event.note}</div>
                            ) : null}
                          </div>
                          <div className="list-actions vertical">
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => handleEditEvent(event)}
                            >
                              {t("events.edit")}
                            </button>
                            {deleteTargetId === event.id ? (
                              <div className="delete-options vertical">
                                <button
                                  type="button"
                                  className="ghost-button danger-button"
                                  onClick={() => handleDeleteOne(event.id)}
                                >
                                  {t("events.deleteOne")}
                                </button>
                                <button
                                  type="button"
                                  className="ghost-button danger-button"
                                  onClick={() => handleDeleteSeries(event.id)}
                                >
                                  {t("events.deleteSeries")}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="ghost-button danger-button"
                                onClick={() => setDeleteTargetId(event.id)}
                              >
                                {t("events.delete")}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
              </div>
              <div className="day-section">
            <h2>{t("nav.habits")}</h2>
            <div className="habit-todo">
              {habits.map((habit) => {
                const status = habitStatus.get(habit.id);
                return (
                  <div key={habit.id} className="card habit-item">
                    <div>
                      <div className="list-title">{habit.name}</div>
                      <div className="list-meta">
                        {habit.member_id
                          ? memberMap[habit.member_id] || t("common.member")
                          : t("common.all")}
                      </div>
                      {status ? (
                        <div className="list-meta">
                          {t(`common.${status}`)}
                        </div>
                      ) : null}
                    </div>
                    <div className="habit-actions">
                      <button
                        type="button"
                        onClick={() =>
                          handleHabitLog(habit.id, "done", habit.member_id)
                        }
                      >
                        {t("common.done")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleHabitLog(habit.id, "skip", habit.member_id)
                        }
                      >
                        {t("common.skip")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
              </div>
            </div>
          </div>
          <div className="day-tags">
            <button
              type="button"
              onClick={() => {
                setEventForm((prev) => ({
                  ...prev,
                  startAt: formatDateTimeLocal(selectedDate, 9),
                  endAt: formatDateTimeLocal(selectedDate, 10)
                }));
                setShowEventForm(true);
                setShowHabitForm(false);
              }}
            >
              {t("calendar.addEvent")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowHabitForm(true);
                setShowEventForm(false);
              }}
            >
              {t("habits.addHabit")}
            </button>
            {(showEventForm || showHabitForm) ? (
              <button type="button" onClick={() => setView("month")}>
                {t("calendarMonth.back")}
              </button>
            ) : null}
          </div>
        </div>
        <div className="week-strip">
          <div className="week-scroll">
            {weekDays.map((date) => {
              const key = date.toISOString().slice(0, 10);
              const isSelected = key === dayKey;
              const dayEvents = eventsByDate[key] || [];
              return (
                <div
                  key={key}
                  className={`week-cell ${isSelected ? "is-selected" : ""}`}
                  ref={key === nextDayKeyString ? nextDayRef : null}
                  onClick={() => setSelectedDate(date)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setSelectedDate(date);
                    }
                  }}
                >
                  <div className="week-date">
                    {date.toLocaleDateString(i18n.language, {
                      weekday: "short",
                      day: "numeric",
                      month: "short"
                    })}
                  </div>
                  <div className="week-weekday">
                    {date.toLocaleDateString(i18n.language, {
                      weekday: "long"
                    })}
                  </div>
                  <div className="week-events">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="week-event">
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 ? (
                      <div className="week-more">+{dayEvents.length - 2}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {view === "day" ? (
          <button
            type="button"
            className="dashboard-fab"
            aria-label={t("calendarMonth.back")}
            onClick={() => {
              setShowEventForm(false);
              setView("month");
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.4 6.4L2 11.8l5.4 5.4 1.4-1.4-3-3H22v-2H5.8l3-3-1.4-1.4Z" />
            </svg>
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="page">
      <div className="month-header">
        <h1>{monthLabel}</h1>
        <div className="month-actions">
          <button
            type="button"
            onClick={() =>
              setMonthDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
              )
            }
          >
            {t("calendarMonth.prev")}
          </button>
          <button type="button" onClick={() => setMonthDate(new Date())}>
            {t("calendarMonth.today")}
          </button>
          <button
            type="button"
            onClick={() =>
              setMonthDate(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
              )
            }
          >
            {t("calendarMonth.next")}
          </button>
        </div>
      </div>

      <div className="month-grid">
        {weekdayLabels.map((label) => (
          <div key={label} className="month-weekday">
            {label}
          </div>
        ))}
        {monthDays.map((date) => {
          const key = date.toISOString().slice(0, 10);
          const isCurrentMonth = date.getMonth() === monthDate.getMonth();
          const isToday = key === new Date().toISOString().slice(0, 10);
          const dayEvents = eventsByDate[key] || [];
          return (
            <div
              key={key}
              className={`month-cell ${isCurrentMonth ? "" : "is-muted"} ${
                isToday ? "is-today" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedDate(date);
                setView("day");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setSelectedDate(date);
                  setView("day");
                }
              }}
            >
              <div className="month-date">{date.getDate()}</div>
            <div className="month-events">
              {dayEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="month-event">
                  {event.title}
                </div>
              ))}
                {dayEvents.length > 3 ? (
                  <div className="month-more">
                    +{dayEvents.length - 3}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Dashboard;
