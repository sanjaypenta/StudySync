# StudySync

Student productivity app MVP: calendar planning with Gemini-generated daily study sessions and MongoDB-backed todos.

## Setup

1. **MongoDB Atlas** — create a cluster and get a connection string.

2. **Backend** — copy `backend/.env.example` to `backend/.env`:

   ```
   MONGODB_URI=mongodb+srv://...
   PORT=4000
   GEMINI_API_KEY=your_key
   ```

   Without `GEMINI_API_KEY`, the API falls back to a deterministic local planner. For **topic-aware** daily labels and use of pasted PDF text, **Gemini is recommended**.

### Goal type, topics, and PDF

When creating a study goal you can set:

- **Goal type** — Assignment (milestones), Quiz/exam (learning + practice + revision), or Other.
- **Topics / syllabus** — One topic per line or comma-separated; used in prompts and in the offline fallback.
- **Notes from PDF (paste)** — Optional pasted text.
- **PDF upload** — Optional `.pdf` (max **5 MB**). Text is extracted on the server with `pdf-parse`; the file is **not** stored. Scanned PDFs may yield little or no text.

Long combined text is **truncated** (about 28k characters) before sending to Gemini.

When **`GEMINI_API_KEY` is set** and pasted or PDF text is long enough (roughly **300+** characters), the backend may run **two** Gemini calls per “Generate plan”: (1) extract a **topic outline** (chapter- or concept-level names, not only the course title) from the material, merged with your topic list, then (2) build the **day-by-day schedule**. Generic lines that only repeat your **subject** or **task title** are filtered from that outline when other topics exist. Scanned PDFs with little extractable text may yield few inferred topics.

For **Quiz / exam** goals, daily tasks should name **specific concepts** from the PDF or outline. When time is tight, the model may put **two activities in one day** in a single `task` string (e.g. revise one topic and start the next). The offline fallback varies labels when only one topic line is available.

If the AI outline is empty, the server **infers candidate topic lines** from PDF/paste text (numbered headings, chapter lines, short non-body lines) so fallback plans still show meaningful names instead of only the assignment title.

### Check that the API is up

Open **http://localhost:4000/health** while the backend is running. You should see JSON like:

```json
{ "ok": true, "mongo": "connected", "geminiConfigured": true }
```

- **`mongo: "disconnected"`** — todos will fail until `MONGODB_URI` is correct; **plan generation still works** (it does not use MongoDB).
- **`geminiConfigured: false`** — no key in `.env`; plans use the local fallback, not Gemini.

### If you see `ECONNREFUSED` or “Cannot reach the API”

Vite proxies `/api/*` to **http://localhost:4000**. If nothing is listening there, the browser and terminal show **connection refused**.

- Run **`npm run dev` from the StudySync repo root** (not only inside `frontend/`). That starts **both** the backend (port 4000) and the frontend (port 5173).
- Or run two terminals: `npm run dev:backend` and `npm run dev:frontend`.
- Confirm **http://localhost:4000/health** or **http://localhost:4000/api/health** opens in the browser and returns JSON.

### If “Generate plan” fails

1. Confirm **both** frontend and backend are running (`npm run dev` from the repo root).
2. Confirm **http://localhost:4000/health** loads (not “connection refused”).
3. Fix **`backend/.env`** (`MONGODB_URI`, optional `GEMINI_API_KEY`). The server no longer blocks startup when MongoDB is wrong, so the API should still respond.

4. **Install & run**

   ```bash
   npm install
   npm run dev
   ```

   - Frontend: http://localhost:5173 (proxies `/api` to the backend)
   - API: http://localhost:4000

## MVP flow

1. Open **Dashboard** → **Calendar**
2. Click a day (or **New goal**) to open the study goal modal
3. **Generate plan** → preview → **Confirm plan** saves todos
4. Use **Day** on a cell to view/edit tasks for that date

Identity is mocked: a `userId` is stored in `localStorage` and sent as `x-user-id`.

## Group study rooms (invite code)

Study rooms are created via `POST /api/study-rooms` and joined via Socket.IO.

- A room code only works if both people are connected to the **same backend instance**.
- If your friend opens the app on their own computer at `http://localhost:5173`, that `localhost` refers to **their** machine, not yours.

**Join from another device on the same Wi‑Fi/LAN (dev):**

1. Start the app from the repo root: `npm run dev`
2. Start Vite with LAN access (choose one):
   - Run frontend with host: `npm run dev -w frontend -- --host`
   - Or set `server.host` in `frontend/vite.config.ts`
3. On your friend’s device, open: `http://<YOUR-LAN-IP>:5173` (or whatever port Vite prints)
4. Join the room from that page.

**Debugging “Room not found”:**

- Confirm API health: `http://<YOUR-LAN-IP>:4000/health`
- Confirm room exists on the backend: `GET /api/study-rooms/:roomId`

Rooms are persisted to MongoDB with a ~24h TTL so codes can survive backend restarts during development.
