# familyCalendar

Local-only family calendar, habit tracker, and daily media log.

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
