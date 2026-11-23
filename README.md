# Tikly

Event management and ticketing platform for the CEMAC region.

| App | Stack | Path |
| --- | --- | --- |
| Backend | Node.js 20+, Express 5, TypeScript, MongoDB (Mongoose) | `backend/` |
| Frontend | Next.js, Tailwind CSS | `frontend/` |
| Mobile | Expo, Expo Router, NativeWind | `mobile/` |

## Setup

```bash
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp mobile/.env.example mobile/.env
```

## Run

```bash
pnpm dev:backend
pnpm dev:frontend
pnpm dev:mobile
```

Backend health check: `GET http://localhost:4000/api/v1/health`
