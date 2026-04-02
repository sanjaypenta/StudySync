---
name: StudySync Full User Vision
overview: "End-to-end product flow: register/login, rich onboarding with optional AI learner summary, three-pillar hub (Calendar, Self study, Group competition), gamification (streaks + rewards), Self study page with per-task timers and AI burnout coaching, dashboard-visible progress, unified progress page, group UX polish—and a cohesive full-game UI (HUD, tiers, reward popups, celebrations) across the shell."
todos:
  - id: auth-jwt-users
    content: Add User model, bcrypt, JWT auth routes, auth middleware; frontend login/register; replace x-user-id for protected APIs
    status: completed
  - id: onboarding-ai-summary
    content: Extend profile fields (study hours, burnout tendency, interests); POST onboarding Gemini learner_summary; PATCH/GET profile
    status: completed
  - id: dashboard-hub-widgets
    content: "Dashboard hub: three quest-style pillar cards (Calendar, Self study, Group) + progress strip; matches full-game shell (HUD/rewards elsewhere)"
    status: completed
  - id: game-ui-reward-shell
    content: "Full-game UI shell: HUD-style header (XP/streak/tier/energy), card frames and game typography, reward popups for points/streaks/tier-ups/badges, milestone modals; micro-celebrations on key actions; consistent theme on login, onboarding, dashboard, self-study, calendar, progress, group"
    status: completed
  - id: gamification-streaks-rewards
    content: "Streak tracking, points/tiers/badges MVP; dashboard + progress API; return reward deltas for popups (pointsEarned, tierBefore/After, streakAfter)"
    status: completed
  - id: self-study-task-timers-ai
    content: "Self study page: list all relevant tasks, timer + start/stop per task; Gemini personalized burnout tips tied to session/user profile"
    status: completed
  - id: progress-summary-page
    content: GET /api/progress/summary + Progress page (todos, sessions, streak, rewards, burnout snippet)
    status: completed
  - id: group-ux-gemini
    content: Group competition UX from hub; verify Gemini model id for quiz/feedback
    status: completed
isProject: false
---

# StudySync — Full user vision (updated with gamification + self-study UX)

## Product goals (from you)

1. **Register → login → onboarding** (screen time, how many hours you can study, interests, burnout, etc.) then optional **AI “who you are”** summary.
2. **The whole app** should **feel like a game**, not just one screen: **HUD-style** chrome (levels/tiers, streak flame, energy/XP bar), **reward popups** (points gained, streak extended, tier up, badge unlocked) and **short celebratory moments** on completes—like loot or achievement toasts in a full game. **Dashboard** still anchors **streaks + rewards** with **progress visible at a glance** (not buried only in sub-pages).
3. **Self study** (pillar): opening it shows **all tasks** with a **timer beside each task**; you **start** focus per task; **AI gives personalized burnout** coaching (not generic only).
4. **Calendar** → plan/todos; **Group competition** → rooms, MCQs, leaderboard, per-person improvement (already largely built).
5. **Full progress** over time.

This document extends the earlier technical roadmap (auth, hub, sessions, burnout) with **gamification**, **self-study task-level UX**, and **dashboard visibility** for state/progress.

---

## What exists in the repo (anchor points)

- Anonymous `x-user-id` today — real auth still required for your vision.
- Onboarding + [UserProfileDoc](backend/src/models/UserProfileDoc.ts), todos with tags, sessions ([StudySession](backend/src/models/StudySession.ts)), burnout ([BurnoutDaily](backend/src/models/BurnoutDaily.ts)), wellbeing routes.
- [FocusSessionBar](frontend/src/components/FocusSessionBar.tsx) is a **single global** session — **not** per-task; self-study will replace/extend this pattern.
- Group study: [studyRoom](backend/src/studyRoom/) + [StudyRoomPage](frontend/src/pages/study-room/StudyRoomPage.tsx).

---

## Phase 1 — Register, login, protect routes

(Same as prior plan: User model, bcrypt, JWT, `/api/auth/*`, middleware replacing mock user for protected routes; frontend login/register.)

---

## Phase 2 — Richer onboarding + learner summary

Extend profile + optional Gemini **learner_summary** after onboarding (traits + how we’ll support you).

---

## Phase 3 — Dashboard hub + visible “game” state

