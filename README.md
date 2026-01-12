# familyCalendar

Local-only family calendar, habit tracker, and daily media log.

## Features
- Monthly + day view calendar (repeat rules, edit/delete)
- Habit tracker with daily check-ins
- Daily media log (photo or <=60s video)
- Family members with avatar capture
- Bilingual UI (中文/English)
- Local-only storage (SQLite + local uploads)
- 30s silent polling for cross-device refresh

## Structure
- `backend/` Express + SQLite API
- `frontend/` React + Vite app

## Run locally
Backend:
```
cd backend
npm install
npm run dev
```

Backend with auto-reload:
```
cd backend
npm run dev:watch
```

Frontend:
```
cd frontend
npm install
npm run dev
```

Frontend expects the API at `http://localhost:3001`. Override with `VITE_API_URL`.

## Auth setup
Copy the example env file and set the household credentials:
```
cp backend/.env.example backend/.env
```
Set `HOUSEHOLD_USERNAME` and `HOUSEHOLD_PASSWORD` in `backend/.env`.

## Notes
- Camera capture requires HTTPS on mobile browsers; localhost works for local dev.
- Uploads are stored in `backend/uploads/`, DB in `backend/data/app.db`.
