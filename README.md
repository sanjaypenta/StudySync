<div align="center">
  <h1>🚀 StudySync</h1>
  <p><strong>A Next-Generation, Gamified, AI-Powered Full-Stack Student Productivity Platform</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Vite-blue" alt="Frontend" />
    <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-success" alt="Backend" />
    <img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-green" alt="Database" />
    <img src="https://img.shields.io/badge/AI-Google%20Gemini-orange" alt="AI Engine" />
  </p>
</div>

<hr/>

## ✨ What is StudySync?
StudySync is not just another calendar app. It is a **comprehensive ecosystem** designed to revolutionize the way students plan, study, and collaborate. By combining AI-driven scheduling, deep learning analytics, and social accountability, StudySync transforms the isolated act of studying into an engaging, gamified, and highly efficient workflow.

Whether you're breaking down a massive PDF syllabus using **Google Gemini AI**, battling "Boss" tasks, or joining a real-time **Group Study Room** with peers, StudySync adapts to *your* personal Study DNA.

---

## 🌟 Hero Features

### 🧠 1. AI-Powered Smart Study Planner (Powered by Gemini)
Don't know where to start? Let AI build your schedule.
- **Instant Topic Extraction**: Upload a `.pdf` syllabus or paste your course notes. StudySync securely parses the text and uses Google Gemini to instantly extract key concepts and outline chapters.
- **Dynamic Task Distribution**: The AI factors in your **Target Deadlines**, **Burnout Risk**, and **Daily Hourly Limits** to auto-generate a realistic, day-by-day study calendar.
- **Custom Goal Types**: Choose between Assignments, Quizzes/Exams, or self-directed learning paths for highly tuned AI optimizations.

### 🎮 2. Gamification & RPG Progression 
Turn procrastination into motivation.
- **Digital Companions**: Maintain your daily study streak to hatch and evolve unique elemental companions (Leaf 🌿, Fire 🔥, Water 💧). If you break your streak, your companion's evolution might freeze!
- **XP Ecosystem & Tiers**: Earn points for every task checked off. Climb the ranks from *Novice* to *Scholar*.
- **Task Bosses**: Mark major exams or essays as "Bosses." They have literal Hit Points (HP). Chip away at them step-by-step to claim massive XP bounties!
- **Global HUD**: Constantly monitor your "Energy Levels", Companion Status, and XP from the sleek top navigation bar.

### 📊 3. Deep Learning Analytics: "Study DNA"
Stop guessing how you study best. Let the data speak.
- **Peak Productivity**: AI analyzes your task completion history to identify exactly which hours and days you are the most focused.
- **Burnout Predictor**: By calculating task density against missed tasks and sleep quality, the engine evaluates your "Burnout Risk" and intercepts with personalized re-balancing suggestions before you crash.
- **Subject Mastery Radars**: Visualize your strongest and weakest subjects using dynamic Radar charts.

### 🗂️ 4. Visual Kanban Tracking 
Micro-manage your knowledge acquisition.
- **Interactive Subject Boards**: Map out topics in a fluid, snappy interface.
- **Three-Tier Progression**: Seamlessly drag or shift topics between **To Learn** 📘, **Learning** 📙, and **Learnt** 📗 stages.

### 🤝 5. Social Accountability & Live Collaboration
Because studying shouldn't happen in a vacuum.
- **Buddy Arena**: Find peers using Sync Codes. Send friend requests, compare streaks, and playfully compete on leaderboards.
- **Real-Time Study Rooms**: Powered by **Socket.io**. Create a live room, share the code with a friend, and stay mutually accountable with synchronized timers and live chat.

---

## 🛠️ Architecture & Tech Stack

StudySync is engineered as a robust Monorepo utilizing NPM Workspaces.

**Frontend Configuration:**
- **Core**: React 18 & Vite
- **Styling**: Tailwind CSS & Framer Motion (for buttery-smooth micro-interactions)
- **Visualizations**: Recharts for dynamic Study DNA graphs
- **Routing**: React Router DOM

**Backend Configuration:**
- **Core**: Node.js & Express (ES Modules environment)
- **Real-Time Engine**: Socket.io 
- **Database**: MongoDB Atlas with Mongoose ODM
- **AI/Parsing**: Google Generative AI SDK (`@google/generative-ai`), `pdf-parse`, and `multer`

---

## 🚀 Local Development Guide

### 1. Environment Setup
1. Setup a **MongoDB Atlas Cluster** and retrieve your Connection String.
2. Inside the `backend/` directory, duplicate `backend/.env.example` into `backend/.env`.
```env
MONGODB_URI=your_mongodb_connection_string
PORT=4000
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
JWT_SECRET=your_secret_key_for_auth
```
> *Pro-Tip: While the planner has an offline fallback algorithm, providing a `GEMINI_API_KEY` is highly recommended to unlock PDF topic extraction and advanced curriculum generation!*

### 2. Booting the Matrix
Because this is an NPM Workspace, you can run the entire stack from the root directory with a single magical command.

```bash
# Install all frontend and backend dependencies simultaneously
npm install

# Boot development servers concurrently
npm run dev
```
- 🌐 **Frontend Client**: `http://localhost:5173`
- 🖥️ **Backend API**: `http://localhost:4000`
- 🩺 **System Health Check**: `http://localhost:4000/health`

---

## 🌩️ One-Click Vercel Deployment

We have optimized StudySync to be deployed as a **Single Project on Vercel**! Zero experimental services or messy sub-domain setups required. 

1. Import the root repository into Vercel.
2. Vercel automatically detects our custom `vercel.json` routing matrix!
3. Go to the **Environment Variables** tab and paste your `MONGODB_URI`, `GEMINI_API_KEY`, and `JWT_SECRET`.
4. Hit Deploy! 🚀

**How the routing works natively on Vercel:**
- Static assets and the React SPA are processed by Vite and outputted dynamically.
- Vercel Serverless Functions intercept all `/api/*` traffic via `api/index.ts` connecting incredibly fast to MongoDB and serving your Express backend routes with near-zero cold start latency!

> **📍 Note on Live WebSockets**: Vercel Serverless environments do not inherently support persistent long-running WebSockets. Our Socket.io implementation is configured to elegantly fallback to HTTP Long-Polling in production environments automatically!

---

## 🕹️ Starting a LAN Session
Want to code or study with a friend in the same room?
To test Group Study Rooms with devices on your local Wi-Fi:

1. Start the app from the root: `npm run dev`
2. Start Vite with LAN host access from another terminal window: `npm run dev -w frontend -- --host`
3. On your friend’s device, connect to `http://<YOUR-LAN-IP>:5173`.
4. Spin up a study room and share the Sync Code!