**Layout**

- Three pillars: **Calendar** | **Self study** | **Group competition** (large cards, clear copy)—styled as **quest hubs** or **mode select** (strong frames, icons, short flavor text), not flat admin links.
- **Always-visible strip** (top or below hero):  
  - **Streak** (current + best)  
  - **Reward tier / points** (MVP: simple points from completed tasks + sessions; badges optional)  
  - **Burnout state** (green/yellow/red) + short label  
  - **Energy bar** (mapped from burnout score or inverse stress — same metric, game-friendly label)

Data can come from new `GET /api/gamification/state` or fold into `GET /api/progress/summary` so the dashboard only calls one endpoint.

---

## Full-game UI and reward popups (cross-cutting)

Treat the **entire frontend** as one game shell: shared **visual language**, **feedback loops**, and **reward moments** wherever the user earns progress—not only on the dashboard.

**Shell / chrome**

- **Persistent HUD** (header or top bar): avatar or initials, **current tier** badge, **streak** with icon treatment, **points / XP toward next tier**, **energy** (or stress inverse) bar—readable at a glance on every authenticated screen.
- **Typography and color**: distinct “game” palette (e.g. deep bg + neon/gold accents + clear contrast); avoid generic gray SaaS-only look; optional subtle **gradient or panel borders** on main content.
- **Cards and lists**: task rows and hub cards use **framed panels** (borders, soft glow, or tier-colored accents) so lists feel like **objectives** or **quests**, not plain tables.

**Reward popups (“like a full game”)**

- **Floating toasts or centered modals** when: session completed, todo completed, streak increments, **tier promotion**, first task of the day, badge unlocked (if badges exist).
- Copy pattern: **+N points**, **Streak x days!**, **Promoted to [Tier]!**, **Achievement: …** with **short celebratory line** (one sentence).
- **Tier-up** and **milestone streaks** (e.g. 3 / 7 / 30 days) use a **stronger modal** (larger art, confetti optional, CSS-only is fine) so they feel like **level-ups**, not tiny text.
- **Queue or debounce** popups if multiple events fire at once so the UI doesn’t spam (show highest-priority first or combine into one “You earned …” summary).

**Micro-interactions**

- Button press states, **brief scale/glow** on “Complete” / “Done”, **progress bar tick** when points increase—small **juice** without needing a game engine.

**Scope discipline**

- **No** real-money or gambling visuals; keep tone **supportive** (study RPG, not casino). Optional **sound** can be deferred; **motion** should respect `prefers-reduced-motion`.

**Implementation note**

- Centralize: e.g. a small **RewardQueue** / **GameToast** provider + **HUD** component used in the main layout; **trigger** from self-study, calendar completes, session end, and API responses that return `pointsDelta`, `streak`, `tierChanged`.

---

## Phase 4 — Gamification: streaks and rewards (MVP)

**Streak**

- Rule (simple, explainable): increment streak if user completes **at least one** meaningful action on a calendar day: e.g. completes a todo, finishes a study session with outcome `completed`, or studies ≥ N minutes (config constant).
- Store `current_streak`, `longest_streak`, `last_activity_date` on user or a small `UserStats` document.
- **UI tie-in**: any streak change should **drive a reward popup** (see **Full-game UI**) so the mechanic is visible and satisfying.

**Rewards**

- MVP: **points** for completed tasks + completed sessions; **tiers** (e.g. Bronze / Silver / Gold) from rolling 7-day or all-time points.
- Optional: **badges** (“7-day streak”, “10 sessions”) as array on profile or separate collection.
- Surface on **dashboard**, **HUD**, and **Progress** page; **tier changes** must trigger **tier-up popup** in the shared reward system.
- **API contract**: where possible return structured deltas (`pointsEarned`, `streakAfter`, `tierBefore`, `tierAfter`) so the client can show accurate popups without guessing.

---

## Phase 5 — Self study: all tasks + timer per task + AI burnout

**Route:** `/self-study` (from hub).

**UI**

