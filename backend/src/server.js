import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import session from "express-session";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);
app.use("/uploads", express.static(path.resolve("backend/uploads")));

const upload = multer({
  dest: path.resolve("backend/uploads"),
  limits: { fileSize: 200 * 1024 * 1024 }
});

const now = () => new Date().toISOString();
const makeRecurrenceId = () =>
  `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/session", (req, res) => {
  const username = process.env.HOUSEHOLD_USERNAME;
  const authenticated = Boolean(req.session?.user && req.session.user === username);
  res.json({ authenticated });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.HOUSEHOLD_USERNAME;
  const expectedPass = process.env.HOUSEHOLD_PASSWORD;
  if (!expectedUser || !expectedPass) {
    res.status(500).json({ error: "server not configured" });
    return;
  }
  if (username === expectedUser && password === expectedPass) {
    req.session.user = username;
    res.json({ ok: true });
    return;
  }
  res.status(401).json({ error: "invalid credentials" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

const authGuard = (req, res, next) => {
  const username = process.env.HOUSEHOLD_USERNAME;
  if (req.session?.user && req.session.user === username) {
    next();
    return;
  }
  res.status(401).json({ error: "unauthorized" });
};

app.use("/api", authGuard);

app.get("/api/household", (req, res) => {
  const household = db
    .prepare("SELECT id, name, default_language FROM household WHERE id = 1")
    .get();
  res.json(household);
});

app.patch("/api/household", (req, res) => {
  const { name, defaultLanguage } = req.body;
  db.prepare(
    "UPDATE household SET name = COALESCE(?, name), default_language = COALESCE(?, default_language) WHERE id = 1"
  ).run(name ?? null, defaultLanguage ?? null);
  const updated = db
    .prepare("SELECT id, name, default_language FROM household WHERE id = 1")
    .get();
  res.json(updated);
});

app.get("/api/members", (req, res) => {
  const members = db
    .prepare("SELECT * FROM member WHERE household_id = 1 ORDER BY id DESC")
    .all();
  res.json(members);
});

app.post("/api/members", (req, res) => {
  const { name, avatarColor } = req.body;
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const result = db
    .prepare(
      "INSERT INTO member (household_id, name, avatar_color, created_at) VALUES (1, ?, ?, ?)"
    )
    .run(name, avatarColor ?? null, now());
  const member = db
    .prepare("SELECT * FROM member WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(member);
});

app.patch("/api/members/:id", (req, res) => {
  const memberId = Number(req.params.id);
  const { name, avatarColor } = req.body;
  if (!memberId) {
    res.status(400).json({ error: "invalid member id" });
    return;
  }
  if (!name && !avatarColor) {
    res.status(400).json({ error: "name or avatarColor required" });
    return;
  }
  db.prepare(
    "UPDATE member SET name = COALESCE(?, name), avatar_color = COALESCE(?, avatar_color) WHERE id = ?"
  ).run(name ?? null, avatarColor ?? null, memberId);
  const member = db.prepare("SELECT * FROM member WHERE id = ?").get(memberId);
  res.status(200).json(member);
});

app.post("/api/members/:id/avatar", upload.single("file"), (req, res) => {
  const memberId = Number(req.params.id);
  if (!memberId || !req.file) {
    res.status(400).json({ error: "member id and file required" });
    return;
  }
  const filePath = `/uploads/${req.file.filename}`;
  db.prepare("UPDATE member SET avatar_path = ? WHERE id = ?").run(
    filePath,
    memberId
  );
  const member = db.prepare("SELECT * FROM member WHERE id = ?").get(memberId);
  res.status(200).json(member);
});

app.post("/api/members/:id/delete", (req, res) => {
  const memberId = Number(req.params.id);
  const { password } = req.body;
  const expectedPass = process.env.HOUSEHOLD_PASSWORD;
  if (!memberId) {
    res.status(400).json({ error: "invalid member id" });
    return;
  }
  if (!password || password !== expectedPass) {
    res.status(401).json({ error: "invalid password" });
    return;
  }
  db.prepare("DELETE FROM member WHERE id = ?").run(memberId);
  res.status(200).json({ ok: true });
});

app.get("/api/events", (req, res) => {
  const events = db
    .prepare("SELECT * FROM event WHERE household_id = 1 ORDER BY start_at ASC")
    .all();
  res.json(events);
});

const addInterval = (date, frequency, interval) => {
  const next = new Date(date);
  if (frequency === "daily") {
    next.setDate(next.getDate() + interval);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7 * interval);
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + interval);
  } else if (frequency === "yearly") {
    next.setFullYear(next.getFullYear() + interval);
  }
  return next;
};

const normalizeRepeat = (repeatRule, customFrequency, customInterval) => {
  if (!repeatRule || repeatRule === "never") {
    return null;
  }
  if (repeatRule === "custom") {
    return {
      frequency: customFrequency || "daily",
      interval: Math.max(1, Number(customInterval) || 1)
    };
  }
  const presets = {
    every_day: { frequency: "daily", interval: 1 },
    every_week: { frequency: "weekly", interval: 1 },
    every_2_weeks: { frequency: "weekly", interval: 2 },
    every_month: { frequency: "monthly", interval: 1 },
    every_year: { frequency: "yearly", interval: 1 }
  };
  return presets[repeatRule] || null;
};

const deriveRepeatUntil = (repeatUntil, endAt, startAt) => {
  if (repeatUntil) return repeatUntil;
  const base = endAt || startAt;
  if (!base) return null;
  return new Date(base).toISOString().slice(0, 10);
};

app.post("/api/events", (req, res) => {
  const {
    memberId,
    title,
    startAt,
    endAt,
    note,
    repeatRule,
    repeatUntil,
    customFrequency,
    customInterval
  } = req.body;
  if (!title || !startAt) {
    res.status(400).json({ error: "title and startAt required" });
    return;
  }
  const recurrence = normalizeRepeat(
    repeatRule,
    customFrequency,
    customInterval
  );
  const normalizedRepeatUntil = recurrence
    ? deriveRepeatUntil(repeatUntil, endAt, startAt)
    : null;
  const insertEvent = db.prepare(
    "INSERT INTO event (household_id, member_id, title, start_at, end_at, note, recurrence_id, recurrence_rule, recurrence_until, created_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const baseRecurrenceId = recurrence ? makeRecurrenceId() : null;
  const recurrenceRulePayload = recurrence
    ? JSON.stringify({
        ...recurrence,
        preset: repeatRule,
        customFrequency: customFrequency || null,
        customInterval: customInterval || null
      })
    : null;
  const baseResult = insertEvent.run(
    memberId ?? null,
    title,
    startAt,
    endAt ?? null,
    note ?? null,
    baseRecurrenceId,
    recurrenceRulePayload,
    normalizedRepeatUntil,
    now()
  );
  if (recurrence && normalizedRepeatUntil) {
    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : null;
    const durationMs = end ? end.getTime() - start.getTime() : 0;
    const until = new Date(`${normalizedRepeatUntil}T23:59:59`);
    let cursor = new Date(start);
    let index = 0;
    while (true) {
      cursor = addInterval(cursor, recurrence.frequency, recurrence.interval);
      if (cursor.getTime() > until.getTime()) {
        break;
      }
      const occurrenceStart = new Date(cursor);
      const occurrenceEnd = end
        ? new Date(occurrenceStart.getTime() + durationMs)
        : null;
      insertEvent.run(
        memberId ?? null,
        title,
        occurrenceStart.toISOString(),
        occurrenceEnd ? occurrenceEnd.toISOString() : null,
        note ?? null,
        baseRecurrenceId,
        recurrenceRulePayload,
        normalizedRepeatUntil,
        now()
      );
      index += 1;
      if (index > 1000) break;
    }
  }
  const event = db
    .prepare("SELECT * FROM event WHERE id = ?")
    .get(baseResult.lastInsertRowid);
  res.status(201).json(event);
});

app.patch("/api/events/:id", (req, res) => {
  const eventId = Number(req.params.id);
  const {
    memberId,
    title,
    startAt,
    endAt,
    note,
    repeatRule,
    repeatUntil,
    customFrequency,
    customInterval
  } = req.body;
  if (!eventId) {
    res.status(400).json({ error: "invalid event id" });
    return;
  }
  const hasRepeatUpdate = repeatRule !== undefined;
  if (
    !title &&
    !startAt &&
    !endAt &&
    !note &&
    memberId === undefined &&
    !hasRepeatUpdate
  ) {
    res.status(400).json({ error: "no fields to update" });
    return;
  }
  const existingEvent = db
    .prepare("SELECT * FROM event WHERE id = ?")
    .get(eventId);
  if (!existingEvent) {
    res.status(404).json({ error: "event not found" });
    return;
  }
  let recurrenceRulePayload = null;
  let recurrenceUntilValue = null;
  let recurrenceIdValue = null;
  if (hasRepeatUpdate) {
    const recurrence = normalizeRepeat(
      repeatRule,
      customFrequency,
      customInterval
    );
    if (recurrence) {
      recurrenceRulePayload = JSON.stringify({
        ...recurrence,
        preset: repeatRule,
        customFrequency: customFrequency || null,
        customInterval: customInterval || null
      });
      recurrenceUntilValue = deriveRepeatUntil(repeatUntil, endAt, startAt);
      recurrenceIdValue = makeRecurrenceId();
    }
  }
  db.prepare(
    "UPDATE event SET title = COALESCE(?, title), start_at = COALESCE(?, start_at), end_at = COALESCE(?, end_at), note = COALESCE(?, note), member_id = COALESCE(?, member_id), recurrence_rule = COALESCE(?, recurrence_rule), recurrence_until = COALESCE(?, recurrence_until), recurrence_id = COALESCE(?, recurrence_id) WHERE id = ?"
  ).run(
    title ?? null,
    startAt ?? null,
    endAt ?? null,
    note ?? null,
    memberId ?? null,
    hasRepeatUpdate ? recurrenceRulePayload : null,
    hasRepeatUpdate ? recurrenceUntilValue : null,
    hasRepeatUpdate ? recurrenceIdValue : null,
    eventId
  );
  if (hasRepeatUpdate && existingEvent.recurrence_id) {
    db.prepare("DELETE FROM event WHERE recurrence_id = ? AND id != ?").run(
      existingEvent.recurrence_id,
      eventId
    );
  }
  const event = db.prepare("SELECT * FROM event WHERE id = ?").get(eventId);
  if (hasRepeatUpdate) {
    const recurrence = normalizeRepeat(
      repeatRule,
      customFrequency,
      customInterval
    );
    if (recurrence && event.recurrence_id && event.recurrence_until) {
      const start = new Date(event.start_at);
      const end = event.end_at ? new Date(event.end_at) : null;
      const durationMs = end ? end.getTime() - start.getTime() : 0;
      const until = new Date(`${event.recurrence_until}T23:59:59`);
      let cursor = new Date(start);
      let index = 0;
      const insertEvent = db.prepare(
        "INSERT INTO event (household_id, member_id, title, start_at, end_at, note, recurrence_id, recurrence_rule, recurrence_until, created_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      while (true) {
        cursor = addInterval(cursor, recurrence.frequency, recurrence.interval);
        if (cursor.getTime() > until.getTime()) {
          break;
        }
        const occurrenceStart = new Date(cursor);
        const occurrenceEnd = end
          ? new Date(occurrenceStart.getTime() + durationMs)
          : null;
        insertEvent.run(
          event.member_id ?? null,
          event.title,
          occurrenceStart.toISOString(),
          occurrenceEnd ? occurrenceEnd.toISOString() : null,
          event.note ?? null,
          event.recurrence_id,
          event.recurrence_rule,
          event.recurrence_until,
          now()
        );
        index += 1;
        if (index > 1000) break;
      }
    }
  }
  res.status(200).json(event);
});

app.delete("/api/events/:id", (req, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    res.status(400).json({ error: "invalid event id" });
    return;
  }
  db.prepare("DELETE FROM event WHERE id = ?").run(eventId);
  res.status(200).json({ ok: true });
});

app.delete("/api/events/:id/series", (req, res) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    res.status(400).json({ error: "invalid event id" });
    return;
  }
  const event = db
    .prepare("SELECT recurrence_id FROM event WHERE id = ?")
    .get(eventId);
  if (!event) {
    res.status(404).json({ error: "event not found" });
    return;
  }
  if (event.recurrence_id) {
    db.prepare("DELETE FROM event WHERE recurrence_id = ?").run(
      event.recurrence_id
    );
  } else {
    db.prepare("DELETE FROM event WHERE id = ?").run(eventId);
  }
  res.status(200).json({ ok: true });
});

app.get("/api/habits", (req, res) => {
  const habits = db
    .prepare("SELECT * FROM habit WHERE household_id = 1 ORDER BY id DESC")
    .all();
  res.json(habits);
});

app.post("/api/habits", (req, res) => {
  const { memberId, name, frequency } = req.body;
  if (!name || !frequency) {
    res.status(400).json({ error: "name and frequency required" });
    return;
  }
  const result = db
    .prepare(
      "INSERT INTO habit (household_id, member_id, name, frequency, created_at) VALUES (1, ?, ?, ?, ?)"
    )
    .run(memberId ?? null, name, frequency, now());
  const habit = db
    .prepare("SELECT * FROM habit WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(habit);
});

app.get("/api/habit-logs", (req, res) => {
  const logs = db
    .prepare("SELECT * FROM habit_log ORDER BY log_date DESC")
    .all();
  res.json(logs);
});

app.post("/api/habit-logs", (req, res) => {
  const { habitId, memberId, logDate, status, note } = req.body;
  if (!habitId || !logDate || !status) {
    res.status(400).json({ error: "habitId, logDate, status required" });
    return;
  }
  const result = db
    .prepare(
      "INSERT INTO habit_log (habit_id, member_id, log_date, status, note, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(habitId, memberId ?? null, logDate, status, note ?? null, now());
  const log = db
    .prepare("SELECT * FROM habit_log WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(log);
});

app.get("/api/media-logs", (req, res) => {
  const logs = db
    .prepare("SELECT * FROM media_log ORDER BY log_date DESC")
    .all();
  res.json(logs);
});

app.post("/api/media-logs", upload.single("file"), (req, res) => {
  const { memberId, logDate, note, durationSec, mediaType } = req.body;
  if (!req.file || !memberId || !logDate || !mediaType) {
    res.status(400).json({ error: "file, memberId, logDate, mediaType required" });
    return;
  }
  if (!{"photo": true, "video": true}[mediaType]) {
    res.status(400).json({ error: "mediaType must be photo or video" });
    return;
  }
  const filePath = `/uploads/${req.file.filename}`;
  const result = db
    .prepare(
      "INSERT INTO media_log (household_id, member_id, log_date, media_type, file_path, note, duration_sec, created_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(memberId, logDate, mediaType, filePath, note ?? null, durationSec ?? null, now());
  const log = db
    .prepare("SELECT * FROM media_log WHERE id = ?")
    .get(result.lastInsertRowid);
  res.status(201).json(log);
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
