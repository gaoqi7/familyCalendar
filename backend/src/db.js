import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const dataDir = path.resolve("backend/data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS household (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    default_language TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS member (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    avatar_color TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (household_id) REFERENCES household(id)
  );

  CREATE TABLE IF NOT EXISTS event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    member_id INTEGER,
    title TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT,
    note TEXT,
    recurrence_id TEXT,
    recurrence_rule TEXT,
    recurrence_until TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (household_id) REFERENCES household(id),
    FOREIGN KEY (member_id) REFERENCES member(id)
  );

  CREATE TABLE IF NOT EXISTS habit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    member_id INTEGER,
    name TEXT NOT NULL,
    frequency TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (household_id) REFERENCES household(id),
    FOREIGN KEY (member_id) REFERENCES member(id)
  );

  CREATE TABLE IF NOT EXISTS habit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    member_id INTEGER,
    log_date TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (habit_id) REFERENCES habit(id),
    FOREIGN KEY (member_id) REFERENCES member(id)
  );

  CREATE TABLE IF NOT EXISTS media_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    log_date TEXT NOT NULL,
    media_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    note TEXT,
    duration_sec INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (household_id) REFERENCES household(id),
    FOREIGN KEY (member_id) REFERENCES member(id)
  );
`);

const eventColumns = db.prepare("PRAGMA table_info(event)").all();
const ensureEventColumn = (name, type) => {
  if (!eventColumns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE event ADD COLUMN ${name} ${type}`);
  }
};
ensureEventColumn("recurrence_id", "TEXT");
ensureEventColumn("recurrence_rule", "TEXT");
ensureEventColumn("recurrence_until", "TEXT");

const memberColumns = db.prepare("PRAGMA table_info(member)").all();
if (!memberColumns.some((column) => column.name === "avatar_path")) {
  db.exec("ALTER TABLE member ADD COLUMN avatar_path TEXT");
}

const householdExists = db.prepare("SELECT id FROM household WHERE id = 1").get();
if (!householdExists) {
  db.prepare(
    "INSERT INTO household (id, name, default_language) VALUES (1, ?, ?)"
  ).run("My Family", "en");
}

export default db;