- Load **pending** todos for a window (e.g. today → +7 days) via existing [fetchTodosRange](frontend/src/lib/api.ts) / prioritize.
- **List every task** (or filter to “due soon” if list is huge — default: show all in range with cap + “show more”).
- **Each row:** task title, subject, **timer** (00:00 running when active), **Start / Pause / Done** (or Start → Stop → mark complete)—rows should **look like quest objectives** (framed, game list styling) and **fire reward popups** on complete (points/streak), consistent with **Full-game UI**.
- Only **one** active timer at a time OR allow parallel — **recommend one active** for MVP to match single-focus UX.

**Backend**

- Prefer **linking sessions to todo id**: extend [StudySession](backend/src/models/StudySession.ts) usage — `todo_ids: [id]` with single id when starting from a task.
- Reuse `POST /api/sessions/start` with `{ todoIds: [id] }` and `PATCH .../end` with outcome.

**AI personalized burnout**

- On **session end** (or every N minutes while running — optional, cost-sensitive): call Gemini with **user profile** + **today’s burnout state** + **this task** + **session duration** → short **personalized** tip (1–2 sentences). Store last tip client-side or in profile `last_burnout_tip` for dashboard teaser.
- Keep non-AI fallback if no API key.

---

## Phase 6 — Progress page + API

- `GET /api/progress/summary`: todos completed, focus minutes, streak, points/tier, last 7 burnout points, recent tips.
- [ProgressPage](frontend/src/pages/ProgressPage.tsx): charts/tables + gamification milestones—presented as **stats / achievements screen** (same game shell, trophy or progress vibes—not a plain spreadsheet).

---

## Phase 7 — Group competition polish

- Hub copy; ensure Gemini model id for quiz/feedback ([geminiModel.ts](backend/src/services/geminiModel.ts)).

---

## Implementation order (recommended)

1. Auth  
2. Gamification data model + streak/points + dashboard strip + **API payloads for reward deltas**  
3. **Game shell**: HUD + reward queue/toasts + tier-up modals (can stub data until APIs land)  
4. Self-study page (task list + per-task timers + session API + AI tip on end) — **wire reward triggers**  
5. Extended onboarding + learner summary — **game-styled steps** (same shell)  
6. Hub three pillars + polish  
7. Progress API + page  
8. Group UX + Gemini check  

---

## Suggested MVP enhancements (best bang for buck)

These are optional additions that make the MVP feel **polished and shippable** without ballooning scope. Pick what fits your timeline.

**Trust and clarity**

- **Empty states**: Dedicated copy + one primary action when there are no tasks (Calendar), no sessions yet (Self study), or no friends (Group)—so the app never feels “broken.”
- **503 / offline handling**: One consistent message when Mongo or the API is down (you already partially do this); avoid silent empty lists.
- **Loading skeletons** on dashboard and self-study lists so perceived performance improves.

**Product quality**

- **One active focus rule**: In self-study, if the user starts task B while A is running, either auto-pause A or show a clear modal—prevents confusing timers and bad analytics.
- **Session recovery**: If the user refreshes mid-session, **GET** active session by `user_id` (or “last open session”) so the timer state isn’t lost (MVP: last 24h only).
- **AI cost control**: Debounce or cap Gemini calls for burnout tips (e.g. tip on session end only, not every minute).
- **Password reset**: For a real auth MVP, either a minimal **forgot password** flow or a visible note “contact admin / reset in next version” so users aren’t stranded.

**Gamification that doesn’t backfire**

- **Streak forgiveness**: Optional “streak freeze” once per week (or ignore streak if only burnout check-in)—reduces churn from one bad day.
- **Celebrate milestones**: Small modal or toast at 3/7/30-day streaks—cheap dopamine, high retention (aligned with **Full-game UI**; use the shared reward modal stack).

**Discoverability**

- **First-run tips**: 2–3 step coach marks on the dashboard (pillars + where progress lives)—no full product tour required.
- **Progress link** in the nav on every screen so “my stats” is never more than one click away.

**Technical**

- **Central `GEMINI_TEXT_MODEL`** (already pattern in codebase): one env override `GEMINI_MODEL` for prod without redeploying logic.
- **Basic security**: HTTP-only cookie for JWT if you use cookies; CORS locked to your frontend origin in production.

**Defer past MVP (but good roadmap)**

- Push notifications; email verification; social OAuth; leaderboards across all users (global), not just per room.

---

## Out of scope (unless you add later)

- Real-money rewards; server-push notifications.
