# EDM — Election Data Management (React + Node.js)

A React + Node.js port of the **Election Data Managment Software** (originally Laravel + Next.js CRM).
This is a **local, non-deployed** rebuild. It does not touch the production droplet.

```
EDM/
  backend/    Node.js + Express + MongoDB (native driver) REST API
  frontend/   React (Vite) + React Router SPA admin panel
```

## Architecture (mirrors the original)

The original app uses **two MongoDB databases**:
- `voter_db` — the voter roll, one collection per assembly: `ass_1 … ass_234` (read-mostly)
- `election_app` — app data: users, `tbl_assembly_consitituency` (assembly→collection map + counts), payments, etc.

The backend keeps the same two-connection model (`MONGO_VOTER_URL`, `MONGO_APP_URL`).

## Quick start

**Backend**
```bash
cd backend
cp .env.example .env      # then edit values (defaults point to local MongoDB)
npm install
npm run dev               # http://localhost:5000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173  (proxies /api -> backend)
```

Default login (from backend `.env`): `admin` / `admin`.

## Coverage

**Implemented end-to-end (working):**
- Auth (JWT login/logout, protected routes)
- Dashboard: voter stat tiles (total/male/female/other from `tbl_assembly_consitituency`), Global EPIC search, DB-offline handling
- Voters: filter/search (EPIC exact/prefix, mobile prefix, name), pagination, voter detail
- Assemblies: list (sorted), detail with gender counts
- Booths: booths-by-assembly
- Users: list / create / update / delete (app DB)

**Scaffolded (routes + placeholder pages, ready to extend):**
- Reports, SMS / WhatsApp / Voice, Social, Survey, Payments (Razorpay), Registrations, Flow Images,
  Mobile-app CMS (news/events/gallery/…), and the role dashboards (mp / mla / booth / ward / king / dsa / tele).

See `backend/src/routes/` and `frontend/src/pages/` — each scaffolded module has a clear extension point.
