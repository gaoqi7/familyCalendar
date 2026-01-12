import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost } from "../api.js";
import usePoll from "../hooks/usePoll.js";

const Habits = () => {
  const { t } = useTranslation();
  const [habits, setHabits] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ memberId: "", name: "", frequency: "daily" });
  const [logForm, setLogForm] = useState({ habitId: "", memberId: "", logDate: "", status: "done" });

  const load = async () => {
    const [habitData, memberData] = await Promise.all([
      apiGet("/api/habits"),
      apiGet("/api/members")
    ]);
    setHabits(habitData);
    setMembers(memberData);
  };

  usePoll(load, 30000);

  const handleHabitSubmit = async (event) => {
    event.preventDefault();
    await apiPost("/api/habits", {
      ...form,
      memberId: form.memberId ? Number(form.memberId) : null
    });
    setForm({ memberId: "", name: "", frequency: "daily" });
    await load();
  };

  const handleLogSubmit = async (event) => {
    event.preventDefault();
    await apiPost("/api/habit-logs", {
      ...logForm,
      habitId: Number(logForm.habitId),
      memberId: logForm.memberId ? Number(logForm.memberId) : null
    });
    setLogForm({ habitId: "", memberId: "", logDate: "", status: "done" });
  };

  return (
    <section className="page">
      <h1>{t("habits.title")}</h1>
      <form className="card form" onSubmit={handleHabitSubmit}>
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
          <label>{t("common.name")}</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <label>{t("common.frequency")}</label>
          <select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <button type="submit">{t("habits.addHabit")}</button>
      </form>

      <form className="card form" onSubmit={handleLogSubmit}>
        <div className="form-row">
          <label>{t("common.habit")}</label>
          <select
            value={logForm.habitId}
            onChange={(e) => setLogForm({ ...logForm, habitId: e.target.value })}
            required
          >
            <option value="">{t("common.select")}</option>
            {habits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>{t("common.member")}</label>
          <select
            value={logForm.memberId}
            onChange={(e) => setLogForm({ ...logForm, memberId: e.target.value })}
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
          <label>{t("common.date")}</label>
          <input
            type="date"
            value={logForm.logDate}
            onChange={(e) => setLogForm({ ...logForm, logDate: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <label>{t("common.status")}</label>
          <select
            value={logForm.status}
            onChange={(e) => setLogForm({ ...logForm, status: e.target.value })}
          >
            <option value="done">Done</option>
            <option value="skip">Skip</option>
          </select>
        </div>
        <button type="submit">Log</button>
      </form>

      <div className="list">
        {habits.map((habit) => (
          <div key={habit.id} className="list-item">
            <div className="list-title">{habit.name}</div>
            <div className="list-meta">{habit.frequency}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Habits;
